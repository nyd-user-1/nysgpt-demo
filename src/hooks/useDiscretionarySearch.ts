import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Discretionary } from '@/types/discretionary';

const PAGE_SIZE = 100;

// Parse "$15,000" / "-$40,000" → number
function parseGrantAmount(amount: string | null): number | null {
  if (!amount || amount.trim() === '') return null;
  const num = parseFloat(amount.replace(/[,$]/g, ''));
  return isNaN(num) ? null : num;
}

// Non-linear amount steps matching actual data distribution
// Most grants cluster $5K–$100K, with a long tail to $10M
export const AMOUNT_STEPS = [
  0, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000,
  30000, 40000, 50000, 75000, 100000, 150000, 200000, 250000,
  500000, 750000, 1000000, 2500000, 5000000, 10000000,
] as const;

export const AMOUNT_SLIDER_MIN = 0;
export const AMOUNT_SLIDER_MAX = AMOUNT_STEPS.length - 1;

// Slider index → dollar amount
export function sliderToAmount(index: number): number {
  return AMOUNT_STEPS[Math.round(Math.min(Math.max(index, 0), AMOUNT_SLIDER_MAX))];
}

// Format slider amount for display
export function formatSliderAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function useDiscretionarySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [fundTypeFilter, setFundTypeFilter] = useState('');
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [amountRange, setAmountRange] = useState<[number, number]>([AMOUNT_SLIDER_MIN, AMOUNT_SLIDER_MAX]);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [allGrants, setAllGrants] = useState<Discretionary[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const applyFilters = (query: any) => {
    if (searchTerm && searchTerm.length >= 2) {
      query = query.or(
        `Grantee.ilike.%${searchTerm}%,Description of Grant.ilike.%${searchTerm}%,Sponsor.ilike.%${searchTerm}%,agency_name.ilike.%${searchTerm}%`
      );
    }
    if (agencyFilter) {
      query = query.eq('agency_name', agencyFilter);
    }
    if (fundTypeFilter) {
      query = query.eq('fund_type', fundTypeFilter);
    }
    if (sponsorFilter) {
      query = query.eq('Sponsor', sponsorFilter);
    }
    if (yearFilter) {
      query = query.eq('year', Number(yearFilter));
    }
    return query;
  };

  const applySort = (query: any) => {
    switch (sortBy) {
      case 'oldest':
        return query.order('year', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
      case 'amount-desc':
        return query.order('Grant Amount', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
      case 'amount-asc':
        return query.order('Grant Amount', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
      case 'az':
        return query.order('Grantee', { ascending: true, nullsFirst: false });
      case 'newest':
      default:
        return query.order('year', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['discretionary', searchTerm, agencyFilter, fundTypeFilter, sponsorFilter, yearFilter, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('Discretionary')
        .select('*', { count: 'exact' });

      query = applyFilters(query);
      query = applySort(query);
      query = query.limit(PAGE_SIZE);

      const { data, error, count } = await query;
      if (error) throw error;
      return { grants: data as Discretionary[], totalCount: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (data) {
      setAllGrants(data.grants);
      setOffset(PAGE_SIZE);
      setHasMore(data.grants.length === PAGE_SIZE);
    }
  }, [data]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      let query = supabase.from('Discretionary').select('*');
      query = applyFilters(query);
      query = applySort(query);
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data: moreData, error: err } = await query;
      if (err) throw err;
      const rows = (moreData as Discretionary[]) || [];
      setAllGrants(prev => [...prev, ...rows]);
      setOffset(prev => prev + PAGE_SIZE);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more discretionary error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const amountFilterActive = amountRange[0] !== AMOUNT_SLIDER_MIN || amountRange[1] !== AMOUNT_SLIDER_MAX;
  const grants = amountFilterActive
    ? allGrants.filter(g => {
        const amt = parseGrantAmount(g["Grant Amount"]);
        if (amt === null) return false;
        const lo = sliderToAmount(amountRange[0]);
        const hi = sliderToAmount(amountRange[1]);
        return amt >= lo && amt <= hi;
      })
    : allGrants;
  const totalCount = data?.totalCount || 0;

  const { data: filterOptions } = useQuery({
    queryKey: ['discretionary-filter-options'],
    queryFn: async () => {
      // Fetch filter options
      // For years: Supabase caps at 1000 rows, so heavy years (2022=3986 rows)
      // prevent dedup from seeing all values. Use HEAD requests per year instead.
      const currentYear = new Date().getFullYear();
      const possibleYears = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);
      const yearChecks = await Promise.all(
        possibleYears.map(y =>
          supabase.from('Discretionary').select('id', { count: 'exact', head: true }).eq('year', y)
        )
      );
      const years = possibleYears
        .filter((_, i) => (yearChecks[i].count ?? 0) > 0)
        .map(String);

      // Agencies, fund types, sponsors have few distinct values — 1000 rows is enough
      const [agencyRes, fundRes, sponsorRes] = await Promise.all([
        supabase.from('Discretionary').select('agency_name').not('agency_name', 'is', null).limit(1000),
        supabase.from('Discretionary').select('fund_type').not('fund_type', 'is', null).limit(1000),
        supabase.from('Discretionary').select('Sponsor').not('Sponsor', 'is', null).limit(1000),
      ]);

      const agencies = [...new Set(agencyRes.data?.map(d => d.agency_name))].filter(Boolean).sort() as string[];
      const fundTypes = [...new Set(fundRes.data?.map(d => d.fund_type))].filter(Boolean).sort() as string[];
      const sponsors = [...new Set(sponsorRes.data?.map(d => d.Sponsor))].filter(Boolean).sort() as string[];

      return { agencies, fundTypes, sponsors, years };
    },
    staleTime: 30 * 60 * 1000,
  });

  return {
    grants,
    totalCount,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    agencies: filterOptions?.agencies || [],
    fundTypes: filterOptions?.fundTypes || [],
    sponsors: filterOptions?.sponsors || [],
    years: filterOptions?.years || [],
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
    sortBy,
    setSortBy,
  };
}
