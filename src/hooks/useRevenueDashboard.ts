import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Revenue, FISCAL_YEARS } from '@/types/revenue';

// ── Types ────────────────────────────────────────────────
export interface RevenueGroupRow {
  name: string;
  count: number;
  totalAmount: number;
}

export interface RevenueDrillRow {
  id: number;
  detailReceipt: string;
  fpCategory: string | null;
  fundGroup: string | null;
  latestAmount: number;
  latestYear: string;
}

// ── Helpers ──────────────────────────────────────────────
function parseAmount(val: string | null): number {
  if (!val || val.trim() === '') return 0;
  const num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? 0 : num * 1_000_000; // values are in millions
}

function getLatest(row: Revenue): { amount: number; year: string } {
  for (let i = FISCAL_YEARS.length - 1; i >= 0; i--) {
    const col = FISCAL_YEARS[i];
    const val = row[col as keyof Revenue] as string | null;
    if (val && val.trim() !== '') {
      return { amount: parseAmount(val), year: col.replace('_Actuals', '').replace('_', '-') };
    }
  }
  return { amount: 0, year: '' };
}

export function formatCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Hook ─────────────────────────────────────────────────
export function useRevenueDashboard() {
  const [drillCache, setDrillCache] = useState<Record<string, RevenueDrillRow[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  // Fetch all revenue rows (small dataset ~200-500 rows)
  const { data: allRows, isLoading, error } = useQuery({
    queryKey: ['revenue-dashboard-all'],
    queryFn: async () => {
      const rows: Revenue[] = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('Revenue')
          .select('*')
          .range(offset, offset + limit - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...(data as Revenue[]));
        if (data.length < limit) break;
        offset += limit;
      }
      return rows;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // Aggregate by Fund Group
  const byFundGroup = useMemo<RevenueGroupRow[]>(() => {
    if (!allRows) return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const row of allRows) {
      const key = row.Fund_Group || 'Unknown';
      const { amount } = getLatest(row);
      const entry = map.get(key) || { count: 0, total: 0 };
      entry.count++;
      entry.total += amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, totalAmount: v.total }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [allRows]);

  // Grand total
  const grandTotal = useMemo(() => byFundGroup.reduce((s, r) => s + r.totalAmount, 0), [byFundGroup]);
  const totalItems = useMemo(() => byFundGroup.reduce((s, r) => s + r.count, 0), [byFundGroup]);

  // Drill-down: get individual revenue items for a fund group
  const getDrillDown = (fundGroup: string): RevenueDrillRow[] => {
    if (drillCache[fundGroup]) return drillCache[fundGroup];
    if (!allRows) return [];

    if (!fetchingRef.current.has(fundGroup)) {
      fetchingRef.current.add(fundGroup);
      const key = fundGroup === 'Unknown' ? null : fundGroup;
      const items = allRows
        .filter(r => (r.Fund_Group || 'Unknown') === fundGroup)
        .map(r => {
          const { amount, year } = getLatest(r);
          return {
            id: r.id,
            detailReceipt: r.Detail_Receipt || 'Unknown',
            fpCategory: r.FP_Category,
            fundGroup: r.Fund_Group,
            latestAmount: amount,
            latestYear: year,
          };
        })
        .sort((a, b) => b.latestAmount - a.latestAmount);

      setDrillCache(prev => ({ ...prev, [fundGroup]: items }));
      fetchingRef.current.delete(fundGroup);
      return items;
    }
    return [];
  };

  return {
    isLoading,
    error,
    byFundGroup,
    grandTotal,
    totalItems,
    getDrillDown,
  };
}
