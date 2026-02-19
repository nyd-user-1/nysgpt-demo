import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, DollarSign, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudgetSearch, formatBudgetAmount, reformatAgencyName, type BudgetTab } from '@/hooks/useBudgetSearch';
import { departmentPrompts, agencyPrompts, authorityPrompts } from '@/pages/Prompts';
import { InsetPanel } from '@/components/ui/inset-panel';

const tabs: { id: BudgetTab; label: string }[] = [
  { id: 'appropriations', label: 'Appropriations' },
  { id: 'capital', label: 'Capital' },
  { id: 'spending', label: 'Spending' },
];

const SECONDARY_LABEL: Record<BudgetTab, string> = {
  appropriations: 'Category',
  capital: 'Source',
  spending: 'Function',
};

const FUND_TYPE_LABEL: Record<BudgetTab, string> = {
  appropriations: 'Fund Type',
  capital: 'Fund Name',
  spending: 'Fund Type',
};

const EXTRA_LABEL: Record<BudgetTab, string> = {
  appropriations: 'Fund',
  capital: 'Program',
  spending: 'FP Category',
};

const Budget = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<BudgetTab>('appropriations');

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    data: items,
    isLoading,
    error,
    agencies,
    secondaryOptions,
    fundTypeOptions,
    extraOptions,
    yearOptions,
    searchTerm,
    setSearchTerm,
    agencyFilter,
    setAgencyFilter,
    secondaryFilter,
    setSecondaryFilter,
    fundTypeFilter,
    setFundTypeFilter,
    extraFilter,
    setExtraFilter,
    yearFilter,
    setYearFilter,
    resetFilters,
    loadMore,
    hasMore,
    loadingMore,
  } = useBudgetSearch(activeTab);

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

  const handleTabChange = (tab: BudgetTab) => {
    setActiveTab(tab);
    resetFilters();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAgencyFilter('');
    setSecondaryFilter('');
    setFundTypeFilter('');
    setExtraFilter('');
    setYearFilter('');
  };

  const hasActiveFilters = searchTerm || agencyFilter || secondaryFilter || fundTypeFilter || extraFilter || yearFilter;

  const handleChatClick = (item: any) => {
    let prompt = '';
    let budgetAgency = '';
    let budgetProgram = '';
    if (activeTab === 'appropriations') {
      budgetAgency = item['Agency Name'] || '';
      budgetProgram = item['Program Name'] || '';
      const agency = reformatAgencyName(budgetAgency || 'this agency');
      const program = budgetProgram ? ` for "${budgetProgram}"` : '';
      const amount = item['Appropriations Recommended 2026-27']
        ? ` with a recommended appropriation of ${formatBudgetAmount(item['Appropriations Recommended 2026-27'])}`
        : '';
      prompt = `Tell me about the NYS budget appropriation for ${agency}${program}${amount}. What is this funding used for and how has it changed from the prior year?`;
    } else if (activeTab === 'capital') {
      budgetAgency = item['Agency Name'] || '';
      const agency = reformatAgencyName(budgetAgency || 'this agency');
      const desc = item['Description'] ? ` described as "${item['Description']}"` : '';
      const amount = item['Appropriations Recommended 2026-27']
        ? ` with a recommended amount of ${formatBudgetAmount(item['Appropriations Recommended 2026-27'])}`
        : '';
      prompt = `Tell me about the NYS capital appropriation for ${agency}${desc}${amount}. What is this capital project about?`;
    } else {
      budgetAgency = item['Agency'] || '';
      const agency = reformatAgencyName(budgetAgency || 'this agency');
      const fn = item['Function'] ? ` under the "${item['Function']}" function` : '';
      const selectedYearCol = yearFilter || '2026-27 Estimates';
      const fyLabel = selectedYearCol.replace(/\s+(Actuals|Estimates)$/i, '');
      const amount = item[selectedYearCol]
        ? ` with spending of ${formatBudgetAmount(item[selectedYearCol])} in FY ${fyLabel}`
        : '';
      prompt = `Tell me about NYS spending by ${agency}${fn}${amount}. How has this spending changed over recent years?`;
    }
    const params = new URLSearchParams({ prompt });
    if (budgetAgency) params.set('budgetAgency', budgetAgency);
    if (budgetProgram) params.set('budgetProgram', budgetProgram);
    navigate(`/new-chat?${params.toString()}`);
  };

  const handleCardClick = (item: any) => {
    const agencyCol = activeTab === 'spending' ? 'Agency' : 'Agency Name';
    const rawName = item[agencyCol];
    if (!rawName) return;

    // Convert budget name (e.g. "Mental Health, Office of") to display title
    const displayName = reformatAgencyName(rawName);
    const allPrompts = [...departmentPrompts, ...agencyPrompts, ...authorityPrompts];
    const match = allPrompts.find(
      (p) => p.title.toLowerCase() === displayName.toLowerCase()
    );
    if (match) {
      navigate(`/departments/${match.slug}`);
    }
  };

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

      {/* Main Container */}
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
                    placeholder="Search the budget..."
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

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                        activeTab === tab.id
                          ? 'bg-foreground text-background'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button
                    onClick={() => navigate('/explore/budget')}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-muted hover:bg-muted/80 text-foreground whitespace-nowrap"
                  >
                    Dashboard
                  </button>
                </div>

                {/* Filters row */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                  <Select value={agencyFilter || 'all'} onValueChange={(v) => setAgencyFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-auto border-0 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                      <SelectValue placeholder="Agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Agency</SelectItem>
                      {agencies.map((a: string) => (
                        <SelectItem key={a} value={a} className="focus:bg-muted focus:text-foreground">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={secondaryFilter || 'all'} onValueChange={(v) => setSecondaryFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-auto border-0 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                      <SelectValue placeholder={SECONDARY_LABEL[activeTab]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">{SECONDARY_LABEL[activeTab]}</SelectItem>
                      {secondaryOptions.map((opt: string) => (
                        <SelectItem key={opt} value={opt} className="focus:bg-muted focus:text-foreground">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={fundTypeFilter || 'all'} onValueChange={(v) => setFundTypeFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-auto border-0 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                      <SelectValue placeholder={FUND_TYPE_LABEL[activeTab]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">{FUND_TYPE_LABEL[activeTab]}</SelectItem>
                      {fundTypeOptions.map((opt: string) => (
                        <SelectItem key={opt} value={opt} className="focus:bg-muted focus:text-foreground">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={extraFilter || 'all'} onValueChange={(v) => setExtraFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-auto border-0 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                      <SelectValue placeholder={EXTRA_LABEL[activeTab]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">{EXTRA_LABEL[activeTab]}</SelectItem>
                      {extraOptions.map((opt: string) => (
                        <SelectItem key={opt} value={opt} className="focus:bg-muted focus:text-foreground">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activeTab === 'spending' && (
                    <Select value={yearFilter || 'all'} onValueChange={(v) => setYearFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-auto border-0 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="focus:bg-muted focus:text-foreground">Year</SelectItem>
                        {yearOptions.map((yr: string) => (
                          <SelectItem key={yr} value={yr} className="focus:bg-muted focus:text-foreground">
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-6" onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
              loadMore();
            }
          }}>
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Error loading budget data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No budget records found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isAuthenticated ? items : items.slice(0, 9)).map((item: any, idx: number) => (
                    <BudgetCard
                      key={idx}
                      item={item}
                      tab={activeTab}
                      yearCol={yearFilter || '2026-27 Estimates'}
                      onChatClick={() => handleChatClick(item)}
                      onCardClick={() => handleCardClick(item)}
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
                      Please log in to view thousands of budget records.
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

// ── Card component ────────────────────────────────────────────────

interface BudgetCardProps {
  item: any;
  tab: BudgetTab;
  yearCol: string;
  onChatClick: () => void;
  onCardClick: () => void;
}

function BudgetCard({ item, tab, yearCol, onChatClick, onCardClick }: BudgetCardProps) {
  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  if (tab === 'appropriations') {
    return <AppropriationCard item={item} onChatClick={handleChat} onCardClick={onCardClick} />;
  }
  if (tab === 'capital') {
    return <CapitalCard item={item} onChatClick={handleChat} onCardClick={onCardClick} />;
  }
  return <SpendingCard item={item} yearCol={yearCol} onChatClick={handleChat} onCardClick={onCardClick} />;
}

// ── Appropriations Card ───────────────────────────────────────────

function AppropriationCard({ item, onChatClick, onCardClick }: { item: any; onChatClick: (e: React.MouseEvent) => void; onCardClick: () => void }) {
  const agency = reformatAgencyName(item['Agency Name'] || 'Unknown Agency');
  const program = item['Program Name'];
  const category = item['Appropriation Category'];
  const recommended = item['Appropriations Recommended 2026-27'];
  const available = item['Appropriations Available 2025-26'];

  let promptText = `${agency} appropriation`;
  if (program) promptText += ` for ${program}`;
  if (recommended) promptText += ` — ${formatBudgetAmount(recommended)} recommended for FY 2026-27`;

  return (
    <div onClick={onCardClick} className="group bg-muted/30 hover:shadow-lg rounded-2xl p-6 cursor-pointer transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-base">{agency}</h3>
        {recommended && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-3 whitespace-nowrap">
            {formatBudgetAmount(recommended)}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {promptText}.
      </p>

      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {program && (
            <div>
              <span className="text-muted-foreground">Program</span>
              <p className="font-medium truncate">{program}</p>
            </div>
          )}
          {category && (
            <div>
              <span className="text-muted-foreground">Category</span>
              <p className="font-medium">{category}</p>
            </div>
          )}
          {item['Fund Type'] && (
            <div>
              <span className="text-muted-foreground">Fund Type</span>
              <p className="font-medium">{item['Fund Type']}</p>
            </div>
          )}
          {item['Fund Name'] && (
            <div>
              <span className="text-muted-foreground">Fund</span>
              <p className="font-medium truncate">{item['Fund Name']}</p>
            </div>
          )}
          {available && (
            <div>
              <span className="text-muted-foreground">Available 2025-26</span>
              <p className="font-medium">{formatBudgetAmount(available)}</p>
            </div>
          )}
          {item['Reappropriations Recommended 2026-27'] && (
            <div>
              <span className="text-muted-foreground">Reapprop. 2026-27</span>
              <p className="font-medium">{formatBudgetAmount(item['Reappropriations Recommended 2026-27'])}</p>
            </div>
          )}
          {item['Estimated FTEs 03/31/2027'] && (
            <div>
              <span className="text-muted-foreground">Est. FTEs 2027</span>
              <p className="font-medium">{item['Estimated FTEs 03/31/2027']}</p>
            </div>
          )}
        </div>

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

// ── Capital Card ──────────────────────────────────────────────────

function CapitalCard({ item, onChatClick, onCardClick }: { item: any; onChatClick: (e: React.MouseEvent) => void; onCardClick: () => void }) {
  const agency = reformatAgencyName(item['Agency Name'] || 'Unknown Agency');
  const description = item['Description'];
  const recommended = item['Appropriations Recommended 2026-27'];

  let promptText = `${agency} capital project`;
  if (description) promptText += `: ${description}`;
  if (recommended) promptText += ` — ${formatBudgetAmount(recommended)} recommended`;

  return (
    <div onClick={onCardClick} className="group bg-muted/30 hover:shadow-lg rounded-2xl p-6 cursor-pointer transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-base">{agency}</h3>
        {recommended && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-3 whitespace-nowrap">
            {formatBudgetAmount(recommended)}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {promptText}.
      </p>

      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {item['Program Name'] && (
            <div>
              <span className="text-muted-foreground">Program</span>
              <p className="font-medium truncate">{item['Program Name']}</p>
            </div>
          )}
          {item['Reference Number'] && (
            <div>
              <span className="text-muted-foreground">Reference #</span>
              <p className="font-medium">{item['Reference Number']}</p>
            </div>
          )}
          {item['Financing Source'] && (
            <div>
              <span className="text-muted-foreground">Financing</span>
              <p className="font-medium">{item['Financing Source']}</p>
            </div>
          )}
          {item['Fund Name'] && (
            <div>
              <span className="text-muted-foreground">Fund</span>
              <p className="font-medium truncate">{item['Fund Name']}</p>
            </div>
          )}
          {item['Reappropriations Recommended 2026-27'] && (
            <div>
              <span className="text-muted-foreground">Reapprop. 2026-27</span>
              <p className="font-medium">{formatBudgetAmount(item['Reappropriations Recommended 2026-27'])}</p>
            </div>
          )}
          {item['Encumbrance as of 1/16/2026'] && (
            <div>
              <span className="text-muted-foreground">Encumbrance</span>
              <p className="font-medium">{formatBudgetAmount(item['Encumbrance as of 1/16/2026'])}</p>
            </div>
          )}
          {item['Chapter/Section/Year'] && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Chapter/Section/Year</span>
              <p className="font-medium truncate">{item['Chapter/Section/Year']}</p>
            </div>
          )}
        </div>

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

// ── Spending Card ─────────────────────────────────────────────────

function SpendingCard({ item, yearCol, onChatClick, onCardClick }: { item: any; yearCol: string; onChatClick: (e: React.MouseEvent) => void; onCardClick: () => void }) {
  const agency = reformatAgencyName(item['Agency'] || 'Unknown Agency');
  const fn = item['Function'];
  const estimate = item[yearCol];
  // Extract fiscal year label like "2026-27" from column name "2026-27 Estimates"
  const fyLabel = yearCol.replace(/\s+(Actuals|Estimates)$/i, '');
  const fyType = yearCol.includes('Estimates') ? 'est.' : 'actual';

  let promptText = `${agency} spending`;
  if (fn) promptText += ` — ${fn}`;
  if (estimate) promptText += `, ${formatBudgetAmount(estimate)} ${fyType} FY ${fyLabel}`;

  return (
    <div onClick={onCardClick} className="group bg-muted/30 hover:shadow-lg rounded-2xl p-6 cursor-pointer transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-base">{agency}</h3>
        {estimate && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-3 whitespace-nowrap">
            {formatBudgetAmount(estimate)}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {promptText}.
      </p>

      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {fn && (
            <div>
              <span className="text-muted-foreground">Function</span>
              <p className="font-medium">{fn}</p>
            </div>
          )}
          {item['Fund Type'] && (
            <div>
              <span className="text-muted-foreground">Fund Type</span>
              <p className="font-medium">{item['Fund Type']}</p>
            </div>
          )}
          {item['Fund'] && (
            <div>
              <span className="text-muted-foreground">Fund</span>
              <p className="font-medium truncate">{item['Fund']}</p>
            </div>
          )}
          {item['FP Category'] && (
            <div>
              <span className="text-muted-foreground">FP Category</span>
              <p className="font-medium">{item['FP Category']}</p>
            </div>
          )}
          {item['2025-26 Estimates'] && (
            <div>
              <span className="text-muted-foreground">Est. 2025-26</span>
              <p className="font-medium">{formatBudgetAmount(item['2025-26 Estimates'])}</p>
            </div>
          )}
          {item['2024-25 Actuals'] && (
            <div>
              <span className="text-muted-foreground">Actual 2024-25</span>
              <p className="font-medium">{formatBudgetAmount(item['2024-25 Actuals'])}</p>
            </div>
          )}
          {item['2023-24 Actuals'] && (
            <div>
              <span className="text-muted-foreground">Actual 2023-24</span>
              <p className="font-medium">{formatBudgetAmount(item['2023-24 Actuals'])}</p>
            </div>
          )}
          {item['2022-23 Actuals'] && (
            <div>
              <span className="text-muted-foreground">Actual 2022-23</span>
              <p className="font-medium">{formatBudgetAmount(item['2022-23 Actuals'])}</p>
            </div>
          )}
        </div>

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

export default Budget;
