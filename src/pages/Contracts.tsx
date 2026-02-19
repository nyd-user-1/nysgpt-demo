import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, ArrowUp } from 'lucide-react';
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
import { useContractsSearch, formatCurrency, formatContractDate } from '@/hooks/useContractsSearch';
import { Contract } from '@/types/contracts';

const Contracts = () => {
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
    contracts,
    totalCount,
    isLoading,
    error,
    departments,
    contractTypes,
    searchTerm,
    setSearchTerm,
    departmentFilter,
    setDepartmentFilter,
    contractTypeFilter,
    setContractTypeFilter,
    loadMore,
    hasMore,
    loadingMore,
  } = useContractsSearch();

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

  const handleContractClick = (contract: Contract) => {
    if (contract.contract_number) {
      navigate(`/contracts/${encodeURIComponent(contract.contract_number)}`);
    }
  };

  const handleChatClick = (contract: Contract) => {
    if (!contract.contract_number) return;

    const vendor = contract.vendor_name || 'this vendor';
    const dept = contract.department_facility ? ` for ${contract.department_facility}` : '';
    const amount = contract.current_contract_amount
      ? ` worth ${formatCurrency(contract.current_contract_amount)}`
      : '';
    const desc = contract.contract_description
      ? ` The contract description says: "${contract.contract_description}".`
      : '';

    // Include contractNumber in prompt for precise chat association
    const initialPrompt = `[Contract:${contract.contract_number}] Tell me about the contract with ${vendor}${dept}${amount}.${desc} What should I know about this contract?`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setContractTypeFilter('');
  };

  const hasActiveFilters = searchTerm || departmentFilter || contractTypeFilter;

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
                    placeholder="Search contracts..."
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
                  <Select value={departmentFilter || "all"} onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept} className="focus:bg-muted focus:text-foreground">
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={contractTypeFilter || "all"} onValueChange={(v) => setContractTypeFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Type</SelectItem>
                      {contractTypes.map((type) => (
                        <SelectItem key={type} value={type} className="focus:bg-muted focus:text-foreground">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <p className="text-destructive">Error loading contracts: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No contracts found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      onClick={() => handleContractClick(contract)}
                      onChatClick={() => handleChatClick(contract)}
                    />
                  ))}
                </div>
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  </div>
                )}
              </>
            )}
          </div>
      </InsetPanel>
    </div>
  );
};

// Contract card component - masonry style matching case studies
interface ContractCardProps {
  contract: Contract;
  onClick: () => void;
  onChatClick: () => void;
}

function ContractCard({ contract, onClick, onChatClick }: ContractCardProps) {
  const amount = contract.current_contract_amount
    ? formatCurrency(contract.current_contract_amount)
    : null;
  const dept = contract.department_facility;

  // Build the prompt preview text
  let promptText = `Tell me about this contract`;
  if (dept) {
    promptText += ` with ${dept}`;
  }
  if (amount) {
    promptText += ` worth ${amount}`;
  }
  promptText += '.';

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onChatClick();
  };

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      <h3 className="font-semibold text-base mb-3">
        {contract.vendor_name || 'Unknown Vendor'}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {promptText}
      </p>

      {/* Contract details grid - always visible */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {contract.contract_number && (
            <div>
              <span className="text-muted-foreground">Contract #</span>
              <p className="font-medium truncate">{contract.contract_number}</p>
            </div>
          )}
          {contract.contract_type && (
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium">{contract.contract_type}</p>
            </div>
          )}
          {contract.contract_start_date && (
            <div>
              <span className="text-muted-foreground">Start</span>
              <p className="font-medium">{formatContractDate(contract.contract_start_date)}</p>
            </div>
          )}
          {contract.contract_end_date && (
            <div>
              <span className="text-muted-foreground">End</span>
              <p className="font-medium">{formatContractDate(contract.contract_end_date)}</p>
            </div>
          )}
          {contract.spending_to_date && (
            <div>
              <span className="text-muted-foreground">Spent</span>
              <p className="font-medium">{contract.spending_to_date}</p>
            </div>
          )}
          {contract.original_contract_approved_file_date && (
            <div>
              <span className="text-muted-foreground">Approved</span>
              <p className="font-medium">{formatContractDate(contract.original_contract_approved_file_date)}</p>
            </div>
          )}
        </div>

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

export default Contracts;
