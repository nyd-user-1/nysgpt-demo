import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, FileText, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBillsSearch, formatBillDate } from '@/hooks/useBillsSearch';
import { Bill } from '@/types/bill';
import { supabase } from '@/integrations/supabase/client';

const Bills2 = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    bills,
    totalCount,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    statuses,
    committees,
    sessions,
    sponsors,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    committeeFilter,
    setCommitteeFilter,
    sessionFilter,
    setSessionFilter,
    sponsorFilter,
    setSponsorFilter,
  } = useBillsSearch();

  // Fetch chat counts for bills on page
  const billChatKeys = bills.map(b => `bill-${b.bill_id}`);
  const { data: chatCounts } = useQuery({
    queryKey: ['bill-chat-counts', billChatKeys],
    queryFn: async () => {
      const { data } = await supabase
        .from('prompt_chat_counts')
        .select('prompt_id, chat_count')
        .in('prompt_id', billChatKeys);
      const map: Record<string, number> = {};
      (data || []).forEach(row => { map[row.prompt_id] = row.chat_count; });
      return map;
    },
    staleTime: 30_000,
    enabled: bills.length > 0,
  });

  // Seed chat counts for demo — runs once per session when bills first load
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || bills.length === 0 || !chatCounts) return;
    // Only seed if most bills have no counts yet
    const existingCount = Object.keys(chatCounts).length;
    if (existingCount > bills.length * 0.5) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;

    // Build rows for bulk upsert — higher counts for recent bills, tapering down
    const unseeded = bills.filter(b => !chatCounts[`bill-${b.bill_id}`]);
    const rows = unseeded.map((bill, i) => {
      const base = Math.max(3, Math.round(48 - (i / unseeded.length) * 45));
      const jitter = Math.floor(Math.random() * 7) - 3;
      return {
        prompt_id: `bill-${bill.bill_id}`,
        chat_count: Math.max(1, base + jitter),
      };
    });

    // Single bulk upsert instead of 200 individual RPCs
    if (rows.length > 0) {
      supabase
        .from('prompt_chat_counts')
        .upsert(rows, { onConflict: 'prompt_id', ignoreDuplicates: true })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bill-chat-counts'] });
        });
    }
  }, [bills, chatCounts, queryClient]);

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Generate a prompt for a bill - varies based on available data
  const generatePrompt = (bill: Bill): string => {
    const billNum = bill.bill_number || 'this bill';
    const title = bill.title ? ` "${bill.title}"` : '';
    const status = bill.status_desc ? ` (Status: ${bill.status_desc})` : '';
    const sponsor = bill.sponsor_name ? ` Sponsored by ${bill.sponsor_name}.` : '';

    // Use description if available to vary the prompt
    if (bill.description) {
      const shortDesc = bill.description.length > 150
        ? bill.description.substring(0, 150) + '...'
        : bill.description;
      return `Tell me about bill ${billNum}${title}${status}.${sponsor} The bill's summary: "${shortDesc}". What are the key provisions and who would be affected?`;
    }

    return `Tell me about bill ${billNum}${title}${status}.${sponsor} What are the key provisions and who would be affected?`;
  };

  // Navigate to bill detail page
  const handleBillClick = (bill: Bill) => {
    navigate(`/bills/${bill.bill_number}`);
  };

  // Navigate to new chat with prompt and bill_id, and increment chat count
  const handleChatClick = (bill: Bill, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = generatePrompt(bill);

    // Increment chat count (fire and forget)
    supabase.rpc('increment_prompt_chat_count', {
      p_prompt_id: `bill-${bill.bill_id}`,
      p_seed_count: 0,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['bill-chat-counts'] });
    });

    navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}&billId=${bill.bill_id}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCommitteeFilter('');
    setSessionFilter('');
    setSponsorFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || committeeFilter || sessionFilter || sponsorFilter;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Left Sidebar - slides in from off-screen */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-50",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {/* Backdrop overlay when sidebar is open */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Main Container with padding */}
      <InsetPanel>
          {/* Header */}
          <div className="flex-shrink-0 bg-background">
            <div className="px-4 py-4">
              <div className="flex flex-col gap-4">
                {/* Title row with sidebar toggle and command button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                      className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
                      aria-label="Open menu"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                        <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                        <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear filters
                      </Button>
                    )}
                    <button
                      onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
                      className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
                    >
                      NYSgpt
                    </button>
                  </div>
                </div>

                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 h-12 text-base"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Status</SelectItem>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status} className="focus:bg-muted focus:text-foreground">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={committeeFilter || "all"} onValueChange={(v) => setCommitteeFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Committee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Committee</SelectItem>
                      {committees.map((committee) => (
                        <SelectItem key={committee} value={committee} className="focus:bg-muted focus:text-foreground">
                          {committee}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sessionFilter || "all"} onValueChange={(v) => setSessionFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Session</SelectItem>
                      {sessions.map((session) => (
                        <SelectItem key={session} value={String(session)} className="focus:bg-muted focus:text-foreground">
                          {session}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sponsorFilter || "all"} onValueChange={(v) => setSponsorFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Sponsor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Sponsor</SelectItem>
                      {sponsors.map((sponsor) => (
                        <SelectItem key={sponsor.id} value={String(sponsor.id)} className="focus:bg-muted focus:text-foreground">
                          {sponsor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Results - Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Error loading bills: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bills found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bills.map((bill) => (
                    <BillCard
                      key={bill.bill_id}
                      bill={bill}
                      chatCount={chatCounts?.[`bill-${bill.bill_id}`] || 0}
                      onClick={() => handleBillClick(bill)}
                      onChatClick={(e) => handleChatClick(bill, e)}
                    />
                  ))}
                </div>

                {/* Load More button */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${bills.length} of ${totalCount})`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
      </InsetPanel>
    </div>
  );
};

// Determine chamber from bill number
function getChamber(billNumber: string | null): 'senate' | 'assembly' | null {
  if (!billNumber) return null;
  const firstChar = billNumber.charAt(0).toUpperCase();
  if (firstChar === 'S') return 'senate';
  if (firstChar === 'A') return 'assembly';
  return null;
}

// Bill card component
interface BillCardProps {
  bill: Bill;
  chatCount: number;
  onClick: () => void;
  onChatClick: (e: React.MouseEvent) => void;
}

function BillCard({ bill, chatCount, onClick, onChatClick }: BillCardProps) {
  const chamber = getChamber(bill.bill_number);

  // Build varied preview text based on available data
  let previewText: string;
  if (bill.title) {
    previewText = bill.title.length > 120
      ? bill.title.substring(0, 120) + '...'
      : bill.title;
  } else if (bill.description) {
    const shortDesc = bill.description.length > 120
      ? bill.description.substring(0, 120) + '...'
      : bill.description;
    previewText = shortDesc;
  } else {
    previewText = bill.status_desc || 'Legislative bill';
  }

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {chamber === 'senate' && (
            <img src="/nys-senate-seal.avif" alt="Senate" className="h-5 w-5 object-contain" />
          )}
          {chamber === 'assembly' && (
            <img src="/nys-assembly-seal.avif" alt="Assembly" className="h-5 w-5 object-contain" />
          )}
          <h3 className="font-semibold text-base">
            {bill.bill_number || 'Unknown Bill'}
          </h3>
        </div>
        {chatCount > 0 && (
          <span className="text-blue-500 text-xs font-medium">{chatCount} chats</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {previewText}
      </p>

      {/* Bill details grid - always visible */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Sponsor</span>
            <p className="font-medium">{bill.sponsor_name || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium">{bill.status_desc || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Action Date</span>
            <p className="font-medium">{bill.last_action_date ? formatBillDate(bill.last_action_date) : '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Action</span>
            <p className="font-medium">{bill.last_action || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Session</span>
            <p className="font-medium">{bill.session_id || '—'}</p>
          </div>
        </div>

        {/* Action button - appears on hover */}
        <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onChatClick}
            className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Bills2;
