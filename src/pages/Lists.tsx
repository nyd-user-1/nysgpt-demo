import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChatHeader } from '@/components/ChatHeader';
import FooterSimple from '@/components/marketing/FooterSimple';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown, Users, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Lists() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pageTab, setPageTab] = useState<'members' | 'lobbyists'>('members');

  // Sync tab from URL search params (e.g., /lists?tab=lobbyists)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'lobbyists') setPageTab('lobbyists');
    else if (tab === 'members') setPageTab('members');
  }, [searchParams]);
  const [memberSearch, setMemberSearch] = useState('');
  const [lobbyingSearch, setLobbyingSearch] = useState('');
  const [lobbyistVisibleCount, setLobbyistVisibleCount] = useState(10);
  const [memberVisibleCount, setMemberVisibleCount] = useState(14);
  const [sponsoredSort, setSponsoredSort] = useState<'desc' | 'asc'>('desc');
  const [yesSort, setYesSort] = useState<'desc' | 'asc'>('desc');
  const [noSort, setNoSort] = useState<'desc' | 'asc'>('desc');

  // -----------------------------------------------------------------------
  // Supabase: top members by # of bills sponsored
  // -----------------------------------------------------------------------
  const { data: topMembers } = useQuery({
    queryKey: ['lists-members'],
    queryFn: async () => {
      const { data: sponsors } = await supabase
        .from('Sponsors')
        .select('people_id')
        .limit(10000);

      if (!sponsors) return [];

      const counts: Record<number, number> = {};
      sponsors.forEach((s: any) => {
        counts[s.people_id] = (counts[s.people_id] || 0) + 1;
      });

      const topIds = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([id]) => parseInt(id));

      const { data: members } = await supabase
        .from('People')
        .select('people_id, name, first_name, last_name, party, chamber, photo_url')
        .in('people_id', topIds);

      if (!members) return [];

      return members
        .map((m: any) => ({ ...m, billCount: counts[m.people_id] || 0 }))
        .sort((a: any, b: any) => b.billCount - a.billCount);
    },
    staleTime: 10 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: members by yes votes (from pre-computed tallies table)
  // -----------------------------------------------------------------------
  const { data: membersByYesVotes } = useQuery({
    queryKey: ['lists-members-yes-votes'],
    queryFn: async () => {
      const { data: tallies } = await supabase
        .from('member_vote_tallies')
        .select('people_id, yea_count')
        .order('yea_count', { ascending: false })
        .limit(50);

      if (!tallies || tallies.length === 0) return [];

      const topIds = tallies.map((t: any) => t.people_id);
      const yeaCounts: Record<number, number> = {};
      tallies.forEach((t: any) => {
        yeaCounts[t.people_id] = t.yea_count;
      });

      const { data: members } = await supabase
        .from('People')
        .select('people_id, name, first_name, last_name, party, chamber, photo_url')
        .in('people_id', topIds);

      if (!members) return [];

      return members
        .map((m: any) => ({ ...m, yeaCount: yeaCounts[m.people_id] || 0 }))
        .sort((a: any, b: any) => b.yeaCount - a.yeaCount);
    },
    staleTime: 10 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: members by no votes (from pre-computed tallies table)
  // -----------------------------------------------------------------------
  const { data: membersByNoVotes } = useQuery({
    queryKey: ['lists-members-no-votes'],
    queryFn: async () => {
      const { data: tallies } = await supabase
        .from('member_vote_tallies')
        .select('people_id, no_count')
        .order('no_count', { ascending: false })
        .limit(50);

      if (!tallies || tallies.length === 0) return [];

      const topIds = tallies.map((t: any) => t.people_id);
      const noCounts: Record<number, number> = {};
      tallies.forEach((t: any) => {
        noCounts[t.people_id] = t.no_count;
      });

      const { data: members } = await supabase
        .from('People')
        .select('people_id, name, first_name, last_name, party, chamber, photo_url')
        .in('people_id', topIds);

      if (!members) return [];

      return members
        .map((m: any) => ({ ...m, noCount: noCounts[m.people_id] || 0 }))
        .sort((a: any, b: any) => b.noCount - a.noCount);
    },
    staleTime: 10 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: top lobbyists by earnings
  // -----------------------------------------------------------------------
  const { data: lobbyistsByEarnings } = useQuery({
    queryKey: ['lists-lobbyists-earnings-2025'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lobbyist_compensation')
        .select('principal_lobbyist, grand_total_compensation_expenses')
        .eq('year', 2025)
        .order('grand_total_compensation_expenses', { ascending: false })
        .limit(50);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: top lobbyists by client count
  // -----------------------------------------------------------------------
  const { data: lobbyistsByClients } = useQuery({
    queryKey: ['lists-lobbyists-clients'],
    queryFn: async () => {
      let allClients: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('lobbyists_clients')
          .select('principal_lobbyist')
          .range(offset, offset + batchSize - 1);

        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          allClients = allClients.concat(batch);
          hasMore = batch.length === batchSize;
          offset += batchSize;
        }
      }

      const clientCounts: Record<string, number> = {};
      allClients.forEach((c: any) => {
        if (c.principal_lobbyist) {
          clientCounts[c.principal_lobbyist] = (clientCounts[c.principal_lobbyist] || 0) + 1;
        }
      });

      return Object.entries(clientCounts)
        .map(([name, count]) => ({ principal_lobbyist: name, clientCount: count }))
        .sort((a, b) => b.clientCount - a.clientCount)
        .slice(0, 50);
    },
    staleTime: 10 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: top lobbyists by employee count (individual lobbyists)
  // -----------------------------------------------------------------------
  const { data: lobbyistsByEmployees } = useQuery({
    queryKey: ['lists-lobbyists-employees'],
    queryFn: async () => {
      let allEmployees: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('Individual_Lobbyists')
          .select('principal_lobbyist_name')
          .range(offset, offset + batchSize - 1);

        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          allEmployees = allEmployees.concat(batch);
          hasMore = batch.length === batchSize;
          offset += batchSize;
        }
      }

      const employeeCounts: Record<string, number> = {};
      allEmployees.forEach((e: any) => {
        if (e.principal_lobbyist_name) {
          employeeCounts[e.principal_lobbyist_name] = (employeeCounts[e.principal_lobbyist_name] || 0) + 1;
        }
      });

      return Object.entries(employeeCounts)
        .map(([name, count]) => ({ principal_lobbyist: name, employeeCount: count }))
        .sort((a, b) => b.employeeCount - a.employeeCount)
        .slice(0, 50);
    },
    staleTime: 10 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: YoY change data for lobbyists
  // -----------------------------------------------------------------------
  const { data: lobbyistYoY } = useQuery({
    queryKey: ['lists-lobbyists-yoy'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lobbyist_compensation_yoy')
        .select('principal_lobbyist, pct_change');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build YoY lookup map
  const yoyMap = new Map<string, number | null>();
  if (lobbyistYoY) {
    lobbyistYoY.forEach((row: any) => {
      if (row.principal_lobbyist) {
        yoyMap.set(row.principal_lobbyist, row.pct_change);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const makeMemberSlug = (m: any): string => {
    const raw = m.name || `${m.first_name || ''} ${m.last_name || ''}`;
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((p: string) => p.length > 1)
      .join('-');
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Pill tab toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-muted/50 rounded-full p-1">
              {(['members', 'lobbyists'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPageTab(tab)}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    pageTab === tab
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'members' ? 'Members' : 'Lobbyists'}
                </button>
              ))}
            </div>
          </div>

          {pageTab === 'members' && (
            <>
              {/* Members Section */}
              <div className="pt-0 pb-12">
                {/* Heading Block */}
                <div className="mb-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                        Members
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        By Bills, Yes Vote, and No Vote.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full md:w-64">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                          type="search"
                          placeholder="Search..."
                          className="pl-8"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  {/* ------ Sponsored (members by bills sponsored) ------ */}
                  <div className="md:border-r-2 md:border-dotted md:border-border/80 md:pr-6 pb-8 md:pb-0">
                    <button
                      onClick={() => setSponsoredSort(s => s === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 hover:text-foreground transition-colors"
                    >
                      Sponsored
                      {sponsoredSort === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    </button>
                    <div className="divide-y-2 divide-dotted divide-border/80">
                      {(topMembers || [])
                        .filter((m: any) => !memberSearch || m.name?.toLowerCase().includes(memberSearch.toLowerCase()))
                        .sort((a: any, b: any) => sponsoredSort === 'desc' ? b.billCount - a.billCount : a.billCount - b.billCount)
                        .slice(0, memberVisibleCount).map((m: any) => (
                        <div key={m.people_id} className="py-3 first:pt-0">
                          <Link
                            to={`/members/${makeMemberSlug(m)}`}
                            className="group flex items-center gap-3 py-2 bg-muted/50 hover:bg-muted/60 hover:shadow-md px-4 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                          >
                            {m.photo_url ? (
                              <img
                                src={m.photo_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.party} · {m.chamber}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prompt = `Tell me about ${m.name} and their legislative record`;
                                navigate(`/?prompt=${encodeURIComponent(prompt)}`);
                              }}
                              className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Ask about ${m.name}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-foreground">
                              {m.billCount}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ------ Yes Votes (members by Yes votes) ------ */}
                  <div className="md:border-r-2 md:border-dotted md:border-border/80 md:px-6 border-t-2 border-dotted border-border/80 md:border-t-0 pt-8 md:pt-0 pb-8 md:pb-0">
                    <button
                      onClick={() => setYesSort(s => s === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 hover:text-foreground transition-colors"
                    >
                      Yes Votes
                      {yesSort === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    </button>
                    <div className="divide-y-2 divide-dotted divide-border/80">
                      {(membersByYesVotes || [])
                        .filter((m: any) => !memberSearch || m.name?.toLowerCase().includes(memberSearch.toLowerCase()))
                        .sort((a: any, b: any) => yesSort === 'desc' ? b.yeaCount - a.yeaCount : a.yeaCount - b.yeaCount)
                        .slice(0, memberVisibleCount).map((m: any) => (
                        <div key={m.people_id} className="py-3 first:pt-0">
                          <Link
                            to={`/members/${makeMemberSlug(m)}`}
                            className="group flex items-center gap-3 py-2 bg-muted/50 hover:bg-muted/60 hover:shadow-md px-4 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                          >
                            {m.photo_url ? (
                              <img
                                src={m.photo_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.party} · {m.chamber}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prompt = `Tell me about ${m.name} and their voting record`;
                                navigate(`/?prompt=${encodeURIComponent(prompt)}`);
                              }}
                              className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Ask about ${m.name}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-foreground">
                              {m.yeaCount}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ------ No Votes (members by No votes) ------ */}
                  <div className="md:pl-6 border-t-2 border-dotted border-border/80 md:border-t-0 pt-8 md:pt-0">
                    <button
                      onClick={() => setNoSort(s => s === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 hover:text-foreground transition-colors"
                    >
                      No Votes
                      {noSort === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    </button>
                    <div className="divide-y-2 divide-dotted divide-border/80">
                      {(membersByNoVotes || [])
                        .filter((m: any) => !memberSearch || m.name?.toLowerCase().includes(memberSearch.toLowerCase()))
                        .sort((a: any, b: any) => noSort === 'desc' ? b.noCount - a.noCount : a.noCount - b.noCount)
                        .slice(0, memberVisibleCount).map((m: any) => (
                        <div key={m.people_id} className="py-3 first:pt-0">
                          <Link
                            to={`/members/${makeMemberSlug(m)}`}
                            className="group flex items-center gap-3 py-2 bg-muted/50 hover:bg-muted/60 hover:shadow-md px-4 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                          >
                            {m.photo_url ? (
                              <img
                                src={m.photo_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.party} · {m.chamber}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prompt = `Tell me about ${m.name} and their voting record`;
                                navigate(`/?prompt=${encodeURIComponent(prompt)}`);
                              }}
                              className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Ask about ${m.name}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-foreground">
                              {m.noCount}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Load More button for Members */}
                {memberVisibleCount < Math.max(
                  (topMembers || []).length,
                  (membersByYesVotes || []).length,
                  (membersByNoVotes || []).length
                ) && (
                  <div className="flex justify-center py-8">
                    <button
                      onClick={() => setMemberVisibleCount((prev) => prev + 14)}
                      className="rounded-lg border border-border bg-muted/30 px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:shadow-lg transition-all"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {pageTab === 'lobbyists' && (
            <>
              {/* Lobbyists Section */}
              <div className="pt-0 pb-12">
                {/* Heading Block */}
                <div className="mb-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                        Lobbyists
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        By earnings, clients, and staff
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full md:w-64">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                          type="search"
                          placeholder="Search..."
                          className="pl-8"
                          value={lobbyingSearch}
                          onChange={(e) => setLobbyingSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  {/* ------ Earnings ------ */}
                  <div className="md:border-r-2 md:border-dotted md:border-border/80 md:pr-6 pb-8 md:pb-0">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Earnings
                    </h3>
                    <div className="divide-y-2 divide-dotted divide-border/80">
                      {(lobbyistsByEarnings || [])
                        .filter((l: any) => !lobbyingSearch || l.principal_lobbyist?.toLowerCase().includes(lobbyingSearch.toLowerCase()))
                        .slice(0, lobbyistVisibleCount).map((l: any, idx: number) => {
                        const amount = typeof l.grand_total_compensation_expenses === 'number'
                          ? l.grand_total_compensation_expenses
                          : parseFloat(String(l.grand_total_compensation_expenses || '0').replace(/[$,]/g, ''));
                        const formatted = amount >= 1_000_000
                          ? `$${(amount / 1_000_000).toFixed(1)}M`
                          : amount >= 1_000
                            ? `$${(amount / 1_000).toFixed(0)}K`
                            : `$${amount.toFixed(0)}`;
                        const pctChange = yoyMap.get(l.principal_lobbyist);
                        return (
                          <div key={idx} className="py-3 first:pt-0">
                            <Link
                              to="/charts/lobbying"
                              className="group flex items-center gap-3 py-2 bg-muted/50 hover:bg-muted/60 hover:shadow-md px-4 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{l.principal_lobbyist}</p>
                                {pctChange !== null && pctChange !== undefined && (
                                  <p className={`text-xs flex items-center gap-1 ${pctChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {pctChange >= 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const prompt = `Tell me about ${l.principal_lobbyist} as a lobbyist in New York State`;
                                  navigate(`/?prompt=${encodeURIComponent(prompt)}`);
                                }}
                                className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={`Ask about ${l.principal_lobbyist}`}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <span className="text-sm font-medium text-foreground">
                                {formatted}
                              </span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ------ Clients ------ */}
                  <div className="md:border-r-2 md:border-dotted md:border-border/80 md:px-6 border-t-2 border-dotted border-border/80 md:border-t-0 pt-8 md:pt-0 pb-8 md:pb-0">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Clients
                    </h3>
                    <div className="divide-y-2 divide-dotted divide-border/80">
                      {(lobbyistsByClients || [])
                        .filter((l: any) => !lobbyingSearch || l.principal_lobbyist?.toLowerCase().includes(lobbyingSearch.toLowerCase()))
                        .slice(0, lobbyistVisibleCount).map((l: any, idx: number) => (
                        <div key={idx} className="py-3 first:pt-0">
                          <Link
                            to="/charts/lobbying"
                            className="group flex items-center gap-3 py-2 bg-muted/50 hover:bg-muted/60 hover:shadow-md px-4 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{l.principal_lobbyist}</p>
                              <p className="text-xs text-muted-foreground">2025</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prompt = `Tell me about ${l.principal_lobbyist} and their ${l.clientCount} clients in New York State`;
                                navigate(`/?prompt=${encodeURIComponent(prompt)}`);
                              }}
                              className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Ask about ${l.principal_lobbyist}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-foreground">
                              {l.clientCount}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ------ Individual Lobbyists ------ */}
                  <div className="md:pl-6 border-t-2 border-dotted border-border/80 md:border-t-0 pt-8 md:pt-0">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Individual Lobbyists
                    </h3>
                    <div className="divide-y-2 divide-dotted divide-border/80">
                      {(lobbyistsByEmployees || [])
                        .filter((l: any) => !lobbyingSearch || l.principal_lobbyist?.toLowerCase().includes(lobbyingSearch.toLowerCase()))
                        .slice(0, lobbyistVisibleCount).map((l: any, idx: number) => (
                        <div key={idx} className="py-3 first:pt-0">
                          <Link
                            to="/charts/lobbying"
                            className="group flex items-center gap-3 py-2 bg-muted/50 hover:bg-muted/60 hover:shadow-md px-4 rounded-lg transition-all duration-200 border border-transparent hover:border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{l.principal_lobbyist}</p>
                              <p className="text-xs text-muted-foreground">2025</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prompt = `Tell me about ${l.principal_lobbyist} and their ${l.employeeCount} lobbyists in New York State`;
                                navigate(`/?prompt=${encodeURIComponent(prompt)}`);
                              }}
                              className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Ask about ${l.principal_lobbyist}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-foreground">
                              {l.employeeCount}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Load More button */}
                {lobbyistVisibleCount < Math.max(
                  (lobbyistsByEarnings || []).length,
                  (lobbyistsByClients || []).length,
                  (lobbyistsByEmployees || []).length
                ) && (
                  <div className="flex justify-center py-8">
                    <button
                      onClick={() => setLobbyistVisibleCount((prev) => prev + 10)}
                      className="rounded-lg border border-border bg-muted/30 px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:shadow-lg transition-all"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      <FooterSimple />
    </div>
  );
}
