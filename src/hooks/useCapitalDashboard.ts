import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { reformatAgencyName } from '@/hooks/useBudgetSearch';

// ── Types ────────────────────────────────────────────────
export interface CapitalGroupRow {
  name: string;
  count: number;
  totalAmount: number;
}

export interface CapitalDrillRow {
  agencyName: string;
  description: string | null;
  programName: string | null;
  referenceNumber: string | null;
  financingSource: string | null;
  recommended: number;
  reappropriation: number;
}

// ── Helpers ──────────────────────────────────────────────
function parseBudgetAmount(val: string | null): number {
  if (!val || val.trim() === '') return 0;
  const num = parseFloat(val.replace(/[,$]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function formatCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Hook ─────────────────────────────────────────────────
export function useCapitalDashboard() {
  const [drillCache, setDrillCache] = useState<Record<string, CapitalDrillRow[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  // Fetch all capital rows
  const { data: allRows, isLoading, error } = useQuery({
    queryKey: ['capital-dashboard-all'],
    queryFn: async () => {
      const rows: any[] = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('budget_2027_capital_aprops')
          .select('*')
          .range(offset, offset + limit - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < limit) break;
        offset += limit;
      }
      return rows;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // Aggregate by Agency Name
  const byAgency = useMemo<CapitalGroupRow[]>(() => {
    if (!allRows) return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const row of allRows) {
      const key = row['Agency Name'] || 'Unknown';
      const amount = parseBudgetAmount(row['Appropriations Recommended 2026-27']);
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
  const grandTotal = useMemo(() => byAgency.reduce((s, r) => s + r.totalAmount, 0), [byAgency]);
  const totalItems = useMemo(() => byAgency.reduce((s, r) => s + r.count, 0), [byAgency]);

  // Drill-down: individual capital items for an agency
  const getDrillDown = (agencyName: string): CapitalDrillRow[] => {
    if (drillCache[agencyName]) return drillCache[agencyName];
    if (!allRows) return [];

    if (!fetchingRef.current.has(agencyName)) {
      fetchingRef.current.add(agencyName);
      const items = allRows
        .filter(r => (r['Agency Name'] || 'Unknown') === agencyName)
        .map(r => ({
          agencyName: r['Agency Name'] || 'Unknown',
          description: r['Description'],
          programName: r['Program Name'],
          referenceNumber: r['Reference Number'],
          financingSource: r['Financing Source'],
          recommended: parseBudgetAmount(r['Appropriations Recommended 2026-27']),
          reappropriation: parseBudgetAmount(r['Reappropriations Recommended 2026-27']),
        }))
        .sort((a, b) => b.recommended - a.recommended);

      setDrillCache(prev => ({ ...prev, [agencyName]: items }));
      fetchingRef.current.delete(agencyName);
      return items;
    }
    return [];
  };

  return {
    isLoading,
    error,
    byAgency,
    grandTotal,
    totalItems,
    getDrillDown,
    reformatAgencyName,
  };
}
