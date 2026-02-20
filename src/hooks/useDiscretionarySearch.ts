import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Discretionary } from '@/types/discretionary';

const PAGE_SIZE = 100;

export function useDiscretionarySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [fundTypeFilter, setFundTypeFilter] = useState('');
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['discretionary', searchTerm, agencyFilter, fundTypeFilter, sponsorFilter, yearFilter],
    queryFn: async () => {
      let query = supabase
        .from('Discretionary')
        .select('*', { count: 'exact' });

      query = applyFilters(query);

      query = query
        .order('year', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

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
      query = query
        .order('year', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

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

  const grants = allGrants;
  const totalCount = data?.totalCount || 0;

  const { data: filterOptions } = useQuery({
    queryKey: ['discretionary-filter-options'],
    queryFn: async () => {
      // Fetch from both ends (oldest + newest) to ensure all distinct values are captured
      // Supabase caps at 1000 rows regardless of .limit()
      const [agencyRes, agencyRes2, fundRes, sponsorRes, yearAsc, yearDesc] = await Promise.all([
        supabase.from('Discretionary').select('agency_name').not('agency_name', 'is', null).order('agency_name').limit(1000),
        supabase.from('Discretionary').select('agency_name').not('agency_name', 'is', null).order('agency_name', { ascending: false }).limit(1000),
        supabase.from('Discretionary').select('fund_type').not('fund_type', 'is', null).limit(1000),
        supabase.from('Discretionary').select('Sponsor').not('Sponsor', 'is', null).limit(1000),
        supabase.from('Discretionary').select('year').not('year', 'is', null).order('year').limit(1000),
        supabase.from('Discretionary').select('year').not('year', 'is', null).order('year', { ascending: false }).limit(1000),
      ]);

      const allAgencies = [...(agencyRes.data || []), ...(agencyRes2.data || [])];
      const agencies = [...new Set(allAgencies.map(d => d.agency_name))].filter(Boolean).sort() as string[];
      const fundTypes = [...new Set(fundRes.data?.map(d => d.fund_type))].filter(Boolean).sort() as string[];
      const sponsors = [...new Set(sponsorRes.data?.map(d => d.Sponsor))].filter(Boolean).sort() as string[];
      const allYears = [...(yearAsc.data || []), ...(yearDesc.data || [])];
      const years = [...new Set(allYears.map(d => String(d.year)))].filter(Boolean).sort().reverse() as string[];

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
  };
}
