import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, ArrowUp, MessageSquare, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LobbyingChatDrawer } from '@/components/LobbyingChatDrawer';
import { DashboardDrawer } from '@/components/DashboardDrawer';
import {
  useLobbyingDashboard,
  formatCompactCurrency,
  formatFullCurrency,
  type LobbyingDashboardTab,
  type LobbyingDashboardRow,
  type LobbyingDrillDownRow,
  TAB_LABELS,
} from '@/hooks/useLobbyingDashboard';
import {
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from 'recharts';

const TABS: LobbyingDashboardTab[] = ['lobbyist', 'lobbyist3'];

const LobbyingDashboard = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<LobbyingDashboardTab>('lobbyist');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLobbyistName, setChatLobbyistName] = useState<string | null>(null);
  const [chatClientName, setChatClientName] = useState<string | null>(null);
  const [chatDataContext, setChatDataContext] = useState<string | null>(null);
  const [chatDrillName, setChatDrillName] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(50);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    isLoading,
    error,
    byLobbyist,
    lobbyistGrandTotal,
    getClientsForLobbyist,
  } = useLobbyingDashboard();

  // Get rows for the active tab (both tabs use lobbyist data)
  const rows: LobbyingDashboardRow[] = useMemo(() => {
    return byLobbyist;
  }, [byLobbyist]);

  const grandTotal = lobbyistGrandTotal;

  // Toggle row expansion
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

  // Reset expanded rows and display count when tab changes
  useEffect(() => {
    setExpandedRows(new Set());
    setSelectedRow(null);
    setDisplayCount(50);
  }, [activeTab]);

  // Selected row data for header display
  const selectedRowData = useMemo(() => {
    if (!selectedRow) return null;
    return rows.find((r) => r.name === selectedRow) || null;
  }, [selectedRow, rows]);

  // Header values: show selected row's values when selected, otherwise grand totals
  const headerAmount = selectedRowData ? selectedRowData.amount : grandTotal;

  // Chart data: cumulative distribution showing concentration of lobbying spend
  // When a lobbyist is selected, show their clients' distribution instead
  const chartData = useMemo(() => {
    // Determine which data to use
    let dataRows: { amount: number }[] = rows;
    let total = grandTotal;

    // If a lobbyist is selected (not client tab), show their clients
    if (selectedRow && activeTab !== 'client') {
      const clients = getClientsForLobbyist(selectedRow);
      if (clients.length > 0) {
        dataRows = clients;
        total = clients.reduce((sum, c) => sum + c.amount, 0);
      }
    }

    if (dataRows.length === 0) return [];

    // Create cumulative distribution data points
    let cumulative = 0;
    const points: { rank: number; label: string; cumulative: number; pct: number }[] = [];

    // Sample at key percentiles to create smooth curve
    const samplePoints = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const targetPct of samplePoints) {
      const targetIdx = Math.min(Math.floor((targetPct / 100) * dataRows.length), dataRows.length - 1);
      cumulative = 0;
      for (let i = 0; i <= targetIdx; i++) {
        cumulative += dataRows[i].amount;
      }
      const pct = total > 0 ? (cumulative / total) * 100 : 0;
      points.push({
        rank: targetPct,
        label: `Top ${targetPct}%`,
        cumulative,
        pct,
      });
    }

    return points;
  }, [rows, grandTotal, selectedRow, activeTab, getClientsForLobbyist]);

  // Bar chart data for lobbyist3 tab: top 40 lobbyists OR clients when a lobbyist is selected
  const barChartData = useMemo(() => {
    // If a lobbyist row is selected, show their clients
    if (selectedRow && activeTab === 'lobbyist3') {
      const clients = getClientsForLobbyist(selectedRow);
      return clients.slice(0, 40).map((client, idx) => ({
        idx: idx + 1,
        name: client.name,
        amount: client.amount,
      }));
    }
    // Otherwise show top lobbyists
    return byLobbyist.slice(0, 40).map((row, idx) => ({
      idx: idx + 1,
      name: row.name,
      amount: row.amount,
    }));
  }, [byLobbyist, selectedRow, activeTab, getClientsForLobbyist]);

  // Build data context string from available data
  const buildDataContext = (opts: {
    lobbyistName?: string | null;
    clientName?: string | null;
    row?: LobbyingDashboardRow | null;
    drillRow?: LobbyingDrillDownRow | null;
    parentRow?: LobbyingDashboardRow | null;
  }): string => {
    const lines: string[] = [];

    if (opts.lobbyistName && opts.row) {
      lines.push(`Lobbyist: ${opts.row.name}`);
      lines.push(`Total Compensation: ${formatCompactCurrency(opts.row.amount)}`);
      if (opts.row.clientCount) lines.push(`Number of Clients: ${opts.row.clientCount}`);
      lines.push(`Share of Total: ${opts.row.pctOfTotal.toFixed(1)}%`);
      if (opts.row.pctChange != null) lines.push(`Change from Prior Period: ${opts.row.pctChange >= 0 ? '+' : ''}${opts.row.pctChange.toFixed(1)}%`);

      const clients = getClientsForLobbyist(opts.row.name);
      if (clients.length > 0) {
        lines.push('');
        lines.push('Clients:');
        clients.forEach(c => {
          lines.push(`- ${c.name}: ${formatCompactCurrency(c.amount)} (${c.pctOfParent.toFixed(1)}% of lobbyist total)`);
        });
      }
    } else if (opts.clientName && opts.drillRow && opts.parentRow) {
      lines.push(`Client: ${opts.drillRow.name}`);
      lines.push(`Amount Paid: ${formatCompactCurrency(opts.drillRow.amount)}`);
      lines.push(`Share of Lobbyist Total: ${opts.drillRow.pctOfParent.toFixed(1)}%`);
      lines.push(`Lobbyist: ${opts.parentRow.name} (total compensation: ${formatCompactCurrency(opts.parentRow.amount)})`);
    } else if (opts.clientName && opts.row) {
      lines.push(`Client: ${opts.row.name}`);
      lines.push(`Total Lobbying Spend: ${formatCompactCurrency(opts.row.amount)}`);
      lines.push(`Share of Total: ${opts.row.pctOfTotal.toFixed(1)}%`);
      if (opts.row.pctChange != null) lines.push(`Change from Prior Period: ${opts.row.pctChange >= 0 ? '+' : ''}${opts.row.pctChange.toFixed(1)}%`);
    } else {
      lines.push(`Total Lobbying Compensation: ${formatCompactCurrency(grandTotal)}`);
      lines.push('');
      lines.push('Top Lobbyists:');
      byLobbyist.slice(0, 10).forEach(r => {
        lines.push(`- ${r.name}: ${formatCompactCurrency(r.amount)}${r.clientCount ? ` (${r.clientCount} clients)` : ''} — ${r.pctOfTotal.toFixed(1)}%`);
      });
    }

    return lines.join('\n');
  };

  // Open chat drawer
  const openChat = (lobbyistName?: string | null, clientName?: string | null, dataCtx?: string | null, drillName?: string | null) => {
    setChatLobbyistName(lobbyistName || null);
    setChatClientName(clientName || null);
    setChatDataContext(dataCtx || null);
    setChatDrillName(drillName || null);
    setChatOpen(true);
  };

  // Chat click for main row
  const handleChatClick = (row: LobbyingDashboardRow) => {
    if (activeTab === 'lobbyist') {
      const ctx = buildDataContext({ lobbyistName: row.name, row });
      openChat(row.name, null, ctx);
    } else {
      const ctx = buildDataContext({ clientName: row.name, row });
      openChat(null, row.name, ctx);
    }
  };

  // Chat click for drill-down row (client under lobbyist)
  const handleDrillDownChatClick = (drillRow: LobbyingDrillDownRow, parentRow: LobbyingDashboardRow) => {
    const ctx = buildDataContext({ clientName: drillRow.name, drillRow, parentRow });
    openChat(null, drillRow.name, ctx, drillRow.name);
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
                        onClick={() => openChat(null, null, buildDataContext({}))}
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
                        : 'Total Lobbyist Earnings'}
                    </span>
                  </div>
                )}

                <MobileNYSgpt />
              </div>

              {/* Chart - Bar chart for lobbyist3, Area chart for others */}
              {!isLoading && activeTab === 'lobbyist3' && barChartData.length > 0 && (
                <div className="h-28 md:h-32 mb-4 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <Bar
                        dataKey="amount"
                        fill="hsl(217 91% 60%)"
                        radius={[2, 2, 0, 0]}
                      />
                      <XAxis
                        dataKey="idx"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [formatFullCurrency(value), 'Earnings']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!isLoading && activeTab !== 'lobbyist3' && chartData.length > 1 && (
                <div className="h-24 md:h-28 mb-4 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <defs>
                        <linearGradient id="lobbyingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="hsl(217 91% 60%)"
                        strokeWidth={1.5}
                        fill="url(#lobbyingGradient)"
                        dot={false}
                        animationDuration={500}
                      />
                      <XAxis
                        dataKey="rank"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [formatFullCurrency(value), 'Cumulative']}
                        labelFormatter={(label) => `Top ${label}% of Lobbyists`}
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
                <p className="text-destructive">Error loading lobbying data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="px-4 md:px-6 py-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-muted-foreground">No lobbying records found.</p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {/* Column headers */}
                  <div className="hidden md:grid grid-cols-[1fr_44px_100px_80px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                    <span>Name</span>
                    <span className="flex items-center justify-center">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-right">'25</span>
                    <span className="text-right">Change</span>
                    <span className="text-right">Share</span>
                  </div>

                  {(isAuthenticated ? rows.slice(0, displayCount) : rows.slice(0, 10)).map((row) => (
                    <DashboardRowItem
                      key={row.name}
                      row={row}
                      isExpanded={expandedRows.has(row.name)}
                      isSelected={selectedRow === row.name}
                      hasSelection={selectedRow !== null}
                      onToggle={() => toggleRow(row.name)}
                      onChatClick={() => handleChatClick(row)}
                      tab={activeTab}
                      getClientsForLobbyist={getClientsForLobbyist}
                      onDrillDownChatClick={(drillRow) => handleDrillDownChatClick(drillRow, row)}
                    />
                  ))}

                  {/* Grand total row */}
                  <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_100px_80px_80px] gap-4 px-4 md:px-6 py-4 bg-muted/30 font-semibold">
                    <span>Total</span>
                    <span className="hidden md:block" />
                    <span className="text-right">{formatCompactCurrency(grandTotal)}</span>
                    <span className="hidden md:block text-right">—</span>
                    <span className="hidden md:block text-right">100%</span>
                  </div>
                </div>
                {!isAuthenticated && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Please log in to view all lobbying records.
                    </p>
                    <Button variant="ghost" onClick={() => navigate('/auth-4')}
                      className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">
                      Sign Up
                    </Button>
                  </div>
                )}
                {isAuthenticated && displayCount < rows.length && (
                  <div className="flex justify-center py-6">
                    <button
                      onClick={() => setDisplayCount((prev) => prev + 50)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      Load More ({Math.min(displayCount, rows.length)} of {rows.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
      </InsetPanel>

      {/* Lobbying Chat Drawer */}
      <LobbyingChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        lobbyistName={chatLobbyistName}
        clientName={chatClientName}
        dataContext={chatDataContext}
        drillName={chatDrillName}
      />
    </div>
  );
};

// ── Dashboard Row Component ───────────────────────────────────────

interface DashboardRowItemProps {
  row: LobbyingDashboardRow;
  isExpanded: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  tab: LobbyingDashboardTab;
  getClientsForLobbyist: (name: string) => LobbyingDrillDownRow[];
  onDrillDownChatClick: (row: LobbyingDrillDownRow) => void;
}

function DashboardRowItem({
  row,
  isExpanded,
  isSelected,
  hasSelection,
  onToggle,
  onChatClick,
  tab,
  getClientsForLobbyist,
  onDrillDownChatClick,
}: DashboardRowItemProps) {
  const drillDownRows = isExpanded && (tab === 'lobbyist' || tab === 'lobbyist3') ? getClientsForLobbyist(row.name) : [];

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
          "group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_100px_80px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer transition-all duration-200 items-center",
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
            {(tab === 'lobbyist' || tab === 'lobbyist3') ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <div className="w-4" />
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
          {/* Client count badge for lobbyists */}
          {(tab === 'lobbyist' || tab === 'lobbyist3') && row.clientCount !== undefined && row.clientCount > 0 && (
            <span className="hidden md:inline-flex text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {row.clientCount} clients
            </span>
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

        {/* Change column */}
        <span className={cn(
          "hidden md:block text-right text-sm tabular-nums",
          row.pctChange === null || row.pctChange === undefined
            ? "text-muted-foreground"
            : row.pctChange > 0
              ? "text-green-600"
              : row.pctChange < 0
                ? "text-red-600"
                : "text-muted-foreground"
        )}>
          {row.pctChange === null || row.pctChange === undefined
            ? "—"
            : row.pctChange > 0
              ? `+${row.pctChange.toFixed(1)}%`
              : `${row.pctChange.toFixed(1)}%`}
        </span>

        {/* Share bar */}
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
        {(tab === 'lobbyist' || tab === 'lobbyist3') && row.clientCount !== undefined && row.clientCount > 0 && (
          <span>{row.clientCount} clients</span>
        )}
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

      {/* Drill-down rows (clients for a lobbyist) */}
      {isExpanded && drillDownRows.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {drillDownRows.slice(0, 20).map((client) => (
            <ClientRow
              key={client.name}
              client={client}
              onChatClick={() => onDrillDownChatClick(client)}
            />
          ))}
          {drillDownRows.length > 20 && (
            <div className="px-6 py-2 text-xs text-muted-foreground text-center">
              + {drillDownRows.length - 20} more clients
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Client Drill-Down Row ─────────────────────────────────────────

interface ClientRowProps {
  client: LobbyingDrillDownRow;
  onChatClick: () => void;
}

function ClientRow({ client, onChatClick }: ClientRowProps) {
  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[1fr_44px_100px_80px_80px] gap-4 px-6 py-3 pl-14 hover:bg-muted/20 transition-colors items-center group">
        <span className="text-sm truncate">{client.name}</span>
        <div className="flex justify-center">
          <button
            onClick={handleChatClick}
            className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-right text-sm tabular-nums">
          {client.amount > 0 ? formatCompactCurrency(client.amount) : '—'}
        </span>
        <span className="text-right text-sm text-muted-foreground">—</span>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/40 rounded-full"
              style={{ width: `${Math.min(client.pctOfParent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
            {client.pctOfParent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 py-3 pl-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm truncate flex-1 min-w-0">{client.name}</span>
          <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">
            {client.amount > 0 ? formatCompactCurrency(client.amount) : '—'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[100px]">
            <div
              className="h-full bg-foreground/40 rounded-full"
              style={{ width: `${Math.min(client.pctOfParent, 100)}%` }}
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

export default LobbyingDashboard;
