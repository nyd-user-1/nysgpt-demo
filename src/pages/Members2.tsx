import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, ArrowUp } from 'lucide-react';
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
import { useMembersSearch } from '@/hooks/useMembersSearch';
import { Member } from '@/types/member';
import { generateMemberSlug } from '@/utils/memberSlug';

const Members2 = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    members,
    totalCount,
    isLoading,
    error,
    chambers,
    parties,
    searchTerm,
    setSearchTerm,
    chamberFilter,
    setChamberFilter,
    partyFilter,
    setPartyFilter,
  } = useMembersSearch();

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

  // Generate a prompt for a member - varies based on available data
  const generatePrompt = (member: Member): string => {
    const name = member.name || `${member.first_name} ${member.last_name}`.trim();
    const chamber = member.chamber ? `${member.chamber} ` : '';
    const party = member.party ? ` (${member.party})` : '';
    const district = member.district ? ` representing District ${member.district}` : '';

    // Use bio if available to vary the prompt
    if (member.bio_short) {
      return `Tell me about ${chamber}member ${name}${party}${district}. Their background: "${member.bio_short}". What legislation have they sponsored and what are their key policy positions?`;
    }

    return `Tell me about ${chamber}member ${name}${party}${district}. What legislation have they sponsored and what are their key policy positions?`;
  };

  // Navigate to member detail page
  const handleMemberClick = (member: Member) => {
    const slug = generateMemberSlug({
      name: member.name,
      first_name: member.first_name,
      last_name: member.last_name,
    } as any);
    navigate(`/members/${slug}`);
  };

  // Navigate to new chat with prompt
  const handleChatClick = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = generatePrompt(member);
    navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setChamberFilter('');
    setPartyFilter('');
  };

  const hasActiveFilters = searchTerm || chamberFilter || partyFilter;

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
                    placeholder="Search members..."
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
                  <Select value={chamberFilter || "all"} onValueChange={(v) => setChamberFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="All Chambers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">All Chambers</SelectItem>
                      {chambers.map((chamber) => (
                        <SelectItem key={chamber} value={chamber} className="focus:bg-muted focus:text-foreground">
                          {chamber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={partyFilter || "all"} onValueChange={(v) => setPartyFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">All Parties</SelectItem>
                      {parties.map((party) => (
                        <SelectItem key={party} value={party} className="focus:bg-muted focus:text-foreground">
                          {party}
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
                <p className="text-destructive mb-4">
                  Error loading members: {(error as any)?.message || String(error)}
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No members found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <MemberCard
                    key={member.people_id}
                    member={member}
                    onClick={() => handleMemberClick(member)}
                    onChatClick={(e) => handleChatClick(member, e)}
                  />
                ))}
              </div>
            )}
          </div>
      </InsetPanel>
    </div>
  );
};

// Member card component
interface MemberCardProps {
  member: Member;
  onClick: () => void;
  onChatClick: (e: React.MouseEvent) => void;
}

function MemberCard({ member, onClick, onChatClick }: MemberCardProps) {
  const name = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
  const chamber = member.chamber;
  const party = member.party;

  // Build full name with chamber prefix
  const chamberPrefix = chamber === 'Senate' ? 'Senator ' : chamber === 'Assembly' ? 'Assembly Member ' : '';
  const fullName = `${chamberPrefix}${name}`;

  // Build varied preview text based on available data
  let previewText: string;
  if (member.bio_short) {
    // Truncate bio if too long
    const shortBio = member.bio_short.length > 120
      ? member.bio_short.substring(0, 120) + '...'
      : member.bio_short;
    previewText = shortBio;
  } else if (member.district) {
    previewText = `Representing District ${member.district}`;
  } else {
    previewText = `${chamber || 'NY State'} legislator`;
  }

  // Get party display
  const partyDisplay = party === 'D' ? 'Democrat' : party === 'R' ? 'Republican' : party;

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      <h3 className="font-semibold text-base mb-3">
        {fullName}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {previewText}
      </p>

      {/* Member details grid - always visible */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {chamber && (
            <div>
              <span className="text-muted-foreground">Chamber</span>
              <p className="font-medium">{chamber}</p>
            </div>
          )}
          {partyDisplay && (
            <div>
              <span className="text-muted-foreground">Party</span>
              <p className="font-medium">{partyDisplay}</p>
            </div>
          )}
          {member.district && (
            <div>
              <span className="text-muted-foreground">District</span>
              <p className="font-medium">{member.district}</p>
            </div>
          )}
          {member.role && (
            <div>
              <span className="text-muted-foreground">Role</span>
              <p className="font-medium">{member.role}</p>
            </div>
          )}
          {member.archived && (
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium">Archived</p>
            </div>
          )}
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

export default Members2;
