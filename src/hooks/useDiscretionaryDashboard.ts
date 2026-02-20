import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Discretionary } from '@/types/discretionary';

// ── Types ────────────────────────────────────────────────
export interface DiscretionaryGroupRow {
  name: string;
  count: number;
  totalAmount: number;
}

export interface DiscretionaryDrillRow {
  id: number;
  grantee: string;
  agencyName: string | null;
  sponsor: string | null;
  grantAmount: number;
  grantAmountRaw: string | null;
  year: number | null;
  approvalDate: string | null;
  description: string | null;
}

// ── Helpers ──────────────────────────────────────────────
function parseGrantAmount(val: string | null): number {
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
export function useDiscretionaryDashboard() {
  const [drillCache, setDrillCache] = useState<Record<string, DiscretionaryDrillRow[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  // Fetch all discretionary rows (paginated — ~18K rows)
  const { data: allRows, isLoading, error } = useQuery({
    queryKey: ['discretionary-dashboard-all'],
    queryFn: async () => {
      const rows: Discretionary[] = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('Discretionary')
          .select('id, year, agency_name, "Grant Amount", Grantee, "Description of Grant", "Approval Date", Sponsor')
          .range(offset, offset + limit - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...(data as Discretionary[]));
        if (data.length < limit) break;
        offset += limit;
      }
      return rows;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // Aggregate by agency
  const byAgency = useMemo<DiscretionaryGroupRow[]>(() => {
    if (!allRows) return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const row of allRows) {
      const key = row.agency_name || 'Unknown';
      const amount = parseGrantAmount(row['Grant Amount']);
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

  // Drill-down: individual grants for an agency
  const getDrillDown = (agencyName: string): DiscretionaryDrillRow[] => {
    if (drillCache[agencyName]) return drillCache[agencyName];
    if (!allRows) return [];

    if (!fetchingRef.current.has(agencyName)) {
      fetchingRef.current.add(agencyName);
      const items = allRows
        .filter(r => (r.agency_name || 'Unknown') === agencyName)
        .map(r => ({
          id: r.id,
          grantee: (r.Grantee || 'Unknown').replace(/^\[|\]$/g, '').trim() || 'Unknown',
          agencyName: r.agency_name,
          sponsor: r.Sponsor,
          grantAmount: parseGrantAmount(r['Grant Amount']),
          grantAmountRaw: r['Grant Amount'],
          year: r.year,
          approvalDate: r['Approval Date'],
          description: r['Description of Grant'],
        }))
        .sort((a, b) => b.grantAmount - a.grantAmount);

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
  };
}
