import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, ArrowUp, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BudgetChatDrawer } from '@/components/BudgetChatDrawer';
import { DashboardDrawer } from '@/components/DashboardDrawer';
import {
  useBudgetDashboard,
  formatCompactCurrency,
  formatFullCurrency,
  type DashboardTab,
  type DashboardRow,
  type DrillDownRow,
  TAB_LABELS,
} from '@/hooks/useBudgetDashboard';
import { reformatAgencyName } from '@/hooks/useBudgetSearch';
import {
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const TABS: DashboardTab[] = ['function', 'fundType', 'fpCategory'];

const BudgetDashboard = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('function');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFunctionName, setChatFunctionName] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    isLoading,
    error,
    byFunction,
    byFundType,
    byFpCategory,
    grandTotal,
    priorGrandTotal,
    historicalTotals,
    primaryYear,
    getDrillDown,
    getHistoricalForGroup,
  } = useBudgetDashboard();

  // Get rows for the active tab
  const rows: DashboardRow[] = useMemo(() => {
    switch (activeTab) {
      case 'function': return byFunction;
      case 'fundType': return byFundType;
      case 'fpCategory': return byFpCategory;
    }
  }, [activeTab, byFunction, byFundType, byFpCategory]);

  // Toggle row: expand drill-down AND select for chart
  const toggleRow = (name: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
    // Also toggle chart selection
    setSelectedRow((prev) => (prev === name ? null : name));
  };

  // Reset expanded rows and chart selection when tab changes
  useEffect(() => {
    setExpandedRows(new Set());
    setSelectedRow(null);
  }, [activeTab]);

  // Chart data: either filtered for selected row or grand totals
  const chartData = useMemo(() => {
    if (selectedRow) {
      return getHistoricalForGroup(activeTab, selectedRow);
    }
    return historicalTotals;
  }, [selectedRow, activeTab, getHistoricalForGroup, historicalTotals]);

  // Selected row data for header display
  const selectedRowData = useMemo(() => {
    if (!selectedRow) return null;
    return rows.find((r) => r.name === selectedRow) || null;
  }, [selectedRow, rows]);

  // Grand total YoY change
  const grandTotalYoy = priorGrandTotal !== 0
    ? ((grandTotal - priorGrandTotal) / Math.abs(priorGrandTotal)) * 100
    : 0;

  // Primary year label (e.g. "2026-27")
  const primaryYearLabel = primaryYear.replace(/\s+(Actuals|Estimates)$/i, '');

  // Header values: show selected row's values when selected, otherwise grand totals
  const headerAmount = selectedRowData ? selectedRowData.amount : grandTotal;
  const headerYoy = selectedRowData ? selectedRowData.yoyChange : grandTotalYoy;

  // Open chat drawer scoped to a budget function/category
  const openChat = (functionNameForChat?: string | null) => {
    setChatFunctionName(functionNameForChat || null);
    setChatOpen(true);
  };

  // Chat click: open drawer with function context
  const handleChatClick = (row: DashboardRow) => {
    openChat(activeTab === 'function' ? row.name : null);
  };

  // Chat click for drill-down agency row — scoped to that agency
  const handleAgencyChatClick = (agency: DrillDownRow, parentName: string) => {
    openChat(activeTab === 'function' ? reformatAgencyName(agency.name) : null);
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
          <div className="flex-shrink-0 bg-background border-b">
            <div className="px-4 py-4 md:px-6">
              {/* Top row: sidebar + title left, amount right */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
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

                {/* Amount + YoY — top right */}
                {!isLoading && !error && (
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openChat()}
                        className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:bg-foreground/80 transition-colors flex-shrink-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <span className="text-3xl md:text-4xl font-bold tracking-tight transition-all duration-300">
                        {formatCompactCurrency(headerAmount)}
                      </span>
                      {selectedRow && (
                        <button
                          onClick={() => setSelectedRow(null)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm",
                      headerYoy > 0 ? "text-green-600 dark:text-green-400" :
                      headerYoy < 0 ? "text-red-600 dark:text-red-400" :
                      "text-muted-foreground"
                    )}>
                      {headerYoy >= 0 ? '+' : ''}{headerYoy.toFixed(1)}% from prior year
                    </span>
                  </div>
                )}

                <MobileNYSgpt />
              </div>

              {/* Mini Historical Chart */}
              {!isLoading && chartData.length > 1 && (
                <div className="h-24 md:h-28 mb-4 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <defs>
                        <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(217 91% 60%)"
                        strokeWidth={1.5}
                        fill="url(#budgetGradient)"
                        dot={false}
                        animationDuration={500}
                      />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tickFormatter={(value) => {
                          // Show just the ending year: "2026-27" → "2027"
                          const parts = value.split('-');
                          return parts.length === 2 ? `'${parts[1]}` : value;
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [formatFullCurrency(value), selectedRow || 'Total']}
                        labelFormatter={(label) => `FY ${label} Enacted Budget`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Dashboards picker + Tabs */}
              <div className="flex items-center gap-3">
                <DashboardDrawer />
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      activeTab === tab
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="text-center py-12 px-4">
                <p className="text-destructive">Error loading budget data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="px-4 md:px-6 py-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-muted-foreground">No budget records found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {/* Column headers */}
                  <div className="hidden md:grid grid-cols-[1fr_44px_120px_100px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                    <span>Name</span>
                    <span className="flex items-center justify-center">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-right">{primaryYearLabel.split('-')[1] ? `'${primaryYearLabel.split('-')[1]}` : primaryYearLabel}</span>
                    <span className="text-right">Change</span>
                    <span className="text-right">Share</span>
                  </div>

                  {(isAuthenticated ? rows : rows.slice(0, 6)).map((row) => (
                    <DashboardRowItem
                      key={row.name}
                      row={row}
                      isExpanded={expandedRows.has(row.name)}
                      isSelected={selectedRow === row.name}
                      hasSelection={selectedRow !== null}
                      onToggle={() => toggleRow(row.name)}
                      onChatClick={() => handleChatClick(row)}
                      tab={activeTab}
                      getDrillDown={getDrillDown}
                      onAgencyChatClick={(agency) => handleAgencyChatClick(agency, row.name)}
                      primaryYearLabel={primaryYearLabel}
                    />
                  ))}

                  {/* Grand total row */}
                  <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_100px_80px] gap-4 px-4 md:px-6 py-4 bg-muted/30 font-semibold">
                    <span>Total</span>
                    <span className="hidden md:block" />
                    <span className="text-right">{formatCompactCurrency(grandTotal)}</span>
                    <span className={cn(
                      "hidden md:block text-right",
                      grandTotalYoy > 0 ? "text-green-600 dark:text-green-400" :
                      grandTotalYoy < 0 ? "text-red-600 dark:text-red-400" :
                      "text-muted-foreground"
                    )}>
                      {grandTotalYoy >= 0 ? '+' : ''}{grandTotalYoy.toFixed(1)}%
                    </span>
                    <span className="hidden md:block text-right">100%</span>
                  </div>
                </div>
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

      {/* Budget Chat Drawer */}
      <BudgetChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        functionName={chatFunctionName}
      />
    </div>
  );
};

// ── Dashboard Row Component ───────────────────────────────────────

interface DashboardRowItemProps {
  row: DashboardRow;
  isExpanded: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  tab: DashboardTab;
  getDrillDown: (tab: DashboardTab, groupValue: string) => DrillDownRow[];
  onAgencyChatClick: (agency: DrillDownRow) => void;
  primaryYearLabel: string;
}

function DashboardRowItem({
  row,
  isExpanded,
  isSelected,
  hasSelection,
  onToggle,
  onChatClick,
  tab,
  getDrillDown,
  onAgencyChatClick,
  primaryYearLabel,
}: DashboardRowItemProps) {
  const drillDownRows = isExpanded ? getDrillDown(tab, row.name) : [];

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div>
      {/* Main row */}
      <div
        onClick={onToggle}
        className={cn(
          "group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_100px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer transition-all duration-200 items-center",
          isSelected
            ? "bg-muted/50"
            : hasSelection
              ? "opacity-50 hover:opacity-100 hover:bg-muted/30"
              : "hover:bg-muted/30"
        )}
      >
        {/* Name with expand chevron */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "flex-shrink-0 transition-colors",
            isSelected ? "text-foreground" : "text-muted-foreground"
          )}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
          <span className={cn(
            "font-medium truncate transition-colors",
            isSelected && "text-foreground"
          )}>
            {row.name}
          </span>
          {isSelected && (
            <span className="hidden md:inline-flex h-1.5 w-1.5 rounded-full bg-foreground flex-shrink-0" />
          )}
          {/* Mobile: show amount inline */}
          <span className="md:hidden text-sm text-muted-foreground ml-auto pl-2 whitespace-nowrap">
            {formatCompactCurrency(row.amount)}
          </span>
        </div>

        {/* Chat button column (desktop) */}
        <div className="hidden md:flex justify-center">
          <button
            onClick={handleChatClick}
            className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop columns */}
        <span className="hidden md:block text-right font-medium tabular-nums">
          {formatCompactCurrency(row.amount)}
        </span>
        <span className={cn(
          "hidden md:block text-right text-sm tabular-nums",
          row.yoyChange > 0 ? "text-green-600 dark:text-green-400" :
          row.yoyChange < 0 ? "text-red-600 dark:text-red-400" :
          "text-muted-foreground"
        )}>
          {row.yoyChange >= 0 ? '+' : ''}{row.yoyChange.toFixed(1)}%
        </span>

        {/* Percentage bar */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/60 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(row.pctOfTotal, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
            {row.pctOfTotal.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Mobile supplementary info */}
      <div className={cn(
        "md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10 transition-opacity duration-200",
        hasSelection && !isSelected && "opacity-50"
      )}>
        <span className={cn(
          row.yoyChange > 0 ? "text-green-600 dark:text-green-400" :
          row.yoyChange < 0 ? "text-red-600 dark:text-red-400" :
          ""
        )}>
          {row.yoyChange >= 0 ? '+' : ''}{row.yoyChange.toFixed(1)}%
        </span>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[120px]">
          <div
            className="h-full bg-foreground/60 rounded-full"
            style={{ width: `${Math.min(row.pctOfTotal, 100)}%` }}
          />
        </div>
        <span>{row.pctOfTotal.toFixed(0)}%</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drill-down rows */}
      {isExpanded && drillDownRows.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {drillDownRows.map((agency) => (
            <AgencyRow
              key={agency.name}
              agency={agency}
              onChatClick={() => onAgencyChatClick(agency)}
              primaryYearLabel={primaryYearLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agency Drill-Down Row ─────────────────────────────────────────

interface AgencyRowProps {
  agency: DrillDownRow;
  onChatClick: () => void;
  primaryYearLabel: string;
}

function AgencyRow({ agency, onChatClick, primaryYearLabel }: AgencyRowProps) {
  const displayName = reformatAgencyName(agency.name);

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[1fr_44px_120px_100px_80px] gap-4 px-6 py-3 pl-14 hover:bg-muted/20 transition-colors items-center group">
        <span className="text-sm truncate">{displayName}</span>
        <div className="flex justify-center">
          <button
            onClick={handleChatClick}
            className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-right text-sm tabular-nums">
          {formatCompactCurrency(agency.amount)}
        </span>
        <span className={cn(
          "text-right text-sm tabular-nums",
          agency.yoyChange > 0 ? "text-green-600 dark:text-green-400" :
          agency.yoyChange < 0 ? "text-red-600 dark:text-red-400" :
          "text-muted-foreground"
        )}>
          {agency.yoyChange >= 0 ? '+' : ''}{agency.yoyChange.toFixed(1)}%
        </span>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/40 rounded-full"
              style={{ width: `${Math.min(agency.pctOfParent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
            {agency.pctOfParent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 py-3 pl-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm truncate flex-1 min-w-0">{displayName}</span>
          <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
            {formatCompactCurrency(agency.amount)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn(
            agency.yoyChange > 0 ? "text-green-600 dark:text-green-400" :
            agency.yoyChange < 0 ? "text-red-600 dark:text-red-400" :
            ""
          )}>
            {agency.yoyChange >= 0 ? '+' : ''}{agency.yoyChange.toFixed(1)}%
          </span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[100px]">
            <div
              className="h-full bg-foreground/40 rounded-full"
              style={{ width: `${Math.min(agency.pctOfParent, 100)}%` }}
            />
          </div>
          <button
            onClick={handleChatClick}
            className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  );
}

export default BudgetDashboard;
