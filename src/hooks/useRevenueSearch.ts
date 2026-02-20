import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Revenue, FISCAL_YEARS } from '@/types/revenue';

const PAGE_SIZE = 100;

export function useRevenueSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [fundGroupFilter, setFundGroupFilter] = useState('');
  const [fpCategoryFilter, setFpCategoryFilter] = useState('');
  const [allRevenue, setAllRevenue] = useState<Revenue[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Build filter query helper
  const applyFilters = (query: any) => {
    if (searchTerm && searchTerm.length >= 2) {
      query = query.or(
        `Detail_Receipt.ilike.%${searchTerm}%,Fund_Group.ilike.%${searchTerm}%,FP_Category.ilike.%${searchTerm}%`
      );
    }
    if (fundGroupFilter) {
      query = query.eq('Fund_Group', fundGroupFilter);
    }
    if (fpCategoryFilter) {
      query = query.eq('FP_Category', fpCategoryFilter);
    }
    return query;
  };

  // Fetch initial page of revenue
  const { data, isLoading, error } = useQuery({
    queryKey: ['revenue', searchTerm, fundGroupFilter, fpCategoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('Revenue')
        .select('*', { count: 'exact' });

      query = applyFilters(query);

      query = query
        .order('Detail_Receipt', { ascending: true })
        .limit(PAGE_SIZE);

      const { data, error, count } = await query;

      if (error) throw error;

      return { revenue: data as Revenue[], totalCount: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Reset accumulated data when initial query changes (filters changed)
  useEffect(() => {
    if (data) {
      setAllRevenue(data.revenue);
      setOffset(PAGE_SIZE);
      setHasMore(data.revenue.length === PAGE_SIZE);
    }
  }, [data]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      let query = supabase.from('Revenue').select('*');
      query = applyFilters(query);
      query = query
        .order('Detail_Receipt', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      const { data: moreData, error: err } = await query;
      if (err) throw err;
      const rows = (moreData as Revenue[]) || [];
      setAllRevenue(prev => [...prev, ...rows]);
      setOffset(prev => prev + PAGE_SIZE);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more revenue error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const revenue = allRevenue;
  const totalCount = data?.totalCount || 0;

  // Get filter options (fund groups and FP categories) from a separate query
  const { data: filterOptions } = useQuery({
    queryKey: ['revenue-filter-options'],
    queryFn: async () => {
      // Get unique fund groups
      const { data: fundData } = await supabase
        .from('Revenue')
        .select('Fund_Group')
        .not('Fund_Group', 'is', null);

      // Get unique FP categories
      const { data: catData } = await supabase
        .from('Revenue')
        .select('FP_Category')
        .not('FP_Category', 'is', null);

      const fundGroups = [...new Set(fundData?.map(d => d.Fund_Group))].filter(Boolean).sort() as string[];
      const fpCategories = [...new Set(catData?.map(t => t.FP_Category))].filter(Boolean).sort() as string[];

      return { fundGroups, fpCategories };
    },
    staleTime: 30 * 60 * 1000,
  });

  return {
    revenue,
    totalCount,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    fundGroups: filterOptions?.fundGroups || [],
    fpCategories: filterOptions?.fpCategories || [],
    searchTerm,
    setSearchTerm,
    fundGroupFilter,
    setFundGroupFilter,
    fpCategoryFilter,
    setFpCategoryFilter,
  };
}

// Helper to get the latest fiscal year amount for a revenue record
export function getLatestAmount(revenue: Revenue): string | null {
  // Walk backwards through fiscal years to find latest non-null value
  for (let i = FISCAL_YEARS.length - 1; i >= 0; i--) {
    const val = revenue[FISCAL_YEARS[i] as keyof Revenue] as string | null;
    if (val && val.trim() !== '') return val;
  }
  return null;
}

// Helper to format revenue amount strings (they're stored as text)
export function formatRevenueAmount(amount: string | null): string {
  if (!amount || amount.trim() === '') return 'N/A';
  // Try to parse as number and format as currency
  const num = parseFloat(amount.replace(/[,$]/g, ''));
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
