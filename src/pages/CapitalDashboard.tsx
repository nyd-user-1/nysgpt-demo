import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, ArrowUp, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardDrawer } from '@/components/DashboardDrawer';
import {
  useCapitalDashboard,
  formatCompact,
  type CapitalGroupRow,
  type CapitalDrillRow,
} from '@/hooks/useCapitalDashboard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

export default function CapitalDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { isLoading, error, byAgency, grandTotal, totalItems, getDrillDown, reformatAgencyName } = useCapitalDashboard();

  const toggleRow = (name: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    setSelectedRow(prev => (prev === name ? null : name));
  };

  const headerAmount = selectedRow
    ? (byAgency.find(r => r.name === selectedRow)?.totalAmount ?? grandTotal)
    : grandTotal;

  const openChat = (context?: string, drillName?: string) => {
    const prompt = drillName
      ? `Tell me about NYS capital appropriations for "${drillName}". ${context || ''}`
      : `Tell me about NYS capital appropriations. ${context || ''}`;
    navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}`);
  };

  const chartData = byAgency.slice(0, 12).map(r => ({
    name: r.name.length > 15 ? r.name.slice(0, 13) + '...' : r.name,
    amount: r.totalAmount,
    fullName: r.name,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className={cn("fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-50", sidebarMounted && "transition-transform duration-300 ease-in-out", leftSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>
      {leftSidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={() => setLeftSidebarOpen(false)} />}

      <InsetPanel>
        {/* Header area with chart */}
        <div className="flex-shrink-0 bg-background">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <MobileMenuIcon onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} />
            {!isLoading && !error && (
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => openChat()} className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:bg-foreground/80 transition-colors flex-shrink-0">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <span className="text-3xl md:text-4xl font-bold tracking-tight">{formatCompact(headerAmount)}</span>
                  {selectedRow && (
                    <button onClick={() => setSelectedRow(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedRow ? `${((byAgency.find(r => r.name === selectedRow)?.totalAmount ?? 0) / grandTotal * 100).toFixed(1)}% of total` : 'Capital Appropriations'}
                </span>
              </div>
            )}
            <MobileNYSgpt />
          </div>

          {/* Chart */}
          {!isLoading && chartData.length > 0 && (
            <div className="h-48 md:h-56 px-4 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 16, left: 8 }}>
                  <Bar dataKey="amount" fill="hsl(217 91% 60%)" radius={[2, 2, 0, 0]} animationDuration={500} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [formatCompact(value), 'Recommended']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dashboards drawer */}
          <div className="flex items-center gap-3 px-4 py-2 border-b">
            <DashboardDrawer />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">Error loading capital data</div>
          ) : (
            <div className="divide-y">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                <span>Agency</span>
                <span className="flex items-center justify-center"><MessageSquare className="h-3.5 w-3.5" /></span>
                <span className="text-right">Recommended</span>
                <span className="text-right">Items</span>
              </div>

              {byAgency.map(row => (
                <CapitalGroupRowItem
                  key={row.name}
                  row={row}
                  isExpanded={expandedRows.has(row.name)}
                  onToggle={() => toggleRow(row.name)}
                  onChatClick={() => {
                    const items = getDrillDown(row.name);
                    const ctx = [`Agency: ${row.name}`, `Total Recommended: ${formatCompact(row.totalAmount)}`, `Items: ${row.count}`, '', 'Top items:', ...items.slice(0, 10).map(i => `- ${i.description || i.programName || 'N/A'}: ${formatCompact(i.recommended)}`)].join('\n');
                    openChat(ctx);
                  }}
                  onDrillChatClick={(item) => {
                    const ctx = [`Capital Item: ${item.description || item.programName || 'N/A'}`, `Agency: ${item.agencyName}`, item.financingSource ? `Financing: ${item.financingSource}` : '', `Recommended: ${formatCompact(item.recommended)}`, item.reappropriation > 0 ? `Reappropriation: ${formatCompact(item.reappropriation)}` : ''].filter(Boolean).join('\n');
                    openChat(ctx, item.description || item.programName || item.agencyName);
                  }}
                  getDrillDown={getDrillDown}
                  reformatAgencyName={reformatAgencyName}
                />
              ))}
            </div>
          )}
        </div>
      </InsetPanel>
    </div>
  );
}

// ── Row Component ────────────────────────────────────────
function CapitalGroupRowItem({ row, isExpanded, onToggle, onChatClick, onDrillChatClick, getDrillDown, reformatAgencyName }: {
  row: CapitalGroupRow;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (item: CapitalDrillRow) => void;
  getDrillDown: (name: string) => CapitalDrillRow[];
  reformatAgencyName: (name: string) => string;
}) {
  const items = isExpanded ? getDrillDown(row.name) : [];

  return (
    <div>
      {/* Main row */}
      <div onClick={onToggle} className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_44px_120px_80px] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
          <span className="font-medium truncate">{reformatAgencyName(row.name)}</span>
          <span className="md:hidden text-sm text-muted-foreground ml-auto pl-2 whitespace-nowrap">{formatCompact(row.totalAmount)}</span>
        </div>
        <div className="hidden md:flex justify-center">
          <button onClick={(e) => { e.stopPropagation(); onChatClick(); }} className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <span className="hidden md:block text-right font-medium tabular-nums">{formatCompact(row.totalAmount)}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.count.toLocaleString()}</span>
      </div>

      {/* Mobile supplementary */}
      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.count} items</span>
        <button onClick={(e) => { e.stopPropagation(); onChatClick(); }} className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded drill-down */}
      {isExpanded && items.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {items.map((item, idx) => (
            <div key={`${item.referenceNumber}-${idx}`} className="group">
              <div className="hidden md:grid grid-cols-[1fr_44px_120px_80px] gap-4 px-6 py-3 pl-14 text-sm hover:bg-muted/20 transition-colors items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{item.description || item.programName || 'N/A'}</span>
                  {item.financingSource && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">{item.financingSource}</span>}
                </div>
                <div className="flex justify-center">
                  <button onClick={(e) => { e.stopPropagation(); onDrillChatClick(item); }} className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-right tabular-nums">{formatCompact(item.recommended)}</span>
                <span className="text-right tabular-nums text-muted-foreground text-xs">{item.referenceNumber || ''}</span>
              </div>
              {/* Mobile sub-row */}
              <div className="md:hidden px-4 py-3 pl-10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm truncate flex-1 min-w-0">{item.description || item.programName || 'N/A'}</span>
                  <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">{formatCompact(item.recommended)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.financingSource && <span>{item.financingSource}</span>}
                  {item.referenceNumber && <span>{item.referenceNumber}</span>}
                  <button onClick={(e) => { e.stopPropagation(); onDrillChatClick(item); }} className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center">
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
