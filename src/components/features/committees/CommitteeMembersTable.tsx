import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { generateMemberSlug } from "@/utils/memberSlug";

type Member = Tables<"People">;

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
  committee_members?: string;
};

interface CommitteeMembersTableProps {
  committee: Committee;
}

export const CommitteeMembersTable = ({ committee }: CommitteeMembersTableProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [chairId, setChairId] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        // First, get the committee data to access committee_members field
        const { data: committeeData } = await supabase
          .from("Committees")
          .select("committee_members")
          .eq("committee_id", committee.committee_id)
          .single();

        const allMembers: Member[] = [];

        // Fetch the chair separately if available
        if (committee.chair_name) {
          const { data: chairData } = await supabase
            .from("People")
            .select("*")
            .ilike("name", `%${committee.chair_name}%`)
            .limit(1)
            .single();

          if (chairData) {
            allMembers.push(chairData);
            setChairId(chairData.people_id);
          }
        }

        if (committeeData && committeeData.committee_members) {
          // Split the semicolon-separated slugs (e.g., "rebecca-seawright; george-alvarez")
          const memberSlugs = committeeData.committee_members
            .split(';')
            .map(slug => slug.trim())
            .filter(slug => slug.length > 0);

          if (memberSlugs.length > 0) {
            const memberPromises = memberSlugs.map(async (slug) => {
              const searchName = slug.replace(/-/g, ' ');
              const nameParts = searchName.split(' ');
              const firstName = nameParts[0];
              const lastName = nameParts[nameParts.length - 1];

              // Try exact full name match first
              let { data: memberData } = await supabase
                .from("People")
                .select("*")
                .ilike('name', `%${searchName}%`)
                .limit(1)
                .maybeSingle();

              // Fallback: match on first + last name (handles middle initial differences)
              if (!memberData && nameParts.length >= 2) {
                const { data: fallbackData } = await supabase
                  .from("People")
                  .select("*")
                  .ilike('name', `%${firstName}%`)
                  .ilike('name', `%${lastName}%`)
                  .limit(1)
                  .maybeSingle();
                memberData = fallbackData;
              }

              return memberData;
            });

            const results = await Promise.all(memberPromises);
            const foundMembers = results.filter((member): member is Member => member !== null);

            // Add all found members
            allMembers.push(...foundMembers);
          }
        }

        // Remove duplicates by people_id
        const uniqueMembers = Array.from(
          new Map(allMembers.map(m => [m.people_id, m])).values()
        );

        // Debug: Log members with photo URLs
        console.log("Fetched members:", uniqueMembers.map(m => ({
          name: m.name,
          photo_url: m.photo_url,
          people_id: m.people_id
        })));

        setMembers(uniqueMembers);
      } catch (error) {
        console.error("Error fetching members:", error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [committee.committee_id, committee.chair_name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Committee Members</h2>
        <Badge variant="secondary" className="text-xs">
          {loading ? '...' : `${members.length} ${members.length === 1 ? 'Member' : 'Members'}`}
        </Badge>
      </div>
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No members found for this committee.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => (
              <Link
                key={member.people_id}
                to={`/members/${generateMemberSlug(member)}`}
                className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {member.photo_url && !failedImages.has(member.people_id) ? (
                      <img
                        src={member.photo_url}
                        alt={member.name || 'Member photo'}
                        className="w-8 h-8 rounded-full object-cover bg-primary/10"
                        onError={() => {
                          console.log(`Failed to load image for ${member.name}: ${member.photo_url}`);
                          setFailedImages(prev => new Set([...prev, member.people_id]));
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    {(() => {
                      if (!committee.chair_name || !member.name) return false;
                      // Get last names - "Rebecca A. Seawright" -> "Seawright", "Rebecca Seawright" -> "Seawright"
                      const chairLastName = committee.chair_name.trim().split(' ').pop()?.toLowerCase();
                      const memberLastName = member.name.trim().split(' ').pop()?.toLowerCase();
                      // Also check first names
                      const chairFirstName = committee.chair_name.trim().split(' ')[0]?.toLowerCase();
                      const memberFirstName = member.name.trim().split(' ')[0]?.toLowerCase();
                      return chairLastName === memberLastName && chairFirstName === memberFirstName;
                    })() && (
                      <Badge variant="default" className="text-xs">
                        Chair
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">
                    {member.name ||
                     `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
                     `Member #${member.people_id}`}
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {member.party && (
                      <Badge variant="outline" className="text-xs">
                        {member.party}
                      </Badge>
                    )}
                    {member.chamber && (
                      <Badge variant="outline" className="text-xs">
                        {member.chamber}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {member.role && (
                      <p>{member.role}</p>
                    )}
                    {member.district && (
                      <p>District {member.district}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
