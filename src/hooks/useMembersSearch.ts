import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Member } from '@/types/member';

export function useMembersSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [chamberFilter, setChamberFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');

  // Fetch members - server-side search when there's a search term
  const { data, isLoading, error } = useQuery({
    queryKey: ['members-search', searchTerm, chamberFilter, partyFilter],
    queryFn: async () => {
      let query = supabase
        .from('People')
        .select('*', { count: 'exact' })
        .not('chamber', 'is', null)
        .not('name', 'is', null);

      // Server-side search across name, district
      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(
          `name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,district.ilike.%${searchTerm}%`
        );
      }

      // Server-side chamber filter
      if (chamberFilter) {
        query = query.eq('chamber', chamberFilter);
      }

      // Server-side party filter
      if (partyFilter) {
        query = query.eq('party', partyFilter);
      }

      // Order by last name and limit results
      query = query
        .order('last_name', { ascending: true })
        .limit(500);

      const { data, error, count } = await query;

      if (error) throw error;

      return { members: data as Member[], totalCount: count || 0 };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const members = data?.members || [];
  const totalCount = data?.totalCount || 0;

  // Get filter options (chambers and parties) from a separate query
  const { data: filterOptions } = useQuery({
    queryKey: ['members-filter-options'],
    queryFn: async () => {
      // Get unique chambers
      const { data: chamberData } = await supabase
        .from('People')
        .select('chamber')
        .not('chamber', 'is', null);

      // Get unique parties
      const { data: partyData } = await supabase
        .from('People')
        .select('party')
        .not('party', 'is', null);

      const chambers = [...new Set(chamberData?.map(c => c.chamber))].filter(Boolean).sort() as string[];
      const parties = [...new Set(partyData?.map(p => p.party))].filter(Boolean).sort() as string[];

      return { chambers, parties };
    },
    staleTime: 30 * 60 * 1000, // Cache filter options for 30 minutes
  });

  return {
    members,
    totalCount,
    isLoading,
    error,
    chambers: filterOptions?.chambers || [],
    parties: filterOptions?.parties || [],
    searchTerm,
    setSearchTerm,
    chamberFilter,
    setChamberFilter,
    partyFilter,
    setPartyFilter,
  };
}
