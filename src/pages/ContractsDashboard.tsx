import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, ChevronDown, ArrowUp, MessageSquare, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ContractsChatDrawer } from '@/components/ContractsChatDrawer';
import { DashboardDrawer } from '@/components/DashboardDrawer';
import {
  useContractsDashboard,
  formatCompactCurrency,
  formatFullCurrency,
  type ContractsDashboardTab,
  type ContractsDashboardRow,
  type ContractsDrillDownRow,
  type ContractsYearRow,
  type ContractsVendorRow,
  type ContractsDurationBucket,
  type ContractsExpirationBucket,
  type ContractsExpirationDrillRow,
  type ContractsSpendBucket,
  type ContractsSpendDrillRow,
  type ContractsMonthDrillRow,
  type ContractsVendorDrillRow,
  type ContractsDurationDrillRow,
  TAB_LABELS,
} from '@/hooks/useContractsDashboard';
import {
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from 'recharts';

const TABS: ContractsDashboardTab[] = ['department', 'type'];

const CHART_LABELS = ['Contract Value', 'By Start Date', 'Top Vendors', 'Duration', 'Expiring', 'Spend Rate'];
const NUM_CHART_MODES = CHART_LABELS.length;

const CONTRACTS_SLUG_TO_MODE: Record<string, number> = { 'by-month': 1, 'by-top-vendors': 2, 'by-duration': 3, 'by-expiration': 4, 'by-spend': 5 };

const ContractsDashboard = () => {
  const navigate = useNavigate();
  const { subChart } = useParams<{ subChart?: string }>();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ContractsDashboardTab>('department');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(25);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDepartmentName, setChatDepartmentName] = useState<string | null>(null);
  const [chatContractTypeName, setChatContractTypeName] = useState<string | null>(null);
  const [chatVendorName, setChatVendorName] = useState<string | null>(null);
  const [chatDataContext, setChatDataContext] = useState<string | null>(null);
  const [chatDrillName, setChatDrillName] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState(() => {
    const m = subChart ? (CONTRACTS_SLUG_TO_MODE[subChart] ?? 0) : 0;
    return m >= 0 && m < NUM_CHART_MODES ? m : 0;
  });

  // Sync URL subChart param → chartMode (useState initializer only runs on mount)
  useEffect(() => {
    const m = subChart ? (CONTRACTS_SLUG_TO_MODE[subChart] ?? 0) : 0;
    setChartMode(m >= 0 && m < NUM_CHART_MODES ? m : 0);
  }, [subChart]);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    isLoading,
    error,
    byDepartment,
    byType,
    grandTotal,
    totalContracts,
    getDrillDown,
    historicalTotals,
    getHistoricalForGroup,
    monthlyData,
    topVendors,
    durationBuckets,
    expirationBuckets,
    spendBuckets,
    byYear,
    getMonthsForYear,
    getContractsForVendor,
    getContractsForDurationBucket,
    getContractsForExpirationBucket,
    getContractsForSpendBucket,
  } = useContractsDashboard();

  // Get rows for the active tab
  const rows: ContractsDashboardRow[] = useMemo(() => {
    switch (activeTab) {
      case 'department': return byDepartment;
      case 'type': return byType;
    }
  }, [activeTab, byDepartment, byType]);

  // Total contract count for displayed rows
  const displayedTotalContracts = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.contractCount, 0);
  }, [rows]);

  // Toggle row: expand drill-down AND select
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
    setSelectedRow((prev) => (prev === name ? null : name));
  };

  // Reset expanded rows and display count when tab or chart mode changes
  useEffect(() => {
    setExpandedRows(new Set());
    setSelectedRow(null);
    setDisplayCount(25);
  }, [activeTab, chartMode]);

  // Selected row data for header display
  const selectedRowData = useMemo(() => {
    if (!selectedRow) return null;
    return rows.find((r) => r.name === selectedRow) || null;
  }, [selectedRow, rows]);

  // Chart data: either filtered for selected row or grand totals
  const chartData = useMemo(() => {
    if (selectedRow) {
      return getHistoricalForGroup(activeTab, selectedRow);
    }
    return historicalTotals;
  }, [selectedRow, activeTab, getHistoricalForGroup, historicalTotals]);

  // Header values
  const headerAmount = selectedRowData ? selectedRowData.amount : grandTotal;

  // Build data context string from available data
  const buildDataContext = (opts: {
    departmentName?: string | null;
    contractTypeName?: string | null;
    vendorName?: string | null;
    row?: ContractsDashboardRow | null;
  }): string => {
    const lines: string[] = [];

    if (opts.vendorName) {
      const vendor = topVendors.find(v => v.name === opts.vendorName);
      if (vendor) {
        lines.push(`Vendor: ${vendor.name}`);
        lines.push(`Total Contract Value: $${(vendor.amount / 1e9).toFixed(1)}B (${vendor.amount.toLocaleString()})`);
        lines.push(`Number of Contracts: ${vendor.contractCount}`);
      }
      const contracts = getContractsForVendor(opts.vendorName);
      if (contracts.length > 0) {
        lines.push('');
        lines.push('Individual Contracts:');
        contracts.forEach(c => {
          const amt = c.amount >= 1e9 ? `$${(c.amount / 1e9).toFixed(1)}B` : c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
          lines.push(`- ${c.name} (${c.contractNumber}): ${amt}, started ${c.startDate?.slice(0, 10) || 'N/A'}${c.endDate ? `, ends ${c.endDate.slice(0, 10)}` : ''}`);
        });
      }
    }

    if (opts.row) {
      lines.push(`Name: ${opts.row.name}`);
      const amt = opts.row.amount >= 1e9 ? `$${(opts.row.amount / 1e9).toFixed(1)}B` : `$${(opts.row.amount / 1e6).toFixed(1)}M`;
      lines.push(`Total Contract Value: ${amt} (${opts.row.amount.toLocaleString()})`);
      lines.push(`Number of Contracts: ${opts.row.contractCount}`);
      lines.push(`Share of Total: ${opts.row.pctOfTotal.toFixed(1)}%`);

      const tab = opts.departmentName ? 'department' : 'type';
      const drillDown = getDrillDown(tab as ContractsDashboardTab, opts.row.name);
      if (drillDown.length > 0) {
        lines.push('');
        lines.push('Top Contracts:');
        drillDown.slice(0, 15).forEach(c => {
          const cAmt = c.amount >= 1e9 ? `$${(c.amount / 1e9).toFixed(1)}B` : c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
          lines.push(`- ${c.name}${c.contractNumber ? ` (${c.contractNumber})` : ''}: ${cAmt} (${c.pctOfParent.toFixed(1)}% of category)`);
        });
      }
    }

    if (!opts.vendorName && !opts.row) {
      lines.push(`Total Contract Value: ${formatCompactCurrency(grandTotal)}`);
      lines.push(`Total Contracts: ${totalContracts.toLocaleString()}`);
      lines.push('');
      lines.push('Top Vendors:');
      topVendors.slice(0, 10).forEach(v => {
        lines.push(`- ${v.name}: ${formatCompactCurrency(v.amount)} (${v.contractCount} contracts)`);
      });
      lines.push('');
      lines.push('By Department:');
      byDepartment.slice(0, 10).forEach(d => {
        lines.push(`- ${d.name}: ${formatCompactCurrency(d.amount)} (${d.contractCount} contracts, ${d.pctOfTotal.toFixed(1)}%)`);
      });
    }

    return lines.join('\n');
  };

  // Open chat drawer
  const openChat = (departmentName?: string | null, contractTypeName?: string | null, vendorName?: string | null, dataCtx?: string | null, drillName?: string | null) => {
    setChatDepartmentName(departmentName || null);
    setChatContractTypeName(contractTypeName || null);
    setChatVendorName(vendorName || null);
    setChatDrillName(drillName || null);

    if (dataCtx) {
      setChatDataContext(dataCtx);
    } else {
      const row = departmentName
        ? byDepartment.find(r => r.name === departmentName) || null
        : contractTypeName
          ? byType.find(r => r.name === contractTypeName) || null
          : null;

      setChatDataContext(buildDataContext({ departmentName, contractTypeName, vendorName, row }));
    }
    setChatOpen(true);
  };

  // Chat click for main row
  const handleChatClick = (row: ContractsDashboardRow) => {
    if (activeTab === 'department') {
      openChat(row.name, null);
    } else {
      openChat(null, row.name);
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

                {/* Amount — top right */}
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
                    <span className="text-sm text-muted-foreground">
                      {selectedRow
                        ? `${selectedRowData?.pctOfTotal.toFixed(1)}% of total`
                        : 'Total Contract Value'}
                    </span>
                  </div>
                )}

                <MobileNYSgpt />
              </div>

              {/* Chart area */}
              {!isLoading && (
                <div className="h-24 md:h-28 mb-4 -mx-2">
                  {/* Mode 0: Cumulative contract value (existing) */}
                  {chartMode === 0 && chartData.length > 1 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                        <defs>
                          <linearGradient id="contractsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="total" stroke="hsl(217 91% 60%)" strokeWidth={1.5} fill="url(#contractsGradient)" dot={false} animationDuration={500} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={(value) => `'${value.slice(-2)}`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [formatFullCurrency(value), selectedRow || 'Cumulative']}
                          labelFormatter={(label) => `Contracts starting ${label}`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {/* Mode 1: Monthly contracts line chart */}
                  {chartMode === 1 && monthlyData.length > 1 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                        <defs>
                          <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="count" stroke="hsl(142 76% 36%)" strokeWidth={1.5} fill="url(#monthlyGradient)" dot={false} animationDuration={500} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={(v) => v.slice(2, 7)} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number, name: string) => [name === 'count' ? `${value} contracts` : formatFullCurrency(value), name === 'count' ? 'New Contracts' : 'Amount']}
                          labelFormatter={(label) => label}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {/* Mode 2: Top vendors bar chart */}
                  {chartMode === 2 && topVendors.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topVendors.slice(0, 20)} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                        <Bar dataKey="amount" fill="hsl(32 95% 50%)" radius={[2, 2, 0, 0]} animationDuration={500} />
                        <XAxis dataKey="name" hide />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [formatFullCurrency(value), 'Total Value']}
                          labelFormatter={(label) => label}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Mode 3: Duration buckets bar chart */}
                  {chartMode === 3 && durationBuckets.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={durationBuckets} margin={{ top: 4, right: 8, bottom: 16, left: 8 }}>
                        <Bar dataKey="count" fill="hsl(280 67% 55%)" radius={[2, 2, 0, 0]} animationDuration={500} />
                        <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number, name: string) => [name === 'count' ? `${value} contracts` : formatFullCurrency(value), name === 'count' ? 'Contracts' : 'Total Value']}
                          labelFormatter={(label) => label}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Mode 4: Expiration buckets bar chart */}
                  {chartMode === 4 && expirationBuckets.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expirationBuckets} margin={{ top: 4, right: 8, bottom: 16, left: 8 }}>
                        <Bar dataKey="count" fill="hsl(0 84% 60%)" radius={[2, 2, 0, 0]} animationDuration={500} />
                        <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number, name: string) => [name === 'count' ? `${value} contracts` : formatFullCurrency(value), name === 'count' ? 'Contracts' : 'Total Value']}
                          labelFormatter={(label) => label}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Mode 5: Spend utilization bar chart */}
                  {chartMode === 5 && spendBuckets.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendBuckets} margin={{ top: 4, right: 8, bottom: 16, left: 8 }}>
                        <Bar dataKey="count" fill="hsl(180 60% 45%)" radius={[2, 2, 0, 0]} animationDuration={500} />
                        <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number, name: string) => [name === 'count' ? `${value} contracts` : formatFullCurrency(value), name === 'count' ? 'Contracts' : 'Total Value']}
                          labelFormatter={(label) => label}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* Dashboards picker + Tabs + Chart mode toggle */}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartMode((prev) => (prev - 1 + NUM_CHART_MODES) % NUM_CHART_MODES)}
                    className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[100px] text-center">
                    {CHART_LABELS[chartMode]}
                  </span>
                  <button
                    onClick={() => setChartMode((prev) => (prev + 1) % NUM_CHART_MODES)}
                    className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="text-center py-12 px-4">
                <p className="text-destructive">Error loading contracts data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="px-4 md:px-6 py-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : chartMode === 0 ? (
              /* ── Mode 0: Department/Type table (existing) ── */
              rows.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground">No contract records found.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y">
                    <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                      <span>Name</span>
                      <span className="flex items-center justify-center">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Contracts</span>
                      <span className="text-right">Share</span>
                    </div>
                    {(isAuthenticated ? rows.slice(0, displayCount) : rows.slice(0, 6)).map((row) => (
                      <ContractRowItem
                        key={row.name}
                        row={row}
                        isExpanded={expandedRows.has(row.name)}
                        isSelected={selectedRow === row.name}
                        hasSelection={selectedRow !== null}
                        onToggle={() => toggleRow(row.name)}
                        onChatClick={() => handleChatClick(row)}
                        onDrillChatClick={(contract) => {
                          const amt = contract.amount >= 1e9 ? `$${(contract.amount / 1e9).toFixed(1)}B` : contract.amount >= 1e6 ? `$${(contract.amount / 1e6).toFixed(1)}M` : `$${contract.amount.toLocaleString()}`;
                          const ctx = [
                            `Contract: ${contract.name}`,
                            contract.contractNumber ? `Contract Number: ${contract.contractNumber}` : '',
                            `Amount: ${amt}`,
                            `Share of ${row.name}: ${contract.pctOfParent.toFixed(1)}%`,
                            '',
                            `Parent Category: ${row.name}`,
                            `Parent Total: ${formatCompactCurrency(row.amount)} (${row.contractCount} contracts, ${row.pctOfTotal.toFixed(1)}% of grand total)`,
                          ].filter(Boolean).join('\n');
                          const dept = activeTab === 'department' ? row.name : null;
                          const type = activeTab === 'type' ? row.name : null;
                          openChat(dept, type, null, ctx, contract.name);
                        }}
                        tab={activeTab}
                        getDrillDown={getDrillDown}
                      />
                    ))}
                    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px_80px] gap-4 px-4 md:px-6 py-4 bg-muted/30 font-semibold">
                      <span>Total</span>
                      <span className="hidden md:block" />
                      <span className="text-right">{formatCompactCurrency(grandTotal)}</span>
                      <span className="hidden md:block text-right">{displayedTotalContracts.toLocaleString()}</span>
                      <span className="hidden md:block text-right">100%</span>
                    </div>
                  </div>
                  {!isAuthenticated && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Please log in to view all contract records.</p>
                      <Button variant="ghost" onClick={() => navigate('/auth-4')} className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">Sign Up</Button>
                    </div>
                  )}
                  {isAuthenticated && displayCount < rows.length && (
                    <div className="flex justify-center py-6">
                      <button onClick={() => setDisplayCount((prev) => prev + 50)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        Load More ({Math.min(displayCount, rows.length)} of {rows.length})
                      </button>
                    </div>
                  )}
                </>
              )
            ) : chartMode === 1 ? (
              /* ── Mode 1: Years table with month drill-down ── */
              <div className="divide-y">
                <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                  <span>Year</span>
                  <span className="flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Contracts</span>
                </div>
                {byYear.map((yr) => (
                  <YearRowItem
                    key={yr.year}
                    row={yr}
                    isExpanded={expandedRows.has(yr.year)}
                    onToggle={() => toggleRow(yr.year)}
                    onChatClick={() => {
                      const months = getMonthsForYear(yr.year);
                      const ctx = [
                        `Year: ${yr.year}`,
                        `Total Contract Value: ${formatCompactCurrency(yr.amount)}`,
                        `Number of Contracts: ${yr.count}`,
                        '',
                        'Monthly Breakdown:',
                        ...months.map(m => `- ${m.monthName} ${yr.year}: ${formatCompactCurrency(m.amount)} (${m.count} contracts)`),
                      ].join('\n');
                      openChat(null, null, null, ctx);
                    }}
                    onMonthChatClick={(m) => {
                      const ctx = [
                        `Month: ${m.monthName} ${yr.year}`,
                        `Contract Value: ${formatCompactCurrency(m.amount)}`,
                        `Number of Contracts: ${m.count}`,
                        '',
                        `Parent Year: ${yr.year}`,
                        `Year Total: ${formatCompactCurrency(yr.amount)} (${yr.count} contracts)`,
                      ].join('\n');
                      openChat(null, null, null, ctx, `${m.monthName} ${yr.year}`);
                    }}
                    getMonthsForYear={getMonthsForYear}
                  />
                ))}
              </div>
            ) : chartMode === 2 ? (
              /* ── Mode 2: Vendors table with contract drill-down ── */
              <div className="divide-y">
                <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                  <span>Vendor</span>
                  <span className="flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Contracts</span>
                </div>
                {topVendors.map((vendor) => (
                  <VendorRowItem
                    key={vendor.name}
                    row={vendor}
                    isExpanded={expandedRows.has(vendor.name)}
                    onToggle={() => toggleRow(vendor.name)}
                    onChatClick={() => openChat(null, null, vendor.name)}
                    onDrillChatClick={(c) => {
                      const amt = c.amount >= 1e9 ? `$${(c.amount / 1e9).toFixed(1)}B` : c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                      const ctx = [
                        `Contract: ${c.name}`,
                        c.contractNumber ? `Contract Number: ${c.contractNumber}` : '',
                        `Amount: ${amt}`,
                        c.startDate ? `Start Date: ${c.startDate.slice(0, 10)}` : '',
                        c.endDate ? `End Date: ${c.endDate.slice(0, 10)}` : '',
                        '',
                        `Vendor: ${vendor.name}`,
                        `Vendor Total: ${formatCompactCurrency(vendor.amount)} (${vendor.contractCount} contracts)`,
                      ].filter(Boolean).join('\n');
                      openChat(null, null, vendor.name, ctx, c.name);
                    }}
                    getContractsForVendor={getContractsForVendor}
                  />
                ))}
              </div>
            ) : chartMode === 3 ? (
              /* ── Mode 3: Duration buckets table ── */
              <div className="divide-y">
                <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                  <span>Duration</span>
                  <span className="flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Contracts</span>
                </div>
                {durationBuckets.map((bucket) => (
                  <DurationRowItem
                    key={bucket.bucket}
                    row={bucket}
                    isExpanded={expandedRows.has(bucket.bucket)}
                    onToggle={() => toggleRow(bucket.bucket)}
                    onChatClick={() => {
                      const contracts = getContractsForDurationBucket(bucket.bucket);
                      const ctx = [
                        `Duration Bucket: ${bucket.bucket}`,
                        `Total Contract Value: ${formatCompactCurrency(bucket.amount)}`,
                        `Number of Contracts: ${bucket.count}`,
                        '',
                        'Sample Contracts:',
                        ...contracts.slice(0, 15).map(c => {
                          const amt = c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                          return `- ${c.vendorName}${c.contractNumber ? ` (${c.contractNumber})` : ''}: ${amt}, ${Math.round(c.durationDays / 365 * 10) / 10} years`;
                        }),
                      ].join('\n');
                      openChat(null, null, null, ctx);
                    }}
                    onDrillChatClick={(c) => {
                      const amt = c.amount >= 1e9 ? `$${(c.amount / 1e9).toFixed(1)}B` : c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                      const ctx = [
                        `Vendor: ${c.vendorName}`,
                        c.contractNumber ? `Contract Number: ${c.contractNumber}` : '',
                        `Amount: ${amt}`,
                        `Duration: ${Math.round(c.durationDays / 365 * 10) / 10} years (${c.durationDays} days)`,
                        '',
                        `Duration Bucket: ${bucket.bucket}`,
                        `Bucket Total: ${formatCompactCurrency(bucket.amount)} (${bucket.count} contracts)`,
                      ].filter(Boolean).join('\n');
                      openChat(null, null, null, ctx, c.vendorName);
                    }}
                    getContractsForDurationBucket={getContractsForDurationBucket}
                  />
                ))}
              </div>
            ) : chartMode === 4 ? (
              /* ── Mode 4: Expiration buckets table ── */
              <div className="divide-y">
                <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                  <span>Expiration</span>
                  <span className="flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Contracts</span>
                </div>
                {expirationBuckets.map((bucket) => (
                  <ExpirationRowItem
                    key={bucket.bucket}
                    row={bucket}
                    isExpanded={expandedRows.has(bucket.bucket)}
                    onToggle={() => toggleRow(bucket.bucket)}
                    onChatClick={() => {
                      const contracts = getContractsForExpirationBucket(bucket.bucket);
                      const ctx = [
                        `Expiration Bucket: ${bucket.bucket}`,
                        `Total Contract Value: ${formatCompactCurrency(bucket.amount)}`,
                        `Number of Contracts: ${bucket.count}`,
                        '',
                        'Sample Contracts:',
                        ...contracts.slice(0, 15).map(c => {
                          const amt = c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                          return `- ${c.vendorName}${c.contractNumber ? ` (${c.contractNumber})` : ''}: ${amt}, ${c.department}, ends ${c.endDate?.slice(0, 10) || 'N/A'} (${c.daysUntilExpiry} days)`;
                        }),
                      ].join('\n');
                      openChat(null, null, null, ctx);
                    }}
                    onDrillChatClick={(c) => {
                      const amt = c.amount >= 1e9 ? `$${(c.amount / 1e9).toFixed(1)}B` : c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                      const ctx = [
                        `Vendor: ${c.vendorName}`,
                        c.contractNumber ? `Contract Number: ${c.contractNumber}` : '',
                        `Amount: ${amt}`,
                        `Department: ${c.department}`,
                        `End Date: ${c.endDate?.slice(0, 10) || 'N/A'}`,
                        `Days Until Expiry: ${c.daysUntilExpiry}`,
                        '',
                        `Expiration Bucket: ${bucket.bucket}`,
                        `Bucket Total: ${formatCompactCurrency(bucket.amount)} (${bucket.count} contracts)`,
                      ].filter(Boolean).join('\n');
                      openChat(null, null, null, ctx, c.vendorName);
                    }}
                    getContractsForExpirationBucket={getContractsForExpirationBucket}
                  />
                ))}
              </div>
            ) : chartMode === 5 ? (
              /* ── Mode 5: Spend utilization table ── */
              <div className="divide-y">
                <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                  <span>Spend Rate</span>
                  <span className="flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Contracts</span>
                </div>
                {spendBuckets.map((bucket) => (
                  <SpendRowItem
                    key={bucket.bucket}
                    row={bucket}
                    isExpanded={expandedRows.has(bucket.bucket)}
                    onToggle={() => toggleRow(bucket.bucket)}
                    onChatClick={() => {
                      const contracts = getContractsForSpendBucket(bucket.bucket);
                      const ctx = [
                        `Spend Utilization Bucket: ${bucket.bucket}`,
                        `Total Contract Value: ${formatCompactCurrency(bucket.amount)}`,
                        `Number of Contracts: ${bucket.count}`,
                        '',
                        'Sample Contracts:',
                        ...contracts.slice(0, 15).map(c => {
                          const amt = c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                          return `- ${c.vendorName}${c.contractNumber ? ` (${c.contractNumber})` : ''}: ${amt}, spent ${formatCompactCurrency(c.spending)} (${c.spendPct.toFixed(1)}%)`;
                        }),
                      ].join('\n');
                      openChat(null, null, null, ctx);
                    }}
                    onDrillChatClick={(c) => {
                      const amt = c.amount >= 1e9 ? `$${(c.amount / 1e9).toFixed(1)}B` : c.amount >= 1e6 ? `$${(c.amount / 1e6).toFixed(1)}M` : `$${c.amount.toLocaleString()}`;
                      const ctx = [
                        `Vendor: ${c.vendorName}`,
                        c.contractNumber ? `Contract Number: ${c.contractNumber}` : '',
                        `Contract Amount: ${amt}`,
                        `Spending to Date: ${formatCompactCurrency(c.spending)}`,
                        `Spend Rate: ${c.spendPct.toFixed(1)}%`,
                        '',
                        `Spend Bucket: ${bucket.bucket}`,
                        `Bucket Total: ${formatCompactCurrency(bucket.amount)} (${bucket.count} contracts)`,
                      ].filter(Boolean).join('\n');
                      openChat(null, null, null, ctx, c.vendorName);
                    }}
                    getContractsForSpendBucket={getContractsForSpendBucket}
                  />
                ))}
              </div>
            ) : null}
          </div>
      </InsetPanel>

      {/* Contracts Chat Drawer */}
      <ContractsChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        departmentName={chatDepartmentName}
        contractTypeName={chatContractTypeName}
        vendorName={chatVendorName}
        dataContext={chatDataContext}
        drillName={chatDrillName}
      />
    </div>
  );
};

// ── Contract Row Component ───────────────────────────────────────

interface ContractRowItemProps {
  row: ContractsDashboardRow;
  isExpanded: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (contract: ContractsDrillDownRow) => void;
  tab: ContractsDashboardTab;
  getDrillDown: (tab: ContractsDashboardTab, groupValue: string) => ContractsDrillDownRow[];
}

function ContractRowItem({
  row,
  isExpanded,
  isSelected,
  hasSelection,
  onToggle,
  onChatClick,
  onDrillChatClick,
  tab,
  getDrillDown,
}: ContractRowItemProps) {
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
          "group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer transition-all duration-200 items-center",
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
          {/* Contract count badge */}
          <span className="hidden md:inline-flex text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {row.contractCount} contracts
          </span>
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
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">
          {row.contractCount.toLocaleString()}
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
        <span>{row.contractCount} contracts</span>
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
          {drillDownRows.slice(0, 10).map((contract, idx) => (
            <ContractDrillRow
              key={`${contract.contractNumber}-${idx}`}
              contract={contract}
              onChatClick={() => onDrillChatClick(contract)}
            />
          ))}
          {drillDownRows.length > 10 && (
            <div className="px-6 py-2 text-xs text-muted-foreground text-center">
              + {drillDownRows.length - 10} more contracts
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Contract Drill-Down Row ─────────────────────────────────────────

interface ContractDrillRowProps {
  contract: ContractsDrillDownRow;
  onChatClick: () => void;
}

function ContractDrillRow({ contract, onChatClick }: ContractDrillRowProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (contract.contractNumber) {
      navigate(`/contracts/${contract.contractNumber}`);
    }
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <>
      {/* Desktop */}
      <div
        onClick={handleClick}
        className={cn(
          "hidden md:grid grid-cols-[1fr_44px_120px_80px_80px] gap-4 px-6 py-3 pl-14 hover:bg-muted/20 transition-colors items-center group",
          contract.contractNumber && "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate">{contract.name}</span>
          {contract.contractNumber && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
              {contract.contractNumber}
            </span>
          )}
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleChatClick}
            className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-right text-sm tabular-nums">
          {formatCompactCurrency(contract.amount)}
        </span>
        <span className="text-right text-sm text-muted-foreground">—</span>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/40 rounded-full"
              style={{ width: `${Math.min(contract.pctOfParent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
            {contract.pctOfParent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div
        onClick={handleClick}
        className={cn(
          "md:hidden px-4 py-3 pl-10",
          contract.contractNumber && "cursor-pointer"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm truncate">{contract.name}</span>
            {contract.contractNumber && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                {contract.contractNumber}
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
            {formatCompactCurrency(contract.amount)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[100px]">
            <div
              className="h-full bg-foreground/40 rounded-full"
              style={{ width: `${Math.min(contract.pctOfParent, 100)}%` }}
            />
          </div>
          <span>{contract.pctOfParent.toFixed(0)}%</span>
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

// ── Year Row (Mode 1) ────────────────────────────────────────────

function YearRowItem({
  row,
  isExpanded,
  onToggle,
  onChatClick,
  onMonthChatClick,
  getMonthsForYear,
}: {
  row: ContractsYearRow;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onMonthChatClick: (month: ContractsMonthDrillRow) => void;
  getMonthsForYear: (year: string) => ContractsMonthDrillRow[];
}) {
  const months = isExpanded ? getMonthsForYear(row.year) : [];

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div>
      <div
        onClick={onToggle}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium">{row.year}</span>
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

        <span className="hidden md:block text-right font-medium tabular-nums">{formatCompactCurrency(row.amount)}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.count.toLocaleString()}</span>
      </div>

      {/* Mobile supplementary info */}
      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.count} contracts</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && months.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {months.map((m) => (
            <div key={m.month} className="group">
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 pl-14 text-sm hover:bg-muted/20 transition-colors items-center">
                <span>{m.monthName} {row.year}</span>
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMonthChatClick(m); }}
                    className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-right tabular-nums">{formatCompactCurrency(m.amount)}</span>
                <span className="text-right tabular-nums text-muted-foreground">{m.count.toLocaleString()}</span>
              </div>
              {/* Mobile */}
              <div className="md:hidden px-4 py-3 pl-10 text-sm">
                <div className="flex items-center justify-between">
                  <span>{m.monthName} {row.year}</span>
                  <span className="text-muted-foreground">{formatCompactCurrency(m.amount)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{m.count} contracts</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMonthChatClick(m); }}
                    className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vendor Row (Mode 2) ──────────────────────────────────────────

function VendorRowItem({
  row,
  isExpanded,
  onToggle,
  onChatClick,
  onDrillChatClick,
  getContractsForVendor,
}: {
  row: ContractsVendorRow;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (contract: ContractsVendorDrillRow) => void;
  getContractsForVendor: (name: string) => ContractsVendorDrillRow[];
}) {
  const navigate = useNavigate();
  const contracts = isExpanded ? getContractsForVendor(row.name) : [];

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div>
      <div
        onClick={onToggle}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium truncate">{row.name}</span>
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

        <span className="hidden md:block text-right font-medium tabular-nums">{formatCompactCurrency(row.amount)}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.contractCount.toLocaleString()}</span>
      </div>

      {/* Mobile supplementary info */}
      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.contractCount} contracts</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && contracts.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {contracts.map((c, idx) => (
            <div key={`${c.contractNumber}-${idx}`} className="group">
              {/* Desktop */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 pl-14 text-sm hover:bg-muted/20 transition-colors items-center",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{c.name}</span>
                  {c.contractNumber && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {c.contractNumber}
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-right tabular-nums">{formatCompactCurrency(c.amount)}</span>
                <span className="text-right tabular-nums text-muted-foreground text-xs">
                  {c.startDate ? c.startDate.slice(0, 10) : '—'}
                </span>
              </div>
              {/* Mobile */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "md:hidden px-4 py-3 pl-10",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{c.name}</span>
                    {c.contractNumber && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {c.contractNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
                    {formatCompactCurrency(c.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.startDate ? c.startDate.slice(0, 10) : '—'}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Duration Row (Mode 3) ────────────────────────────────────────

function DurationRowItem({
  row,
  isExpanded,
  onToggle,
  onChatClick,
  onDrillChatClick,
  getContractsForDurationBucket,
}: {
  row: ContractsDurationBucket;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (contract: ContractsDurationDrillRow) => void;
  getContractsForDurationBucket: (bucket: string) => ContractsDurationDrillRow[];
}) {
  const navigate = useNavigate();
  const contracts = isExpanded ? getContractsForDurationBucket(row.bucket) : [];

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div>
      <div
        onClick={onToggle}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium">{row.bucket}</span>
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

        <span className="hidden md:block text-right font-medium tabular-nums">{formatCompactCurrency(row.amount)}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.count.toLocaleString()}</span>
      </div>

      {/* Mobile supplementary info */}
      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.count} contracts</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && contracts.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {contracts.map((c, idx) => (
            <div key={`${c.contractNumber}-${idx}`} className="group">
              {/* Desktop */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 pl-14 text-sm hover:bg-muted/20 transition-colors items-center",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{c.vendorName}</span>
                  {c.contractNumber && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {c.contractNumber}
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-right tabular-nums">{formatCompactCurrency(c.amount)}</span>
                <span className="text-right tabular-nums text-muted-foreground text-xs">
                  {Math.round(c.durationDays / 365 * 10) / 10} yr
                </span>
              </div>
              {/* Mobile */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "md:hidden px-4 py-3 pl-10",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{c.vendorName}</span>
                    {c.contractNumber && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {c.contractNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
                    {formatCompactCurrency(c.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{Math.round(c.durationDays / 365 * 10) / 10} yr</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Expiration Row (Mode 4) ──────────────────────────────────

function ExpirationRowItem({
  row,
  isExpanded,
  onToggle,
  onChatClick,
  onDrillChatClick,
  getContractsForExpirationBucket,
}: {
  row: ContractsExpirationBucket;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (contract: ContractsExpirationDrillRow) => void;
  getContractsForExpirationBucket: (bucket: string) => ContractsExpirationDrillRow[];
}) {
  const navigate = useNavigate();
  const contracts = isExpanded ? getContractsForExpirationBucket(row.bucket) : [];

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div>
      <div
        onClick={onToggle}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium">{row.bucket}</span>
          <span className="md:hidden text-sm text-muted-foreground ml-auto pl-2 whitespace-nowrap">
            {formatCompactCurrency(row.amount)}
          </span>
        </div>

        <div className="hidden md:flex justify-center">
          <button
            onClick={handleChatClick}
            className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        <span className="hidden md:block text-right font-medium tabular-nums">{formatCompactCurrency(row.amount)}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.count.toLocaleString()}</span>
      </div>

      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.count} contracts</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && contracts.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {contracts.map((c, idx) => (
            <div key={`${c.contractNumber}-${idx}`} className="group">
              {/* Desktop */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 pl-14 text-sm hover:bg-muted/20 transition-colors items-center",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{c.vendorName}</span>
                  {c.contractNumber && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {c.contractNumber}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex-shrink-0">{c.department}</span>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-right tabular-nums">{formatCompactCurrency(c.amount)}</span>
                <span className="text-right tabular-nums text-muted-foreground text-xs">
                  {c.daysUntilExpiry < 0 ? `${Math.abs(c.daysUntilExpiry)}d ago` : `${c.daysUntilExpiry}d`}
                </span>
              </div>
              {/* Mobile */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "md:hidden px-4 py-3 pl-10",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{c.vendorName}</span>
                    {c.contractNumber && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {c.contractNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
                    {formatCompactCurrency(c.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.department}</span>
                  <span>{c.endDate?.slice(0, 10) || '—'}</span>
                  <span>{c.daysUntilExpiry < 0 ? `${Math.abs(c.daysUntilExpiry)}d ago` : `${c.daysUntilExpiry}d left`}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Spend Row (Mode 5) ──────────────────────────────────────

function SpendRowItem({
  row,
  isExpanded,
  onToggle,
  onChatClick,
  onDrillChatClick,
  getContractsForSpendBucket,
}: {
  row: ContractsSpendBucket;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (contract: ContractsSpendDrillRow) => void;
  getContractsForSpendBucket: (bucket: string) => ContractsSpendDrillRow[];
}) {
  const navigate = useNavigate();
  const contracts = isExpanded ? getContractsForSpendBucket(row.bucket) : [];

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <div>
      <div
        onClick={onToggle}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium">{row.bucket}</span>
          <span className="md:hidden text-sm text-muted-foreground ml-auto pl-2 whitespace-nowrap">
            {formatCompactCurrency(row.amount)}
          </span>
        </div>

        <div className="hidden md:flex justify-center">
          <button
            onClick={handleChatClick}
            className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        <span className="hidden md:block text-right font-medium tabular-nums">{formatCompactCurrency(row.amount)}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.count.toLocaleString()}</span>
      </div>

      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.count} contracts</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && contracts.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {contracts.map((c, idx) => (
            <div key={`${c.contractNumber}-${idx}`} className="group">
              {/* Desktop */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 pl-14 text-sm hover:bg-muted/20 transition-colors items-center",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{c.vendorName}</span>
                  {c.contractNumber && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {c.contractNumber}
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-right tabular-nums">{formatCompactCurrency(c.amount)}</span>
                <span className="text-right tabular-nums text-muted-foreground text-xs">
                  {c.spendPct.toFixed(0)}%
                </span>
              </div>
              {/* Mobile */}
              <div
                onClick={() => c.contractNumber && navigate(`/contracts/${c.contractNumber}`)}
                className={cn(
                  "md:hidden px-4 py-3 pl-10",
                  c.contractNumber && "cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{c.vendorName}</span>
                    {c.contractNumber && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {c.contractNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
                    {formatCompactCurrency(c.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Spent: {formatCompactCurrency(c.spending)}</span>
                  <span>{c.spendPct.toFixed(1)}%</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDrillChatClick(c); }}
                    className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContractsDashboard;
