import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowUp } from 'lucide-react';
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
import { useRevenueSearch, getLatestAmount, formatRevenueAmount } from '@/hooks/useRevenueSearch';
import { Revenue as RevenueType } from '@/types/revenue';
import { useAuth } from '@/contexts/AuthContext';

const Revenue = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    revenue,
    totalCount,
    isLoading,
    error,
    fundGroups,
    fpCategories,
    searchTerm,
    setSearchTerm,
    fundGroupFilter,
    setFundGroupFilter,
    fpCategoryFilter,
    setFpCategoryFilter,
    loadMore,
    hasMore,
    loadingMore,
  } = useRevenueSearch();

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

  const handleRevenueClick = (item: RevenueType) => {
    navigate(`/revenue/${item.id}`);
  };

  const handleChatClick = (item: RevenueType) => {
    const receipt = item.Detail_Receipt || 'this revenue source';
    const fund = item.Fund_Group ? ` in the ${item.Fund_Group} fund group` : '';
    const category = item.FP_Category ? ` (${item.FP_Category})` : '';
    const latestAmount = getLatestAmount(item);
    const amountStr = latestAmount ? ` The most recent amount is ${formatRevenueAmount(latestAmount)}.` : '';

    const initialPrompt = `[Revenue:${item.id}] Tell me about the NYS revenue source "${receipt}"${fund}${category}.${amountStr} What should I know about this revenue category?`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFundGroupFilter('');
    setFpCategoryFilter('');
  };

  const hasActiveFilters = searchTerm || fundGroupFilter || fpCategoryFilter;

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
                    placeholder="Search revenue sources..."
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
                  <Select value={fundGroupFilter || "all"} onValueChange={(v) => setFundGroupFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Fund Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Fund Group</SelectItem>
                      {fundGroups.map((group) => (
                        <SelectItem key={group} value={group} className="focus:bg-muted focus:text-foreground">
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={fpCategoryFilter || "all"} onValueChange={(v) => setFpCategoryFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Category</SelectItem>
                      {fpCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="focus:bg-muted focus:text-foreground">
                          {cat}
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
            if (!isAuthenticated) return;
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
              loadMore();
            }
          }}>
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Error loading revenue data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : revenue.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No revenue sources found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isAuthenticated ? revenue : revenue.slice(0, 9)).map((item) => (
                    <RevenueCard
                      key={item.id}
                      revenue={item}
                      onClick={() => handleRevenueClick(item)}
                      onChatClick={() => handleChatClick(item)}
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
                      Please log in to view all revenue records.
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

// Revenue card component
interface RevenueCardProps {
  revenue: RevenueType;
  onClick: () => void;
  onChatClick: () => void;
}

function RevenueCard({ revenue, onClick, onChatClick }: RevenueCardProps) {
  const latestAmount = getLatestAmount(revenue);

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      <h3 className="font-semibold text-base mb-3">
        {revenue.Detail_Receipt || 'Unknown Revenue Source'}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Tell me about this NYS revenue source
        {revenue.Fund_Group ? ` in ${revenue.Fund_Group}` : ''}.
      </p>

      {/* Revenue details grid */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {revenue.Fund_Group && (
            <div>
              <span className="text-muted-foreground">Fund Group</span>
              <p className="font-medium truncate">{revenue.Fund_Group}</p>
            </div>
          )}
          {revenue.FP_Category && (
            <div>
              <span className="text-muted-foreground">Category</span>
              <p className="font-medium truncate">{revenue.FP_Category}</p>
            </div>
          )}
          {latestAmount && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Latest Amount</span>
              <p className="font-medium text-green-600 dark:text-green-400">
                {formatRevenueAmount(latestAmount)}
              </p>
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

export default Revenue;
