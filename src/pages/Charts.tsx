import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatHeader } from '@/components/ChatHeader';
import FooterSimple from '@/components/marketing/FooterSimple';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useVotesDashboard } from '@/hooks/useVotesDashboard';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
} from 'recharts';

export default function Charts() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const votes = useVotesDashboard();

  const chartCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  }, []);

  const chartPreviews = useMemo(() => [
    {
      label: 'Votes by Day',
      desc: 'Yes vs. No votes cast per day',
      data: votes.chartData.filter((p) => p.date >= chartCutoff),
      areas: [
        { key: 'yes', stroke: 'hsl(142 76% 36%)', id: 'prevYes' },
        { key: 'no', stroke: 'hsl(0 84% 60%)', id: 'prevNo' },
      ],
    },
    {
      label: 'Roll Calls',
      desc: 'Number of roll call votes per day',
      data: votes.rollCallsPerDay.filter((p) => p.date >= chartCutoff),
      areas: [
        { key: 'rollCalls', stroke: 'hsl(217 91% 60%)', id: 'prevRC' },
      ],
    },
    {
      label: 'Passed vs. Failed',
      desc: 'Bills that passed or failed each day',
      data: votes.passFailPerDay.filter((p) => p.date >= chartCutoff),
      areas: [
        { key: 'passed', stroke: 'hsl(142 76% 36%)', id: 'prevPass' },
        { key: 'failed', stroke: 'hsl(0 84% 60%)', id: 'prevFail' },
      ],
    },
    {
      label: 'By Party',
      desc: 'Democrat vs. Republican yes votes',
      data: votes.partyPerDay.filter((p) => p.date >= chartCutoff),
      areas: [
        { key: 'demYes', stroke: 'hsl(217 91% 60%)', id: 'prevDem' },
        { key: 'repYes', stroke: 'hsl(0 84% 60%)', id: 'prevRep' },
      ],
    },
    {
      label: 'Closest Votes',
      desc: 'Average vote margin per day',
      data: votes.marginPerDay.filter((p) => p.date >= chartCutoff),
      areas: [
        { key: 'avgMargin', stroke: 'hsl(280 67% 55%)', id: 'prevMargin' },
      ],
    },
  ], [votes.chartData, votes.rollCallsPerDay, votes.passFailPerDay, votes.partyPerDay, votes.marginPerDay, chartCutoff]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="pt-0 pb-12">
            <div className="mb-8">
              <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                Charts
              </h2>
              <p className="text-muted-foreground mt-2">
                Explore NYS data dashboards
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* Dashboard navigation cards */}
              {[
                { path: '/charts/budget', label: 'Budget', desc: 'NYS budget spending', color: 'hsl(160 60% 45%)', id: 'lBudget',
                  data: [{x:0,y:8},{x:1,y:10},{x:2,y:14},{x:3,y:18},{x:4,y:16},{x:5,y:20},{x:6,y:22},{x:7,y:19},{x:8,y:24},{x:9,y:28}] },
                { path: '/charts/lobbying', label: 'Lobbying', desc: 'Lobbyist compensation', color: 'hsl(217 91% 60%)', id: 'lLobby',
                  data: [{x:0,y:6},{x:1,y:8},{x:2,y:10},{x:3,y:12},{x:4,y:14},{x:5,y:16},{x:6,y:18},{x:7,y:22},{x:8,y:24},{x:9,y:28}] },
                { path: '/charts/contracts', label: 'Contracts', desc: 'State contracts', color: 'hsl(32 95% 50%)', id: 'lContract',
                  data: [{x:0,y:14},{x:1,y:12},{x:2,y:16},{x:3,y:14},{x:4,y:18},{x:5,y:16},{x:6,y:20},{x:7,y:18},{x:8,y:22},{x:9,y:24}] },
              ].map((d) => (
                <button
                  key={d.path}
                  onClick={() => navigate(d.path)}
                  className="group text-left rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:shadow-lg hover:border-border/80 transition-all duration-200 overflow-hidden"
                >
                  <div className="h-32 px-2 pt-3">
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
                  <div className="px-4 pb-4 pt-2">
                    <p className="font-semibold text-sm group-hover:text-foreground transition-colors">{d.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                  </div>
                </button>
              ))}

              {/* Contract chart mode cards */}
              {[
                { path: '/charts/contracts/by-month', label: 'Contracts by Month', desc: 'New contracts per month', color: 'hsl(142 76% 36%)', id: 'cMonth', type: 'area' as const,
                  data: [{x:0,y:30},{x:1,y:45},{x:2,y:38},{x:3,y:52},{x:4,y:48},{x:5,y:60},{x:6,y:55},{x:7,y:70},{x:8,y:65},{x:9,y:80}] },
                { path: '/charts/contracts/by-top-vendors', label: 'Top Vendors', desc: 'Vendors by contract value', color: 'hsl(32 95% 50%)', id: 'cVendor', type: 'bar' as const,
                  data: [{x:0,y:80},{x:1,y:65},{x:2,y:55},{x:3,y:45},{x:4,y:38},{x:5,y:30},{x:6,y:25},{x:7,y:20},{x:8,y:15},{x:9,y:10}] },
                { path: '/charts/contracts/by-duration', label: 'Contract Duration', desc: 'Contracts by duration', color: 'hsl(280 67% 55%)', id: 'cDuration', type: 'bar' as const,
                  data: [{x:0,y:40},{x:1,y:70},{x:2,y:55},{x:3,y:30},{x:4,y:90},{x:5,y:15}] },
                { path: '/charts/contracts/by-expiration', label: 'Expiring Contracts', desc: 'Contracts by expiration', color: 'hsl(0 84% 60%)', id: 'cExpire', type: 'bar' as const,
                  data: [{x:0,y:60},{x:1,y:20},{x:2,y:30},{x:3,y:25},{x:4,y:35},{x:5,y:40},{x:6,y:50}] },
                { path: '/charts/contracts/by-spend', label: 'Spend Utilization', desc: 'Contracts by spend rate', color: 'hsl(180 60% 45%)', id: 'cSpend', type: 'bar' as const,
                  data: [{x:0,y:30},{x:1,y:45},{x:2,y:55},{x:3,y:40},{x:4,y:35},{x:5,y:15}] },
                { path: '/charts/revenue', label: 'Revenue', desc: 'NYS revenue by fund group', color: 'hsl(160 60% 45%)', id: 'cRevenue', type: 'bar' as const,
                  data: [{x:0,y:70},{x:1,y:55},{x:2,y:45},{x:3,y:35},{x:4,y:25},{x:5,y:20},{x:6,y:15},{x:7,y:10}] },
                { path: '/charts/capital', label: 'Capital Appropriations', desc: 'Capital budget by agency', color: 'hsl(217 91% 60%)', id: 'cCapital', type: 'bar' as const,
                  data: [{x:0,y:80},{x:1,y:60},{x:2,y:50},{x:3,y:40},{x:4,y:30},{x:5,y:25},{x:6,y:20}] },
                { path: '/charts/discretionary', label: 'Discretionary', desc: 'Discretionary grants by agency', color: 'hsl(280 67% 55%)', id: 'cDiscretionary', type: 'bar' as const,
                  data: [{x:0,y:65},{x:1,y:50},{x:2,y:40},{x:3,y:30},{x:4,y:22},{x:5,y:18},{x:6,y:12}] },
              ].map((d) => (
                <button
                  key={d.path}
                  onClick={() => navigate(d.path)}
                  className="group text-left rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:shadow-lg hover:border-border/80 transition-all duration-200 overflow-hidden"
                >
                  <div className="h-32 px-2 pt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      {d.type === 'area' ? (
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
                      ) : (
                        <BarChart data={d.data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                          <Bar dataKey="y" fill={d.color} radius={[2, 2, 0, 0]} animationDuration={500} />
                          <XAxis dataKey="x" hide />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div className="px-4 pb-4 pt-2">
                    <p className="font-semibold text-sm group-hover:text-foreground transition-colors">{d.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                  </div>
                </button>
              ))}

              {/* Vote chart cards */}
              {chartPreviews.map((chart, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(idx === 0 ? '/charts/votes' : `/charts/votes/${['by-roll-call', 'by-pass-fail', 'by-party', 'by-closest'][idx - 1]}`)}
                  className="group text-left rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:shadow-lg hover:border-border/80 transition-all duration-200 overflow-hidden"
                >
                  <div className="h-32 px-2 pt-3">
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
                            <Area
                              key={a.key}
                              type="monotone"
                              dataKey={a.key}
                              stroke={a.stroke}
                              strokeWidth={1.5}
                              fill={`url(#${a.id})`}
                              dot={false}
                              animationDuration={500}
                            />
                          ))}
                          <XAxis dataKey="date" hide />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    )}
                  </div>
                  <div className="px-4 pb-4 pt-2">
                    <p className="font-semibold text-sm group-hover:text-foreground transition-colors">{chart.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{chart.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {!isAuthenticated && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Please log in to explore all NYS data.
                </p>
                <Button variant="ghost" onClick={() => navigate('/auth-4')}
                  className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterSimple />
    </div>
  );
}
