import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Committee = {
  committee_id: number;
  name: string;
  memberCount: string;
  billCount: string;
  description?: string;
  chair_name?: string;
  chair_email?: string;
  chamber: string;
  committee_url?: string;
  meeting_schedule?: string;
  next_meeting?: string;
  upcoming_agenda?: string;
  address?: string;
  slug?: string;
};

export const useCommitteesData = () => {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [chamberFilter, setChamberFilter] = useState("Assembly");

  const fetchCommittees = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch committees from the Committees table
      const { data: committeesData, error: committeesError } = await supabase
        .from("Committees")
        .select("*")
        .order("committee_name", { ascending: true });

      if (committeesError) throw committeesError;

      // Transform data to match our Committee type
      const transformedCommittees: Committee[] = committeesData?.map((committee) => ({
        committee_id: committee.committee_id,
        name: committee.committee_name || "Unknown Committee",
        memberCount: committee.committee_members
          ? String(committee.committee_members.split(';').filter((s: string) => s.trim()).length)
          : (committee.member_count || "0"),
        billCount: committee.active_bills_count || "0", 
        description: committee.description,
        chair_name: committee.chair_name,
        chair_email: committee.chair_email,
        chamber: committee.chamber || "Unknown",
        committee_url: committee.committee_url,
        meeting_schedule: committee.meeting_schedule,
        next_meeting: committee.next_meeting,
        upcoming_agenda: committee.upcoming_agenda,
        address: committee.address,
        slug: committee.slug
      })) || [];

      setCommittees(transformedCommittees);
    } catch (error: any) {
      setError(error.message || "Failed to fetch committees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommittees();
  }, []);

  // Filter committees based on search term and chamber
  const filteredCommittees = committees.filter(committee => {
    const matchesSearch = committee.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChamber = chamberFilter === "all" || committee.chamber === chamberFilter;
    
    return matchesSearch && matchesChamber;
  });

  // Get unique chambers for filter options (ordered: Assembly, Senate)
  const allChambers = Array.from(new Set(committees.map(c => c.chamber).filter(Boolean)));
  const chambers = allChambers.sort((a, b) => {
    if (a === "Assembly" && b === "Senate") return -1;
    if (a === "Senate" && b === "Assembly") return 1;
    return a.localeCompare(b);
  });

  return {
    committees: filteredCommittees,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    chamberFilter,
    setChamberFilter,
    fetchCommittees,
    totalCommittees: committees.length,
    filteredCount: filteredCommittees.length,
    chambers,
  };
};