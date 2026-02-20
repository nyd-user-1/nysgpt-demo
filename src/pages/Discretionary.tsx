import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Banknote, ArrowUp } from 'lucide-react';
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
import { useDiscretionarySearch, AMOUNT_SLIDER_MIN, AMOUNT_SLIDER_MAX, sliderToAmount, formatSliderAmount } from '@/hooks/useDiscretionarySearch';
import { Slider } from '@/components/ui/slider';
import { Discretionary as DiscretionaryType, formatGrantAmount, cleanGranteeName } from '@/types/discretionary';
import { useAuth } from '@/contexts/AuthContext';

const Discretionary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    grants,
    totalCount,
    isLoading,
    error,
    agencies,
    fundTypes,
    sponsors,
    years,
    searchTerm,
    setSearchTerm,
    agencyFilter,
    setAgencyFilter,
    fundTypeFilter,
    setFundTypeFilter,
    sponsorFilter,
    setSponsorFilter,
    yearFilter,
    setYearFilter,
    amountRange,
    setAmountRange,
    loadMore,
    hasMore,
    loadingMore,
  } = useDiscretionarySearch();

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

  const handleGrantClick = (item: DiscretionaryType) => {
    navigate(`/discretionary/${item.id}`);
  };

  const handleChatClick = (item: DiscretionaryType) => {
    const grantee = item.Grantee || 'this grant recipient';
    const agency = item.agency_name ? ` from ${item.agency_name}` : '';
    const amount = item["Grant Amount"] ? ` for ${formatGrantAmount(item["Grant Amount"])}` : '';

    const initialPrompt = `[Discretionary:${item.id}] Tell me about the NYS discretionary grant to "${grantee}"${agency}${amount}. What should I know about this grant?`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAgencyFilter('');
    setFundTypeFilter('');
    setSponsorFilter('');
    setYearFilter('');
    setAmountRange([AMOUNT_SLIDER_MIN, AMOUNT_SLIDER_MAX]);
  };

  const amountFilterActive = amountRange[0] !== AMOUNT_SLIDER_MIN || amountRange[1] !== AMOUNT_SLIDER_MAX;
  const hasActiveFilters = searchTerm || agencyFilter || fundTypeFilter || sponsorFilter || yearFilter || amountFilterActive;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-50",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      <InsetPanel>
          {/* Header */}
          <div className="flex-shrink-0 bg-background">
            <div className="px-4 py-4">
              <div className="flex flex-col gap-4">
                {/* Title row */}
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
                    placeholder="Search discretionary..."
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
                <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                  <Select value={agencyFilter || "all"} onValueChange={(v) => setAgencyFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Agency</SelectItem>
                      {agencies.map((a) => (
                        <SelectItem key={a} value={a} className="focus:bg-muted focus:text-foreground">{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={fundTypeFilter || "all"} onValueChange={(v) => setFundTypeFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Fund Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Fund Type</SelectItem>
                      {fundTypes.map((f) => (
                        <SelectItem key={f} value={f} className="focus:bg-muted focus:text-foreground">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sponsorFilter || "all"} onValueChange={(v) => setSponsorFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Sponsor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Sponsor</SelectItem>
                      {sponsors.map((s) => (
                        <SelectItem key={s} value={s} className="focus:bg-muted focus:text-foreground">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={yearFilter || "all"} onValueChange={(v) => setYearFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Year</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={y} className="focus:bg-muted focus:text-foreground">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount range slider (log scale) */}
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Amount</span>
                  <Slider
                    value={amountRange}
                    onValueChange={(val) => setAmountRange(val as [number, number])}
                    min={AMOUNT_SLIDER_MIN}
                    max={AMOUNT_SLIDER_MAX}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
                    {formatSliderAmount(sliderToAmount(amountRange[0]))} – {formatSliderAmount(sliderToAmount(amountRange[1]))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-6" onScroll={(e) => {
            if (!isAuthenticated) return;
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
              loadMore();
            }
          }}>
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Error loading grants: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : grants.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No discretionary records found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isAuthenticated ? grants : grants.slice(0, 9)).map((item) => (
                    <GrantCard
                      key={item.id}
                      grant={item}
                      onClick={() => handleGrantClick(item)}
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
                      Please log in to view all discretionary records.
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

interface GrantCardProps {
  grant: DiscretionaryType;
  onClick: () => void;
  onChatClick: () => void;
}

function GrantCard({ grant, onClick, onChatClick }: GrantCardProps) {
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
        {cleanGranteeName(grant.Grantee)}
      </h3>
      {grant["Description of Grant"] && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
          {grant["Description of Grant"]}
        </p>
      )}

      <div className="mt-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {grant.agency_name && (
            <div>
              <span className="text-muted-foreground">Agency</span>
              <p className="font-medium truncate">{grant.agency_name}</p>
            </div>
          )}
          {grant.Sponsor && (
            <div>
              <span className="text-muted-foreground">Sponsor</span>
              <p className="font-medium truncate">{grant.Sponsor}</p>
            </div>
          )}
          {grant["Grant Amount"] && (
            <div>
              <span className="text-muted-foreground">Grant Amount</span>
              <p className="font-medium text-green-600 dark:text-green-400">
                {formatGrantAmount(grant["Grant Amount"])}
              </p>
            </div>
          )}
          {grant["Approval Date"] && (
            <div>
              <span className="text-muted-foreground">Approved</span>
              <p className="font-medium">{grant["Approval Date"]}</p>
            </div>
          )}
        </div>

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

export default Discretionary;
