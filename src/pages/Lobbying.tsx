import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, HandCoins, ArrowUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLobbyingSearch, LobbyingTab, formatLobbyingCurrency } from '@/hooks/useLobbyingSearch';
import { LobbyingSpend, LobbyistCompensation, LobbyistClient } from '@/types/lobbying';

const Lobbying = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    spendRecords,
    compensationRecords,
    getClientsForCompensation,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    loadMore,
    hasMore,
    loadingMore,
  } = useLobbyingSearch();

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

  const handleSpendClick = (record: LobbyingSpend) => {
    navigate(`/lobbying/spend-${record.id}`);
  };

  const handleCompensationClick = (record: LobbyistCompensation) => {
    navigate(`/lobbying/comp-${record.id}`);
  };

  const handleSpendChatClick = (record: LobbyingSpend) => {
    const client = record.contractual_client || 'this client';
    const compensation = formatLobbyingCurrency(record.compensation);
    const totalExpenses = formatLobbyingCurrency(record.total_expenses);

    const initialPrompt = `Tell me about lobbying spending by ${client}. They paid ${compensation} in compensation with ${totalExpenses} in total expenses.`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const handleCompensationChatClick = (record: LobbyistCompensation, clients: LobbyistClient[]) => {
    const lobbyist = record.principal_lobbyist || 'this lobbyist';
    const compensation = formatLobbyingCurrency(record.compensation);
    const expenses = formatLobbyingCurrency(record.reimbursed_expenses);
    const grandTotal = formatLobbyingCurrency(record.grand_total_compensation_expenses);
    const clientCount = clients.length;

    // Get client names for the context (limit to first 50 for URL length)
    const clientNames = clients.slice(0, 50).map(c => c.contractual_client).filter(Boolean);
    const clientListText = clientNames.length > 0
      ? `\n\nCLIENT LIST (${clientNames.length}${clients.length > 50 ? ` of ${clients.length}` : ''}):\n${clientNames.join('\n')}`
      : '';

    // Short display prompt (what user sees)
    const displayPrompt = `Tell me about ${lobbyist}.`;

    // Hidden context for AI (includes all data for better responses)
    const context = `You are providing information about a New York State registered lobbyist. Here is the data from official JCOPE filings:

LOBBYIST: ${lobbyist}
COMPENSATION: ${compensation}
REIMBURSED EXPENSES: ${expenses}
GRAND TOTAL (Compensation + Expenses): ${grandTotal}
NUMBER OF CLIENTS: ${clientCount}${clientListText}

Based on this official lobbying disclosure data, provide a helpful analysis:
1. Explain what the compensation figures indicate about their lobbying practice scale and success
2. Describe what having ${clientCount} clients means (${clientCount > 100 ? 'a very large' : clientCount > 50 ? 'a large' : clientCount > 20 ? 'a moderate' : 'a smaller'} client base)
3. If you have general knowledge about this firm, include relevant context

IMPORTANT: Do NOT include any section about "Impact on Working Families" or similar social impact analysis. Focus on the business and political aspects of lobbying.

IMPORTANT: Do NOT reference or mention the client list in your response text (e.g., "Here is a list of their clients" or "as shown above"). The client list is automatically displayed in a separate accordion, so your response should only analyze the data without directing readers to a list.

At the end of your response, include the clients section in EXACTLY this format (this exact marker format is required):

---CLIENTS_START---
- CLIENT NAME 1
- CLIENT NAME 2
(continue for all clients)
---CLIENTS_END---

List ALL the client names provided above as bullet points between these markers. Do not add any other text or headings inside the markers.`;

    navigate(`/new-chat?prompt=${encodeURIComponent(displayPrompt)}&context=${encodeURIComponent(context)}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
  };

  const hasActiveFilters = !!searchTerm;

  const records = activeTab === 'spend' ? spendRecords : compensationRecords;

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
                    placeholder="Search lobbyists..."
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

                {/* Tab filters - styled like Contracts filter buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-colors",
                      activeTab === 'compensation'
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('compensation')}
                  >
                    Earnings
                  </button>
                  <button
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-colors",
                      activeTab === 'spend'
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('spend')}
                  >
                    Spending
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => navigate('/charts/lobbying')}
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results - Masonry Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-6" onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
              loadMore();
            }
          }}>
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Error loading lobbying data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <HandCoins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No lobbying records found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : activeTab === 'spend' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isAuthenticated ? spendRecords : spendRecords.slice(0, 9)).map((record) => (
                    <SpendCard
                      key={record.id}
                      record={record}
                      onClick={() => handleSpendClick(record)}
                      onChatClick={() => handleSpendChatClick(record)}
                    />
                  ))}
                </div>
                {isAuthenticated && loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Please log in to view thousands of lobbying records.
                    </p>
                    <Button variant="ghost" onClick={() => navigate('/auth-4')}
                      className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">
                      Sign Up
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isAuthenticated ? compensationRecords : compensationRecords.slice(0, 9)).map((record) => {
                    const clients = getClientsForCompensation(record);
                    return (
                      <CompensationCard
                        key={record.id}
                        record={record}
                        clients={clients}
                        onClick={() => handleCompensationClick(record)}
                        onChatClick={() => handleCompensationChatClick(record, clients)}
                      />
                    );
                  })}
                </div>
                {isAuthenticated && loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Please log in to view thousands of lobbying records.
                    </p>
                    <Button variant="ghost" onClick={() => navigate('/auth-4')}
                      className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">
                      Sign Up
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
      </InsetPanel>
    </div>
  );
};

// Spend Card Component
interface SpendCardProps {
  record: LobbyingSpend;
  onClick: () => void;
  onChatClick: () => void;
}

function SpendCard({ record, onClick, onChatClick }: SpendCardProps) {
  const client = record.contractual_client || 'Unknown Client';
  const compensation = formatLobbyingCurrency(record.compensation);
  const totalExpenses = formatLobbyingCurrency(record.total_expenses);

  const promptText = `Tell me about lobbying spending by ${client} with ${compensation} in compensation.`;

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      <h3 className="font-semibold text-base mb-3">{client}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{promptText}</p>

      {/* Details - always visible */}
      <div className="mt-4 space-y-2 text-xs">
        {/* Row 1: Total (Comp + Expenses) - hero metric */}
        <div>
          <span className="text-muted-foreground">Total (Comp + Expenses)</span>
          <p className="font-medium text-green-600 dark:text-green-400">{formatLobbyingCurrency(record.compensation_and_expenses)}</p>
        </div>

        {/* Row 2: Compensation + Total Expenses */}
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <span className="text-muted-foreground">Compensation</span>
            <p className="font-medium">{formatLobbyingCurrency(record.compensation)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Expenses</span>
            <p className="font-medium">{formatLobbyingCurrency(record.total_expenses)}</p>
          </div>
        </div>

        {/* Row 3: Secondary expenses (only show if has value) */}
        {(record.expenses_less_than_75 != null || record.itemized_expenses != null || record.salaries_no_lobbying_employees != null) && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {record.salaries_no_lobbying_employees != null && (
              <div>
                <span className="text-muted-foreground">Salaries (Non-Lobbying)</span>
                <p className="font-medium">{formatLobbyingCurrency(record.salaries_no_lobbying_employees)}</p>
              </div>
            )}
            {record.expenses_less_than_75 != null && (
              <div>
                <span className="text-muted-foreground">Expenses &lt;$75</span>
                <p className="font-medium">{formatLobbyingCurrency(record.expenses_less_than_75)}</p>
              </div>
            )}
            {record.itemized_expenses != null && (
              <div>
                <span className="text-muted-foreground">Itemized Expenses</span>
                <p className="font-medium">{formatLobbyingCurrency(record.itemized_expenses)}</p>
              </div>
            )}
          </div>
        )}

        {/* Action button - appears on hover */}
        <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleChatClick}
            className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Clients Dialog Component - Matches sidebar search style
interface ClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lobbyistName: string;
  clients: LobbyistClient[];
  onViewDetails: () => void;
}

function ClientsDialog({ open, onOpenChange, lobbyistName, clients, onViewDetails }: ClientsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.contractual_client?.toLowerCase().includes(term) ||
      client.start_date?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchTerm(''); // Reset search when closing
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[calc(100%-2rem)] mx-auto p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Search Header - matches sidebar search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={searchInputRef}
            placeholder={`Search ${lobbyistName}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
          <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Client ({filteredClients.length})
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-right">
            Start Date
          </span>
        </div>

        {/* Scrollable Client List */}
        <ScrollArea className="h-[280px]">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No clients found</p>
            </div>
          ) : (
            <div>
              {filteredClients.map((client, idx) => (
                <div
                  key={client.id || idx}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50 hover:shadow-sm transition-all cursor-default"
                >
                  <span className="text-sm truncate flex-1 min-w-0">
                    {client.contractual_client || 'Unknown Client'}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {client.start_date ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer - matches sidebar search */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">esc</kbd>
              Close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">↓</kbd>
              Navigate
            </span>
          </div>
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>↵</span>
            <span>Open</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compensation Card Component
interface CompensationCardProps {
  record: LobbyistCompensation;
  clients: LobbyistClient[];
  onClick: () => void;
  onChatClick: () => void;
}

function CompensationCard({ record, clients, onClick, onChatClick }: CompensationCardProps) {
  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const lobbyist = record.principal_lobbyist || 'Unknown Lobbyist';
  const compensation = formatLobbyingCurrency(record.compensation);
  const expenses = formatLobbyingCurrency(record.reimbursed_expenses);

  const promptText = `Tell me about ${lobbyist} with ${compensation} in compensation${clients.length > 0 ? ` and ${clients.length} clients` : ''}.`;

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  const handleClientsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClientsDialogOpen(true);
  };

  return (
    <>
      <div
        onClick={onClick}
        className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
      >
        {/* Header row with lobbyist name and clients button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-base">{lobbyist}</h3>
          {clients.length > 0 && (
            <button
              onClick={handleClientsClick}
              className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm rounded-md transition-all"
            >
              {clients.length} Clients
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{promptText}</p>

        {/* Details - always visible */}
        <div className="mt-4 space-y-2 text-xs">
          {/* Row 1: Grand Total - hero metric */}
          <div>
            <span className="text-muted-foreground">Grand Total</span>
            <p className="font-medium text-green-600 dark:text-green-400">{formatLobbyingCurrency(record.grand_total_compensation_expenses)}</p>
          </div>

          {/* Row 2: Compensation + Reimbursed Expenses */}
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <span className="text-muted-foreground">Compensation</span>
              <p className="font-medium">{formatLobbyingCurrency(record.compensation)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Reimbursed Expenses</span>
              <p className="font-medium">{formatLobbyingCurrency(record.reimbursed_expenses)}</p>
            </div>
          </div>

          {/* Action button - appears on hover */}
          <div className="flex items-center justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleChatClick}
              className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Clients Dialog */}
      <ClientsDialog
        open={clientsDialogOpen}
        onOpenChange={setClientsDialogOpen}
        lobbyistName={lobbyist}
        clients={clients}
        onViewDetails={onClick}
      />
    </>
  );
}

export default Lobbying;
