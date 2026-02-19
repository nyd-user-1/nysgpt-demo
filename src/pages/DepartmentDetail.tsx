import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { MobileMenuIcon } from '@/components/MobileMenuButton';
import { departmentPrompts, agencyPrompts, authorityPrompts } from '@/pages/Prompts';
import { supabase } from '@/integrations/supabase/client';
import { TABLE_MAP, titleToBudgetNames, reformatAgencyName, formatBudgetAmount } from '@/hooks/useBudgetSearch';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

// Find item across all prompt arrays
function findBySlug(slug: string) {
  for (const item of departmentPrompts) {
    if (item.slug === slug) return { ...item, category: 'Department' };
  }
  for (const item of agencyPrompts) {
    if (item.slug === slug) return { ...item, category: 'Agency' };
  }
  for (const item of authorityPrompts) {
    if (item.slug === slug) return { ...item, category: 'Authority' };
  }
  return null;
}

// Get related items from the same category
function getRelated(slug: string, category: string) {
  const source = category === 'Department' ? departmentPrompts
    : category === 'Agency' ? agencyPrompts
    : authorityPrompts;
  return source.filter(i => i.slug !== slug).slice(0, 3);
}

export default function DepartmentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const item = slug ? findBySlug(slug) : null;
  const related = item ? getRelated(slug!, item.category) : [];

  // Build candidate budget-table names from the Prompts title
  const budgetCandidates = useMemo(
    () => (item ? titleToBudgetNames(item.title) : []),
    [item]
  );

  // Fetch appropriations data directly using candidate names
  const { data: appropriationsData } = useQuery({
    queryKey: ['dept-appropriations', budgetCandidates],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_MAP.appropriations)
        .select('*')
        .in('Agency Name', budgetCandidates)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: budgetCandidates.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch capital data directly using candidate names
  const { data: capitalData } = useQuery({
    queryKey: ['dept-capital', budgetCandidates],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_MAP.capital)
        .select('*')
        .in('Agency Name', budgetCandidates)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: budgetCandidates.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch spending data directly using candidate names
  const { data: spendingData } = useQuery({
    queryKey: ['dept-spending', budgetCandidates],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_MAP.spending)
        .select('*')
        .in('Agency', budgetCandidates)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: budgetCandidates.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const hasBudgetData = (appropriationsData && appropriationsData.length > 0)
    || (capitalData && capitalData.length > 0)
    || (spendingData && spendingData.length > 0);

  // Compute budget summary rows
  const budgetSummary = useMemo(() => {
    if (!hasBudgetData) return null;

    const parseNum = (val: string | null | undefined): number => {
      if (!val || val.trim() === '' || val === '0') return 0;
      const cleaned = val.replace(/[$,\s]/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    const totalApprops = (appropriationsData || []).reduce(
      (sum: number, row: any) => sum + parseNum(row['Appropriations Recommended 2026-27']), 0
    );
    const totalCapital = (capitalData || []).reduce(
      (sum: number, row: any) => sum + parseNum(row['Appropriations Recommended 2026-27']), 0
    );
    const totalSpending = (spendingData || []).reduce(
      (sum: number, row: any) => sum + parseNum(row['2026-27 Estimates']), 0
    );

    return {
      totalApprops,
      totalCapital,
      totalSpending,
    };
  }, [appropriationsData, capitalData, spendingData, hasBudgetData]);

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Not Found</h1>
          <p className="text-muted-foreground mb-4">This department could not be found.</p>
          <Button onClick={() => navigate('/departments')}>Back to Departments</Button>
        </div>
      </div>
    );
  }

  const handleStartChat = () => {
    navigate(`/new-chat?prompt=${encodeURIComponent(item.prompt)}`);
  };

  const formatCurrency = (num: number): string => {
    if (num === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-[60]",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {/* Backdrop */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 transition-opacity"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <InsetPanel className="relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
            <div className="flex items-center gap-2">
              <MobileMenuIcon onOpenSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)} />
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className={cn("hidden md:inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors", leftSidebarOpen && "bg-muted")}
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                  <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                  <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
                </svg>
              </button>
            </div>
            <button
              onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
              className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
            >
              NYSgpt
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="absolute top-[57px] bottom-0 left-0 right-0 overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-10">
                <button
                  onClick={() => navigate('/departments')}
                  className="hover:text-foreground transition-colors"
                >
                  Departments
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground/60 truncate">{item.title}</span>
              </div>

              {/* Title + Start Chat */}
              <div className="flex items-start justify-between gap-6 mb-2">
                <h1 className="text-3xl sm:text-4xl font-semibold">{item.title}</h1>
                <Button
                  onClick={handleStartChat}
                  className="bg-foreground text-background hover:bg-foreground/90 flex-shrink-0 rounded-full px-6"
                >
                  Start Chat
                </Button>
              </div>

              {/* Subtitle */}
              <p className="text-muted-foreground text-lg mb-8">
                {item.prompt}
              </p>

              {/* Featured Card */}
              <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-50 dark:from-sky-900/30 dark:via-sky-800/20 dark:to-cyan-900/20 mb-8">
                <div className="p-6 sm:p-8 flex flex-col items-end min-h-[14rem]">
                  <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-sm">
                    <span className="text-foreground font-semibold">@NYSgpt</span>{' '}
                    <span className="text-muted-foreground">tell me about this {item.category.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed mb-10">
                The {item.title} is a New York State {item.category.toLowerCase()} that serves the public interest through its programs, services, and regulatory functions. Use NYSgpt to explore its mission, understand its organizational structure, review recent initiatives, and learn how it impacts communities across the state. Start a conversation to get detailed, AI-powered insights about this {item.category.toLowerCase()}'s operations and services.
              </p>

              {/* Sample Prompts */}
              <div className="mb-10">
                <h2 className="text-lg font-semibold mb-4">Sample prompts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    `What is the history and mission of the ${item.title}?`,
                    `What services does the ${item.title} provide to New Yorkers?`,
                    `What recent initiatives has the ${item.title} launched?`,
                  ].map((prompt, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}`)}
                      className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 text-left"
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {prompt}
                      </p>
                      <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-4 transition-all duration-200">
                        <div className="flex justify-end">
                          <div
                            className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                          >
                            <ArrowUp className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Information Section */}
              <div className="mb-10">
                <h2 className="text-lg font-semibold mb-4">Budget Information</h2>
                <div className="border rounded-xl divide-y">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">State</span>
                    <span className="text-sm font-medium">New York</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Level</span>
                    <span className="text-sm font-medium">State Government</span>
                  </div>
                  {budgetSummary && budgetSummary.totalApprops > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">Total Appropriations 2026-27</span>
                      <span className="text-sm font-medium">{formatCurrency(budgetSummary.totalApprops)}</span>
                    </div>
                  )}
                  {budgetSummary && budgetSummary.totalCapital > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">Total Capital 2026-27</span>
                      <span className="text-sm font-medium">{formatCurrency(budgetSummary.totalCapital)}</span>
                    </div>
                  )}
                  {budgetSummary && budgetSummary.totalSpending > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-muted-foreground">Total Spending Est. 2026-27</span>
                      <span className="text-sm font-medium">{formatCurrency(budgetSummary.totalSpending)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Carousels (when budget data exists) OR Related section */}
              {hasBudgetData ? (
                <>
                  {/* Appropriations Carousel */}
                  {appropriationsData && appropriationsData.length > 0 && (
                    <div className="mb-10">
                      <h2 className="text-lg font-semibold mb-4">Appropriations</h2>
                      <Carousel opts={{ align: "start" }} className="w-full">
                        <CarouselContent className="-ml-4">
                          {appropriationsData.map((row: any, idx: number) => {
                            const program = row['Program Name'] || 'General';
                            const amount = row['Appropriations Recommended 2026-27'];
                            const agency = reformatAgencyName(row['Agency Name'] || '');
                            const promptText = `Tell me about the NYS budget appropriation for ${agency} for "${program}"${amount ? ` with a recommended appropriation of ${formatBudgetAmount(amount)}` : ''}. What is this funding used for?`;
                            const chatParams = new URLSearchParams({ prompt: promptText, budgetAgency: row['Agency Name'] || '', budgetProgram: row['Program Name'] || '' });
                            return (
                              <CarouselItem key={idx} className="pl-4 sm:basis-1/2 md:basis-1/3">
                                <div
                                  className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 h-full"
                                  onClick={() => navigate(`/new-chat?${chatParams.toString()}`)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-sm line-clamp-2">{program}</h3>
                                    {amount && (
                                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 ml-2 whitespace-nowrap">
                                        {formatBudgetAmount(amount)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{promptText}</p>
                                  <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-200">
                                    <div className="flex justify-end">
                                      <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                                        <ArrowUp className="h-4 w-4" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            );
                          })}
                        </CarouselContent>
                        <div className="mt-4 flex justify-end gap-2">
                          <CarouselPrevious className="static translate-x-0 translate-y-0" />
                          <CarouselNext className="static translate-x-0 translate-y-0" />
                        </div>
                      </Carousel>
                    </div>
                  )}

                  {/* Capital Carousel */}
                  {capitalData && capitalData.length > 0 && (
                    <div className="mb-10">
                      <h2 className="text-lg font-semibold mb-4">Capital</h2>
                      <Carousel opts={{ align: "start" }} className="w-full">
                        <CarouselContent className="-ml-4">
                          {capitalData.map((row: any, idx: number) => {
                            const description = row['Description'] || row['Program Name'] || 'Capital Project';
                            const amount = row['Appropriations Recommended 2026-27'];
                            const agency = reformatAgencyName(row['Agency Name'] || '');
                            const promptText = `Tell me about the NYS capital appropriation for ${agency} described as "${description}"${amount ? ` with a recommended amount of ${formatBudgetAmount(amount)}` : ''}. What is this capital project about?`;
                            const chatParams = new URLSearchParams({ prompt: promptText, budgetAgency: row['Agency Name'] || '' });
                            return (
                              <CarouselItem key={idx} className="pl-4 sm:basis-1/2 md:basis-1/3">
                                <div
                                  className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 h-full"
                                  onClick={() => navigate(`/new-chat?${chatParams.toString()}`)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-sm line-clamp-2">{description}</h3>
                                    {amount && (
                                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 ml-2 whitespace-nowrap">
                                        {formatBudgetAmount(amount)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{promptText}</p>
                                  <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-200">
                                    <div className="flex justify-end">
                                      <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                                        <ArrowUp className="h-4 w-4" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            );
                          })}
                        </CarouselContent>
                        <div className="mt-4 flex justify-end gap-2">
                          <CarouselPrevious className="static translate-x-0 translate-y-0" />
                          <CarouselNext className="static translate-x-0 translate-y-0" />
                        </div>
                      </Carousel>
                    </div>
                  )}

                  {/* Spending Carousel */}
                  {spendingData && spendingData.length > 0 && (
                    <div className="mb-10">
                      <h2 className="text-lg font-semibold mb-4">Spending</h2>
                      <Carousel opts={{ align: "start" }} className="w-full">
                        <CarouselContent className="-ml-4">
                          {spendingData.map((row: any, idx: number) => {
                            const fn = row['Function'] || 'General';
                            const estimate = row['2026-27 Estimates'];
                            const agency = reformatAgencyName(row['Agency'] || '');
                            const promptText = `Tell me about NYS spending by ${agency} under the "${fn}" function${estimate ? ` with estimated spending of ${formatBudgetAmount(estimate)}` : ''}. How has this spending changed over recent years?`;
                            const chatParams = new URLSearchParams({ prompt: promptText, budgetAgency: row['Agency'] || '' });
                            return (
                              <CarouselItem key={idx} className="pl-4 sm:basis-1/2 md:basis-1/3">
                                <div
                                  className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 h-full"
                                  onClick={() => navigate(`/new-chat?${chatParams.toString()}`)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-sm line-clamp-2">{fn}</h3>
                                    {estimate && (
                                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 ml-2 whitespace-nowrap">
                                        {formatBudgetAmount(estimate)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{promptText}</p>
                                  <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-200">
                                    <div className="flex justify-end">
                                      <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                                        <ArrowUp className="h-4 w-4" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            );
                          })}
                        </CarouselContent>
                        <div className="mt-4 flex justify-end gap-2">
                          <CarouselPrevious className="static translate-x-0 translate-y-0" />
                          <CarouselNext className="static translate-x-0 translate-y-0" />
                        </div>
                      </Carousel>
                    </div>
                  )}
                </>
              ) : (
                /* Related — shown only when no budget data exists */
                related.length > 0 && (
                  <div className="mb-10">
                    <h2 className="text-lg font-semibold mb-4">Related</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {related.map((rel) => (
                        <div
                          key={rel.slug}
                          onClick={() => navigate(`/departments/${rel.slug}`)}
                          className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-5 cursor-pointer transition-all duration-200"
                        >
                          <h3 className="font-semibold text-sm">{rel.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rel.prompt}</p>
                          <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-200">
                            <div className="flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/new-chat?prompt=${encodeURIComponent(rel.prompt)}`);
                                }}
                                className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                                title="Ask AI"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
      </InsetPanel>
    </div>
  );
}
