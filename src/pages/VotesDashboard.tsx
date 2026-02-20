import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, ChevronDown, ArrowUp, MessageSquare, LayoutGrid, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VotesChatDrawer } from '@/components/VotesChatDrawer';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import {
  useVotesDashboard,
  type VotesDashboardRow,
  type VotesDrillDownRow,
  type BillPassFailRow,
  type BillMemberVoteRow,
} from '@/hooks/useVotesDashboard';
import {
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const CHART_LABELS = ['Votes by Day', 'Roll Calls', 'Passed vs. Failed', 'By Party', 'Closest Votes'];
const CHART_DESCS = ['Yes vs No votes per day', 'Roll call votes per day', 'Bills passed or failed per day', 'D vs R yes votes per day', 'Average vote margin per day'];
const CHART_EXPLAINERS = [
  'Chart shows the number of Yes and No votes cast each day. The table below lists every member with their total vote count, yes/no breakdown, and yes-vote percentage.',
  'Chart shows how many roll call votes took place each day. The table lists every bill that went to a roll call with total votes, yes count, and no count.',
  'Chart shows how many bills passed or failed each day. The table lists each bill with its yes/no counts and final result.',
  'Chart compares daily yes-vote totals by party — Democrat vs Republican. The table lists members with their party affiliation and vote breakdown.',
  'Chart shows the average margin (difference between yes and no votes) per day. The table lists bills ranked by the narrowest margins — the most contested votes.',
];
const NUM_MODES = CHART_LABELS.length;

const VOTES_SLUG_TO_MODE: Record<string, number> = { 'by-roll-call': 1, 'by-pass-fail': 2, 'by-party': 3, 'by-closest': 4 };

const VotesDashboard = () => {
  const navigate = useNavigate();
  const { subChart } = useParams<{ subChart?: string }>();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedBillRows, setExpandedBillRows] = useState<Set<number>>(new Set());
  const [displayCount, setDisplayCount] = useState(20);
  const [billDisplayCount, setBillDisplayCount] = useState(20);
  const [timeRange, setTimeRange] = useState('90');
  const [chartMode, setChartMode] = useState(() => {
    const m = subChart ? (VOTES_SLUG_TO_MODE[subChart] ?? 0) : 0;
    return m >= 0 && m < NUM_MODES ? m : 0;
  });
  // Sync URL subChart param → chartMode (useState initializer only runs on mount)
  useEffect(() => {
    const m = subChart ? (VOTES_SLUG_TO_MODE[subChart] ?? 0) : 0;
    setChartMode(m >= 0 && m < NUM_MODES ? m : 0);
  }, [subChart]);

  const [memberSort, setMemberSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [billSort, setBillSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMemberName, setChatMemberName] = useState<string | null>(null);
  const [chatMemberParty, setChatMemberParty] = useState<string | null>(null);
  const [chatBillTitle, setChatBillTitle] = useState<string | null>(null);
  const [chatBillNumber, setChatBillNumber] = useState<string | null>(null);
  const [chatBillResult, setChatBillResult] = useState<string | null>(null);
  const [chatMemberVoteDetails, setChatMemberVoteDetails] = useState<string | null>(null);
  const [chatBillVoteDetails, setChatBillVoteDetails] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Clear date filter when switching chart modes
  useEffect(() => { setSelectedDate(null); }, [chartMode]);

  const {
    isLoading,
    error,
    byMember,
    chartData,
    rollCallsPerDay,
    passFailPerDay,
    partyPerDay,
    marginPerDay,
    billsPassFail,
    getDrillDown,
    fetchDrillDownAsync,
    fetchOppositionVotes,
    getBillMemberVotes,
    totalVotes,
    totalMembers,
  } = useVotesDashboard();

  // ── Time-range filtered chart data ──────────────────────────
  const { cutoffStr, endStr } = useMemo(() => {
    if (timeRange === 'all') return { cutoffStr: '', endStr: '' };
    if (timeRange === '2026') return { cutoffStr: '2026-01-01', endStr: '' };
    if (timeRange === '2025') return { cutoffStr: '2025-01-01', endStr: '2025-12-31' };
    const days = parseInt(timeRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return { cutoffStr: cutoff.toISOString().split('T')[0], endStr: '' };
  }, [timeRange]);

  const filteredChartData = useMemo(() =>
    chartData.filter((p) => (!cutoffStr || p.date >= cutoffStr) && (!endStr || p.date <= endStr)),
    [chartData, cutoffStr, endStr]);
  const filteredRollCallData = useMemo(() =>
    rollCallsPerDay.filter((p) => (!cutoffStr || p.date >= cutoffStr) && (!endStr || p.date <= endStr)),
    [rollCallsPerDay, cutoffStr, endStr]);
  const filteredPassFailData = useMemo(() =>
    passFailPerDay.filter((p) => (!cutoffStr || p.date >= cutoffStr) && (!endStr || p.date <= endStr)),
    [passFailPerDay, cutoffStr, endStr]);
  const filteredPartyData = useMemo(() =>
    partyPerDay.filter((p) => (!cutoffStr || p.date >= cutoffStr) && (!endStr || p.date <= endStr)),
    [partyPerDay, cutoffStr, endStr]);
  const filteredMarginData = useMemo(() =>
    marginPerDay.filter((p) => (!cutoffStr || p.date >= cutoffStr) && (!endStr || p.date <= endStr)),
    [marginPerDay, cutoffStr, endStr]);

  // ── Bills sorted by closest margin (for mode 4) ────────────
  const billsByMargin = useMemo(() =>
    [...billsPassFail].sort((a, b) =>
      Math.abs(a.yesCount - a.noCount) - Math.abs(b.yesCount - b.noCount)
    ), [billsPassFail]);

  // Active chart data for show/hide logic
  const chartDataSets = [filteredChartData, filteredRollCallData, filteredPassFailData, filteredPartyData, filteredMarginData];
  const activeChartHasData = (chartDataSets[chartMode]?.length ?? 0) > 1;

  // Toggle helpers
  const toggleRow = (peopleId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(peopleId) ? next.delete(peopleId) : next.add(peopleId);
      return next;
    });
  };

  const toggleBillRow = (rollCallId: number) => {
    setExpandedBillRows((prev) => {
      const next = new Set(prev);
      next.has(rollCallId) ? next.delete(rollCallId) : next.add(rollCallId);
      return next;
    });
  };

  // Which table type does this mode use?
  const isBillsTable = chartMode === 1 || chartMode === 2 || chartMode === 4;
  const isMembersTable = chartMode === 0 || chartMode === 3;

  // Get the bill rows for the current mode
  const activeBillRows = chartMode === 4 ? billsByMargin : billsPassFail;

  // ── Sorting ──────────────────────────────────────────────────
  const toggleMemberSort = (key: string) => {
    setMemberSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: key === 'name' || key === 'party' ? 'asc' : 'desc' };
    });
  };

  const toggleBillSort = (key: string) => {
    setBillSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: key === 'billTitle' ? 'asc' : 'desc' };
    });
  };

  const sortedMembers = useMemo(() => {
    if (!memberSort) return byMember;
    const arr = [...byMember];
    const { key, dir } = memberSort;
    arr.sort((a, b) => {
      let cmp: number;
      if (key === 'name') cmp = a.name.localeCompare(b.name);
      else if (key === 'party') cmp = a.party.localeCompare(b.party);
      else cmp = ((a as any)[key] as number) - ((b as any)[key] as number);
      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [byMember, memberSort]);

  const sortedBills = useMemo(() => {
    if (!billSort) return activeBillRows;
    const arr = [...activeBillRows];
    const { key, dir } = billSort;
    arr.sort((a, b) => {
      let cmp: number;
      switch (key) {
        case 'billTitle': cmp = (a.billTitle || '').localeCompare(b.billTitle || ''); break;
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'total': cmp = (a.yesCount + a.noCount) - (b.yesCount + b.noCount); break;
        case 'yesCount': cmp = a.yesCount - b.yesCount; break;
        case 'noCount': cmp = a.noCount - b.noCount; break;
        case 'result': cmp = a.result.localeCompare(b.result); break;
        case 'margin': cmp = Math.abs(a.yesCount - a.noCount) - Math.abs(b.yesCount - b.noCount); break;
        default: cmp = 0;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [activeBillRows, billSort]);

  const [chatDataContext, setChatDataContext] = useState<string | null>(null);

  // Open chat drawer with overview context
  const openChat = () => {
    const overviewLines = [
      `Total Votes: ${totalVotes.toLocaleString()}`,
      `Total Members: ${totalMembers.toLocaleString()}`,
      `Total Bills (roll calls): ${billsPassFail.length.toLocaleString()}`,
      '',
      'Top 10 Members by Vote Count:',
      ...byMember.slice(0, 10).map(m => `- ${m.name} (${m.party}): ${m.totalVotes} votes, ${m.yesCount} Yes (${m.pctYes.toFixed(0)}%), ${m.noCount} No`),
      '',
      'Most Contested Bills (narrowest margins):',
      ...billsByMargin.slice(0, 10).map(b => `- ${b.billTitle || 'Untitled'} (${b.billNumber || 'no number'}): ${b.yesCount} Yes, ${b.noCount} No, margin ${Math.abs(b.yesCount - b.noCount)} — ${b.result}`),
    ];
    setChatMemberName(null);
    setChatMemberParty(null);
    setChatMemberVoteDetails(null);
    setChatBillTitle(null);
    setChatBillNumber(null);
    setChatBillResult(null);
    setChatBillVoteDetails(null);
    setChatDataContext(overviewLines.join('\n'));
    setChatOpen(true);
  };

  const handleMemberChatClick = async (row: VotesDashboardRow) => {
    // Fetch opposition votes directly (bypasses drilldown LIMIT)
    // Also fetch drilldown for recent Yes vote context
    const [oppositionVotes, drilldownVotes] = await Promise.all([
      fetchOppositionVotes(row.people_id),
      fetchDrillDownAsync(row.people_id),
    ]);

    const noVotes = oppositionVotes.filter((v) => v.vote === 'No');
    const otherVotes = oppositionVotes.filter((v) => v.vote === 'Other');
    const yesVotes = drilldownVotes.filter((v) => v.vote === 'Yes');

    let details = `Summary: ${row.totalVotes} total votes, ${row.yesCount} Yes, ${row.noCount} No, ${row.pctYes.toFixed(0)}% Yes`;
    if (noVotes.length > 0) {
      details += `\n\nBills they voted NO on:\n${noVotes.map((v) => `- ${v.billTitle || 'Untitled'} (${v.billNumber || 'no number'}) — ${v.date}`).join('\n')}`;
    }
    if (otherVotes.length > 0) {
      details += `\n\nBills with Other/Not Voting:\n${otherVotes.map((v) => `- ${v.billTitle || 'Untitled'} (${v.billNumber || 'no number'}) — ${v.vote} — ${v.date}`).join('\n')}`;
    }
    if (yesVotes.length > 0) {
      const shown = yesVotes.slice(0, 20);
      details += `\n\nRecent Yes votes (${yesVotes.length} total):\n${shown.map((v) => `- ${v.billTitle || 'Untitled'} (${v.billNumber || 'no number'}) — ${v.date}`).join('\n')}`;
      if (yesVotes.length > 20) details += `\n... and ${yesVotes.length - 20} more Yes votes`;
    }
    setChatMemberName(row.name);
    setChatMemberParty(row.party);
    setChatMemberVoteDetails(details);
    setChatBillTitle(null);
    setChatBillNumber(null);
    setChatBillResult(null);
    setChatBillVoteDetails(null);
    setChatDataContext(null);
    setChatOpen(true);
  };

  const handleBillChatClick = (row: BillPassFailRow) => {
    const memberVotes = getBillMemberVotes(row.rollCallId);
    const details = memberVotes.length > 0
      ? memberVotes.map((mv) => `- ${mv.name}: ${mv.vote}`).join('\n')
      : null;
    setChatMemberName(null);
    setChatMemberParty(null);
    setChatMemberVoteDetails(null);
    setChatBillTitle(row.billTitle || null);
    setChatBillNumber(row.billNumber || null);
    setChatBillResult(row.result || null);
    setChatBillVoteDetails(details);
    setChatDataContext(null);
    setChatOpen(true);
  };

  // ── Chart click → filter table by date ─────────────────────
  const handleChartClick = (data: any) => {
    if (data?.activeLabel) {
      setSelectedDate((prev) => prev === data.activeLabel ? null : data.activeLabel);
    }
  };

  const displayBills = useMemo(() => {
    if (!selectedDate) return sortedBills;
    return sortedBills.filter((b) => b.date === selectedDate);
  }, [sortedBills, selectedDate]);

  // ── Drawer chart previews ───────────────────────────────────
  const drawerCharts = useMemo(() => [
    { label: CHART_LABELS[0], desc: CHART_DESCS[0], data: filteredChartData,
      areas: [{ key: 'yes', stroke: 'hsl(142 76% 36%)', id: 'dYes' }, { key: 'no', stroke: 'hsl(0 84% 60%)', id: 'dNo' }] },
    { label: CHART_LABELS[1], desc: CHART_DESCS[1], data: filteredRollCallData,
      areas: [{ key: 'rollCalls', stroke: 'hsl(217 91% 60%)', id: 'dRC' }] },
    { label: CHART_LABELS[2], desc: CHART_DESCS[2], data: filteredPassFailData,
      areas: [{ key: 'passed', stroke: 'hsl(142 76% 36%)', id: 'dPass' }, { key: 'failed', stroke: 'hsl(0 84% 60%)', id: 'dFail' }] },
    { label: CHART_LABELS[3], desc: CHART_DESCS[3], data: filteredPartyData,
      areas: [{ key: 'demYes', stroke: 'hsl(217 91% 60%)', id: 'dDem' }, { key: 'repYes', stroke: 'hsl(0 84% 60%)', id: 'dRep' }] },
    { label: CHART_LABELS[4], desc: CHART_DESCS[4], data: filteredMarginData,
      areas: [{ key: 'avgMargin', stroke: 'hsl(280 67% 55%)', id: 'dMargin' }] },
  ], [filteredChartData, filteredRollCallData, filteredPassFailData, filteredPartyData, filteredMarginData]);

  // Shared tooltip/axis styling
  const xAxisProps = {
    dataKey: 'date' as const,
    tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
    tickLine: false,
    axisLine: false,
    interval: 'preserveStartEnd' as const,
    tickFormatter: (value: string) => { const d = new Date(value + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}`; },
  };
  const tooltipProps = {
    contentStyle: { backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' },
    labelFormatter: (label: string) => { const d = new Date(label + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); },
  };

  // ── Dynamic summary number ──────────────────────────────────
  const summaryNumber = isMembersTable ? totalVotes : displayBills.length;
  const summaryLabel = isMembersTable ? 'Total Votes' : chartMode === 1 ? 'Roll Calls' : 'Bills';

  // Sortable header cell style
  const hdr = "hover:bg-muted/60 rounded px-1.5 py-1 -mx-1.5 transition-colors cursor-pointer select-none";

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
              {/* Top row: sidebar toggle left, total votes right */}
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

                {/* Total votes — top right */}
                {!isLoading && !error && (
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openChat()}
                        className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center hover:bg-foreground/80 transition-colors flex-shrink-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <span className="text-3xl md:text-4xl font-bold tracking-tight">
                        {summaryNumber.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {summaryLabel}
                    </div>
                  </div>
                )}

                <MobileNYSgpt />
              </div>

              {/* Chart */}
              {!isLoading && activeChartHasData && (
                <div className="mb-4">
                  <div className="h-24 md:h-28 -mx-2">
                    {/* Mode 0: Yes/No votes per day */}
                    {chartMode === 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredChartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                          <defs>
                            <linearGradient id="votesYesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="votesNoGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="yes" stroke="hsl(142 76% 36%)" strokeWidth={1.5} fill="url(#votesYesGradient)" dot={false} animationDuration={500} />
                          <Area type="monotone" dataKey="no" stroke="hsl(0 84% 60%)" strokeWidth={1.5} fill="url(#votesNoGradient)" dot={false} animationDuration={500} />
                          <XAxis {...xAxisProps} />
                          <RechartsTooltip {...tooltipProps} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {/* Mode 1: Roll calls per day */}
                    {chartMode === 1 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredRollCallData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                          <defs>
                            <linearGradient id="rollCallGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="rollCalls" stroke="hsl(217 91% 60%)" strokeWidth={1.5} fill="url(#rollCallGradient)" dot={false} animationDuration={500} />
                          <XAxis {...xAxisProps} />
                          <RechartsTooltip {...tooltipProps} formatter={(value: number) => [value, 'Roll Calls']} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {/* Mode 2: Passed vs Failed per day */}
                    {chartMode === 2 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredPassFailData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                          <defs>
                            <linearGradient id="passedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="passed" stroke="hsl(142 76% 36%)" strokeWidth={1.5} fill="url(#passedGradient)" dot={false} animationDuration={500} />
                          <Area type="monotone" dataKey="failed" stroke="hsl(0 84% 60%)" strokeWidth={1.5} fill="url(#failedGradient)" dot={false} animationDuration={500} />
                          <XAxis {...xAxisProps} />
                          <RechartsTooltip {...tooltipProps} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {/* Mode 3: Party breakdown — D vs R yes votes */}
                    {chartMode === 3 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredPartyData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                          <defs>
                            <linearGradient id="demGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="repGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="demYes" stroke="hsl(217 91% 60%)" strokeWidth={1.5} fill="url(#demGradient)" dot={false} animationDuration={500} />
                          <Area type="monotone" dataKey="repYes" stroke="hsl(0 84% 60%)" strokeWidth={1.5} fill="url(#repGradient)" dot={false} animationDuration={500} />
                          <XAxis {...xAxisProps} />
                          <RechartsTooltip {...tooltipProps} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {/* Mode 4: Average margin per day */}
                    {chartMode === 4 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredMarginData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                          <defs>
                            <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(280 67% 55%)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(280 67% 55%)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="avgMargin" stroke="hsl(280 67% 55%)" strokeWidth={1.5} fill="url(#marginGradient)" dot={false} animationDuration={500} />
                          <XAxis {...xAxisProps} />
                          <RechartsTooltip {...tooltipProps} formatter={(value: number) => [value, 'Avg Margin']} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-2 px-2">
                    {chartMode === 0 && (
                      <>
                        <LegendDot color="hsl(142 76% 36%)" label="Yes" />
                        <LegendDot color="hsl(0 84% 60%)" label="No" />
                      </>
                    )}
                    {chartMode === 1 && <LegendDot color="hsl(217 91% 60%)" label="Roll Calls" />}
                    {chartMode === 2 && (
                      <>
                        <LegendDot color="hsl(142 76% 36%)" label="Passed" />
                        <LegendDot color="hsl(0 84% 60%)" label="Failed" />
                      </>
                    )}
                    {chartMode === 3 && (
                      <>
                        <LegendDot color="hsl(217 91% 60%)" label="Democrat" />
                        <LegendDot color="hsl(0 84% 60%)" label="Republican" />
                      </>
                    )}
                    {chartMode === 4 && <LegendDot color="hsl(280 67% 55%)" label="Avg Margin" />}
                  </div>
                </div>
              )}

              {/* Dashboards picker + time range + chart toggle */}
              <div className="flex items-center gap-3">
                <Drawer>
                    <DrawerTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboards</span>
                      </button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Dashboards</DrawerTitle>
                        <DrawerDescription>Explore NYS data dashboards</DrawerDescription>
                      </DrawerHeader>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-4 pb-8">
                        {/* Dashboard navigation cards */}
                        {[
                          { path: '/charts/budget', label: 'Budget', desc: 'NYS budget spending', color: 'hsl(160 60% 45%)', id: 'dBudget',
                            data: [{x:0,y:8},{x:1,y:10},{x:2,y:14},{x:3,y:18},{x:4,y:16},{x:5,y:20},{x:6,y:22},{x:7,y:19},{x:8,y:24},{x:9,y:28}] },
                          { path: '/charts/lobbying', label: 'Lobbying', desc: 'Lobbyist compensation', color: 'hsl(217 91% 60%)', id: 'dLobby',
                            data: [{x:0,y:6},{x:1,y:8},{x:2,y:10},{x:3,y:12},{x:4,y:14},{x:5,y:16},{x:6,y:18},{x:7,y:22},{x:8,y:24},{x:9,y:28}] },
                          { path: '/charts/contracts', label: 'Contracts', desc: 'State contracts', color: 'hsl(32 95% 50%)', id: 'dContract',
                            data: [{x:0,y:14},{x:1,y:12},{x:2,y:16},{x:3,y:14},{x:4,y:18},{x:5,y:16},{x:6,y:20},{x:7,y:18},{x:8,y:22},{x:9,y:24}] },
                        ].map((d) => (
                          <DrawerClose asChild key={d.path}>
                            <button onClick={() => navigate(d.path)} className="text-left rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:shadow-lg transition-all duration-200 overflow-hidden">
                              <div className="h-24 px-2 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={d.data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                                    <defs>
                                      <linearGradient id={d.id} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={d.color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={d.color} stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="y" stroke={d.color} strokeWidth={1.5} fill={`url(#${d.id})`} dot={false} animationDuration={500} />
                                    <XAxis dataKey="x" hide />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="px-3 pb-3 pt-2">
                                <p className="font-semibold text-sm">{d.label}</p>
                                <p className="text-xs text-muted-foreground">{d.desc}</p>
                              </div>
                            </button>
                          </DrawerClose>
                        ))}

                        {/* Vote chart cards */}
                        {drawerCharts.map((chart, idx) => (
                          <DrawerClose asChild key={idx}>
                            <button onClick={() => setChartMode(idx)} className={cn("text-left rounded-xl border bg-muted/30 hover:bg-muted/50 hover:shadow-lg transition-all duration-200 overflow-hidden", chartMode === idx ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border")}>
                              <div className="h-24 px-2 pt-2">
                                {chart.data.length > 1 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chart.data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                                      <defs>
                                        {chart.areas.map((a) => (
                                          <linearGradient key={a.id} id={a.id} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={a.stroke} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={a.stroke} stopOpacity={0.02} />
                                          </linearGradient>
                                        ))}
                                      </defs>
                                      {chart.areas.map((a) => (
                                        <Area key={a.key} type="monotone" dataKey={a.key} stroke={a.stroke} strokeWidth={1.5} fill={`url(#${a.id})`} dot={false} animationDuration={500} />
                                      ))}
                                      <XAxis dataKey="date" hide />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading...</div>
                                )}
                              </div>
                              <div className="px-3 pb-3 pt-2">
                                <p className="font-semibold text-sm">{chart.label}</p>
                                <p className="text-xs text-muted-foreground">{chart.desc}</p>
                              </div>
                            </button>
                          </DrawerClose>
                        ))}
                      </div>
                    </DrawerContent>
                  </Drawer>

                {/* Time range filter */}
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="focus:bg-muted focus:text-foreground">All time</SelectItem>
                    <SelectItem value="2026" className="focus:bg-muted focus:text-foreground">2026</SelectItem>
                    <SelectItem value="2025" className="focus:bg-muted focus:text-foreground">2025</SelectItem>
                    <SelectItem value="90" className="focus:bg-muted focus:text-foreground">90 days</SelectItem>
                    <SelectItem value="30" className="focus:bg-muted focus:text-foreground">30 days</SelectItem>
                    <SelectItem value="7" className="focus:bg-muted focus:text-foreground">7 days</SelectItem>
                  </SelectContent>
                </Select>

                {/* Chart mode toggle */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartMode((prev) => (prev - 1 + NUM_MODES) % NUM_MODES)}
                    className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[120px] text-center">
                    {CHART_LABELS[chartMode]}
                  </span>
                  <button
                    onClick={() => setChartMode((prev) => (prev + 1) % NUM_MODES)}
                    className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Explainer hover card */}
                <HoverCard openDelay={10} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors">
                      Explainer
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="flex w-72 flex-col gap-1">
                    <div className="font-semibold text-sm">{CHART_LABELS[chartMode]}</div>
                    <div className="text-sm text-muted-foreground">{CHART_EXPLAINERS[chartMode]}</div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="text-center py-12 px-4">
                <p className="text-destructive">Error loading votes data: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="px-4 md:px-6 py-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>

            /* ── Bills Tables (modes 1, 2, 4) ────────────── */
            ) : isBillsTable ? (
              displayBills.length === 0 && !selectedDate ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground">No bill vote records found.</p>
                </div>
              ) : (
                <>
                  {/* Active date filter pill */}
                  {selectedDate && (
                    <div className="px-4 md:px-6 py-2 border-b flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Filtered to</span>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/10 text-xs font-medium hover:bg-foreground/20 transition-colors"
                      >
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="text-muted-foreground">&times;</span>
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {displayBills.length} {displayBills.length === 1 ? 'bill' : 'bills'}
                      </span>
                    </div>
                  )}
                  <div className="divide-y">
                    {/* Column headers vary by mode */}
                    {chartMode === 1 && (
                      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_44px_90px_60px_60px_60px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                        <span className={hdr} onClick={() => toggleBillSort('billTitle')}>Bill</span>
                        <span className="flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('date')}>Date</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('total')}>Total</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('yesCount')}>Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('noCount')}>No</span>
                      </div>
                    )}
                    {chartMode === 2 && (
                      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_44px_90px_60px_60px_70px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                        <span className={hdr} onClick={() => toggleBillSort('billTitle')}>Bill</span>
                        <span className="flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('date')}>Date</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('yesCount')}>Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('noCount')}>No</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('result')}>Result</span>
                      </div>
                    )}
                    {chartMode === 4 && (
                      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_44px_90px_60px_60px_70px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                        <span className={hdr} onClick={() => toggleBillSort('billTitle')}>Bill</span>
                        <span className="flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('date')}>Date</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('yesCount')}>Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('noCount')}>No</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleBillSort('margin')}>Margin</span>
                      </div>
                    )}

                    {(isAuthenticated ? displayBills.slice(0, billDisplayCount) : displayBills.slice(0, 6)).map((row) => (
                      <BillRowItem
                        key={`${chartMode}-${row.rollCallId}`}
                        row={row}
                        mode={chartMode as 1 | 2 | 4}
                        isExpanded={expandedBillRows.has(row.rollCallId)}
                        onToggle={() => toggleBillRow(row.rollCallId)}
                        onChatClick={() => handleBillChatClick(row)}
                        onDrillChatClick={(mv) => {
                          const allVotes = getBillMemberVotes(row.rollCallId);
                          const details = [
                            `Bill: ${row.billTitle || 'Untitled'} (${row.billNumber || 'no number'})`,
                            `Result: ${row.result} — ${row.yesCount} Yes, ${row.noCount} No`,
                            row.date ? `Vote Date: ${row.date}` : '',
                            '',
                            `Focus member: ${mv.name} voted ${mv.vote}`,
                            '',
                            'All member votes:',
                            ...allVotes.map(v => `- ${v.name}: ${v.vote}`),
                          ].filter(Boolean).join('\n');
                          setChatMemberName(mv.name);
                          setChatMemberParty(null);
                          setChatMemberVoteDetails(null);
                          setChatBillTitle(row.billTitle || null);
                          setChatBillNumber(row.billNumber || null);
                          setChatBillResult(row.result || null);
                          setChatBillVoteDetails(details);
                          setChatDataContext(null);
                          setChatOpen(true);
                        }}
                        getBillMemberVotes={getBillMemberVotes}
                      />
                    ))}
                  </div>
                  {!isAuthenticated && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Please log in to view all bill records.</p>
                      <Button variant="ghost" onClick={() => navigate('/auth-4')}
                        className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">Sign Up</Button>
                    </div>
                  )}
                  {isAuthenticated && billDisplayCount < displayBills.length && (
                    <div className="flex justify-center py-6">
                      <button
                        onClick={() => setBillDisplayCount((prev) => prev + 20)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Load More ({Math.min(billDisplayCount, displayBills.length)} of {displayBills.length})
                      </button>
                    </div>
                  )}
                </>
              )

            /* ── Members Tables (modes 0, 3) ─────────────── */
            ) : isMembersTable ? (
              sortedMembers.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground">No vote records found.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y">
                    {chartMode === 0 && (
                      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_44px_80px_80px_80px_80px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                        <span className={hdr} onClick={() => toggleMemberSort('name')}>Name</span>
                        <span className="flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('totalVotes')}>Votes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('yesCount')}>Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('pctYes')}>% Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('noCount')}>No</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('noCount')}>% No</span>
                      </div>
                    )}
                    {chartMode === 3 && (
                      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_44px_60px_80px_80px_80px_80px_80px] gap-4 px-6 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider bg-background sticky top-0 z-10 border-b">
                        <span className={hdr} onClick={() => toggleMemberSort('name')}>Name</span>
                        <span className="flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <span className={hdr} onClick={() => toggleMemberSort('party')}>Party</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('totalVotes')}>Votes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('yesCount')}>Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('pctYes')}>% Yes</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('noCount')}>No</span>
                        <span className={cn(hdr, "text-right")} onClick={() => toggleMemberSort('noCount')}>% No</span>
                      </div>
                    )}

                    {(isAuthenticated ? sortedMembers.slice(0, displayCount) : sortedMembers.slice(0, 6)).map((row) => (
                      <VoteRowItem
                        key={row.people_id}
                        row={row}
                        showParty={chartMode === 3}
                        isExpanded={expandedRows.has(row.people_id)}
                        onToggle={() => toggleRow(row.people_id)}
                        onChatClick={() => handleMemberChatClick(row)}
                        onDrillChatClick={(vote) => {
                          const details = [
                            `Member: ${row.name} (${row.party})`,
                            `Vote on this bill: ${vote.vote}`,
                            `Member stats: ${row.totalVotes} total votes, ${row.yesCount} Yes, ${row.noCount} No, ${row.pctYes.toFixed(0)}% Yes`,
                            '',
                            `Bill: ${vote.billTitle || 'Untitled'}`,
                            vote.billNumber ? `Bill Number: ${vote.billNumber}` : '',
                            vote.date ? `Vote Date: ${vote.date}` : '',
                          ].filter(Boolean).join('\n');
                          setChatMemberName(row.name);
                          setChatMemberParty(row.party);
                          setChatMemberVoteDetails(details);
                          setChatBillTitle(null);
                          setChatBillNumber(null);
                          setChatBillResult(null);
                          setChatBillVoteDetails(null);
                          setChatDataContext(null);
                          setChatOpen(true);
                        }}
                        getDrillDown={getDrillDown}
                      />
                    ))}
                  </div>
                  {!isAuthenticated && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Please log in to view all vote records.</p>
                      <Button variant="ghost" onClick={() => navigate('/auth-4')}
                        className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">Sign Up</Button>
                    </div>
                  )}
                  {isAuthenticated && displayCount < sortedMembers.length && (
                    <div className="flex justify-center py-6">
                      <button
                        onClick={() => setDisplayCount((prev) => prev + 20)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Load More ({Math.min(displayCount, sortedMembers.length)} of {sortedMembers.length})
                      </button>
                    </div>
                  )}
                </>
              )
            ) : null}
          </div>
      </InsetPanel>

      {/* Votes Chat Drawer */}
      <VotesChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        memberName={chatMemberName}
        memberParty={chatMemberParty}
        memberVoteDetails={chatMemberVoteDetails}
        billTitle={chatBillTitle}
        billNumber={chatBillNumber}
        billResult={chatBillResult}
        billVoteDetails={chatBillVoteDetails}
        dataContext={chatDataContext}
      />
    </div>
  );
};

// ── Legend Dot ─────────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Vote Row Component (Members table) ────────────────────────

interface VoteRowItemProps {
  row: VotesDashboardRow;
  showParty: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (vote: VotesDrillDownRow) => void;
  getDrillDown: (peopleId: number) => VotesDrillDownRow[];
}

function VoteRowItem({ row, showParty, isExpanded, onToggle, onChatClick, onDrillChatClick, getDrillDown }: VoteRowItemProps) {
  const drillDownRows = isExpanded ? getDrillDown(row.people_id) : [];
  const [drillDisplayCount, setDrillDisplayCount] = useState(20);

  // Reset display count when collapsing
  useEffect(() => {
    if (!isExpanded) setDrillDisplayCount(20);
  }, [isExpanded]);

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  const gridCols = showParty
    ? 'md:grid-cols-[minmax(0,1fr)_44px_60px_80px_80px_80px_80px_80px]'
    : 'md:grid-cols-[minmax(0,1fr)_44px_80px_80px_80px_80px_80px]';

  return (
    <div>
      <div
        onClick={onToggle}
        className={cn("group grid grid-cols-[1fr_auto] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-all duration-200 items-center", gridCols)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium truncate">{row.name}</span>
          <span className="md:hidden text-sm text-muted-foreground ml-auto pl-2 whitespace-nowrap">
            {row.totalVotes.toLocaleString()} votes
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

        {showParty && (
          <span className={cn(
            "hidden md:block text-xs font-medium px-1.5 py-0.5 rounded w-fit",
            row.party === 'D' && "bg-blue-100 text-blue-700",
            row.party === 'R' && "bg-red-100 text-red-600",
            row.party !== 'D' && row.party !== 'R' && "bg-muted text-muted-foreground"
          )}>
            {row.party}
          </span>
        )}

        <span className="hidden md:block text-right font-medium tabular-nums">{row.totalVotes.toLocaleString()}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.yesCount.toLocaleString()}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.pctYes.toFixed(0)}%</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.noCount.toLocaleString()}</span>
        <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.totalVotes > 0 ? ((row.noCount / row.totalVotes) * 100).toFixed(0) : 0}%</span>
      </div>

      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        {showParty && (
          <span className={cn(
            "font-medium px-1.5 py-0.5 rounded",
            row.party === 'D' && "bg-blue-100 text-blue-700",
            row.party === 'R' && "bg-red-100 text-red-600",
          )}>
            {row.party}
          </span>
        )}
        <span>{row.yesCount} yes ({row.pctYes.toFixed(0)}%)</span>
        <span>{row.noCount} no ({row.totalVotes > 0 ? ((row.noCount / row.totalVotes) * 100).toFixed(0) : 0}%)</span>
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && drillDownRows.length > 0 && (
        <div className="bg-muted/10 border-t border-b max-h-[400px] overflow-y-auto">
          {drillDownRows.slice(0, drillDisplayCount).map((vote, idx) => (
            <VoteDrillRow key={`${vote.billNumber}-${idx}`} vote={vote} onChatClick={() => onDrillChatClick(vote)} />
          ))}
          <div className="flex items-center justify-center gap-4 py-3">
            {drillDisplayCount < drillDownRows.length && (
              <button
                onClick={(e) => { e.stopPropagation(); setDrillDisplayCount((prev) => prev + 50); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Load more ({drillDisplayCount} of {drillDownRows.length})
              </button>
            )}
            <Link
              to={`/members/${row.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter(p => p.length > 1).join('-')}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View member <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vote Drill-Down Row ───────────────────────────────────────

function VoteDrillRow({ vote, onChatClick }: { vote: VotesDrillDownRow; onChatClick: () => void }) {
  const billUrl = vote.billNumber ? `/bills/${vote.billNumber}` : undefined;
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[60px_minmax(0,1fr)_44px_100px_60px] gap-4 px-6 py-3 pl-14 hover:bg-muted/20 transition-colors items-center group">
        {vote.billNumber && (
          <Link to={`/bills/${vote.billNumber}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit hover:bg-muted/80">
            {vote.billNumber}
          </Link>
        )}
        {!vote.billNumber && <span />}
        <Link
          to={billUrl || '#'}
          onClick={(e) => { e.stopPropagation(); if (!billUrl) e.preventDefault(); }}
          className={cn("text-sm truncate", billUrl && "hover:underline")}
          title={vote.billTitle || ''}
        >
          {vote.billTitle || 'No title'}
        </Link>
        <div className="flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onChatClick(); }}
            className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-right text-sm text-muted-foreground">
          {vote.date ? new Date(vote.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        </span>
        <span className={cn("text-right text-sm font-medium", vote.vote === 'Yes' && "text-green-600", vote.vote === 'No' && "text-red-500", vote.vote === 'Other' && "text-muted-foreground")}>
          {vote.vote}
        </span>
      </div>
      {/* Mobile */}
      <div className="md:hidden px-4 py-3 pl-10 hover:bg-muted/20 transition-colors">
        <Link
          to={billUrl || '#'}
          onClick={(e) => { e.stopPropagation(); if (!billUrl) e.preventDefault(); }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm truncate" title={vote.billTitle || ''}>{vote.billTitle || 'No title'}</span>
              {vote.billNumber && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">{vote.billNumber}</span>
              )}
            </div>
            <span className={cn("text-sm font-medium ml-2 whitespace-nowrap", vote.vote === 'Yes' && "text-green-600", vote.vote === 'No' && "text-red-500", vote.vote === 'Other' && "text-muted-foreground")}>
              {vote.vote}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {vote.date ? new Date(vote.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onChatClick(); }}
            className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Bill Row Component (Bills table — modes 1, 2, 4) ─────────

interface BillRowItemProps {
  row: BillPassFailRow;
  mode: 1 | 2 | 4;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: () => void;
  onDrillChatClick: (memberVote: BillMemberVoteRow) => void;
  getBillMemberVotes: (rollCallId: number) => BillMemberVoteRow[];
}

function BillRowItem({ row, mode, isExpanded, onToggle, onChatClick, onDrillChatClick, getBillMemberVotes }: BillRowItemProps) {
  const memberVotes = isExpanded ? getBillMemberVotes(row.rollCallId) : [];
  const margin = Math.abs(row.yesCount - row.noCount);

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatClick();
  };

  const gridCols = mode === 1
    ? 'md:grid-cols-[minmax(0,1fr)_44px_90px_60px_60px_60px]'
    : 'md:grid-cols-[minmax(0,1fr)_44px_90px_60px_60px_70px]';

  return (
    <div>
      <div
        onClick={onToggle}
        className={cn("group grid grid-cols-[1fr_auto] gap-4 px-4 md:px-6 py-4 cursor-pointer hover:bg-muted/30 transition-all duration-200 items-center", gridCols)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium truncate max-w-[50vw]" title={row.billTitle || 'No title'}>{row.billTitle || 'No title'}</span>
          {row.billNumber && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">{row.billNumber}</span>
          )}
          {/* Mobile: last column value */}
          <span className={cn(
            "md:hidden text-sm font-medium ml-auto pl-2 whitespace-nowrap",
            mode === 2 && row.result === 'Passed' && "text-green-600",
            mode === 2 && row.result === 'Failed' && "text-red-500",
          )}>
            {mode === 1 ? `${row.yesCount + row.noCount}` : mode === 2 ? row.result : margin}
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

        <span className="hidden md:block text-right text-sm text-muted-foreground whitespace-nowrap">
          {row.date ? new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        </span>

        {mode === 1 ? (
          <>
            <span className="hidden md:block text-right text-sm font-medium tabular-nums">{(row.yesCount + row.noCount).toLocaleString()}</span>
            <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.yesCount.toLocaleString()}</span>
            <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.noCount.toLocaleString()}</span>
          </>
        ) : (
          <>
            <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.yesCount.toLocaleString()}</span>
            <span className="hidden md:block text-right text-sm tabular-nums text-muted-foreground">{row.noCount.toLocaleString()}</span>
            {mode === 2 ? (
              <span className={cn("hidden md:block text-right text-sm font-medium", row.result === 'Passed' && "text-green-600", row.result === 'Failed' && "text-red-500")}>
                {row.result}
              </span>
            ) : (
              <span className="hidden md:block text-right text-sm font-medium tabular-nums">{margin}</span>
            )}
          </>
        )}
      </div>

      <div className="md:hidden px-4 pb-3 -mt-2 flex items-center gap-3 text-xs text-muted-foreground pl-10">
        <span>{row.yesCount} yes</span>
        <span>{row.noCount} no</span>
        {row.date && (
          <span>{new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
        <button
          onClick={handleChatClick}
          className="ml-auto w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && memberVotes.length > 0 && (
        <div className="bg-muted/10 border-t border-b">
          {memberVotes.map((mv, idx) => (
            <BillMemberVoteDrillRow key={`${mv.name}-${idx}`} memberVote={mv} onChatClick={() => onDrillChatClick(mv)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bill Member Vote Drill-Down Row ──────────────────────────

function BillMemberVoteDrillRow({ memberVote, onChatClick }: { memberVote: BillMemberVoteRow; onChatClick: () => void }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[1fr_44px_80px] gap-4 px-6 py-3 pl-14 hover:bg-muted/20 transition-colors items-center group">
        <span className="text-sm truncate">{memberVote.name}</span>
        <div className="flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onChatClick(); }}
            className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/80"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className={cn("text-right text-sm font-medium", memberVote.vote === 'Yes' && "text-green-600", memberVote.vote === 'No' && "text-red-500", memberVote.vote === 'Other' && "text-muted-foreground")}>
          {memberVote.vote}
        </span>
      </div>
      {/* Mobile */}
      <div className="md:hidden px-4 py-3 pl-10">
        <div className="flex items-center justify-between">
          <span className="text-sm truncate">{memberVote.name}</span>
          <span className={cn("text-sm font-medium ml-2 whitespace-nowrap", memberVote.vote === 'Yes' && "text-green-600", memberVote.vote === 'No' && "text-red-500", memberVote.vote === 'Other' && "text-muted-foreground")}>
            {memberVote.vote}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>{memberVote.vote}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onChatClick(); }}
            className="ml-auto w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  );
}

export default VotesDashboard;
