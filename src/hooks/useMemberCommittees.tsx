import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { generateMemberSlug } from "@/utils/memberSlug";

type Member = Tables<"People">;

interface MemberCommittee {
  committee_id: number;
  committee_name: string;
  role: string;
  chamber: string;
  description?: string;
  slug?: string;
}

export const useMemberCommittees = (member: Member) => {
  const [committees, setCommittees] = useState<MemberCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberCommittees = async () => {
      try {
        setLoading(true);
        setError(null);

        // Generate the member's slug (e.g., "joseph-addabbo")
        const memberSlug = generateMemberSlug(member);

        // Query committees where committee_members contains this member's slug
        const { data: committeesData, error: committeesError } = await supabase
          .from("Committees")
          .select("*")
          .ilike("committee_members", `%${memberSlug}%`);

        if (committeesError) throw committeesError;

        const memberFirstName = (member.first_name || '').toLowerCase();
        const memberLastName = (member.last_name || '').toLowerCase();

        const transformedCommittees: MemberCommittee[] = committeesData?.map((committee) => {
          const chairName = (committee.chair_name || '').toLowerCase();
          const isChair = chairName && memberLastName &&
            chairName.includes(memberLastName) &&
            chairName.includes(memberFirstName);

          return {
            committee_id: committee.committee_id,
            committee_name: committee.committee_name || "Unknown Committee",
            role: isChair ? "Chair" : "Member",
            chamber: committee.chamber || "Unknown",
            description: committee.description,
            slug: committee.slug,
          };
        }) || [];

        setCommittees(transformedCommittees);
      } catch (error: any) {
        setError(error.message || "Failed to fetch committee assignments");
        setCommittees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberCommittees();
  }, [member.name, member.first_name, member.last_name, member.people_id]);

  return {
    committees,
    loading,
    error,
  };
};