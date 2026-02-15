
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useMemberCommittees } from "@/hooks/useMemberCommittees";

type Member = Tables<"People">;

interface MemberCommitteesTableProps {
  member: Member;
}

export const MemberCommitteesTable = ({ member }: MemberCommitteesTableProps) => {
  const { committees, loading, error } = useMemberCommittees(member);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Committees</h2>
          <Badge variant="secondary" className="text-xs">...</Badge>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading committee assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Committees</h2>
          <Badge variant="secondary" className="text-xs">0 Committees</Badge>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive">Error loading committee assignments: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Committees</h2>
        <Badge variant="secondary" className="text-xs">
          {committees.length} {committees.length === 1 ? 'Committee' : 'Committees'}
        </Badge>
      </div>
      <div>
        {committees.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No committee assignments found for this member.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...committees]
              .sort((a, b) => {
                const aIsChair = a.role?.toLowerCase() === 'chair' ? 0 : 1;
                const bIsChair = b.role?.toLowerCase() === 'chair' ? 0 : 1;
                if (aIsChair !== bIsChair) return aIsChair - bIsChair;
                return (a.committee_name || '').localeCompare(b.committee_name || '');
              })
              .map((committee) => (
              <Link
                key={committee.committee_id}
                to={`/committees/${committee.slug}`}
                className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors block cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                      <img
                        src={committee.chamber?.toLowerCase().includes("senate")
                          ? "/nys-senate-seal.avif"
                          : "/nys-assembly-seal.avif"
                        }
                        alt={committee.chamber || "Committee"}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    {committee.role && committee.role.toLowerCase() === 'chair' && (
                      <Badge variant="default" className="text-xs">
                        Chair
                      </Badge>
                    )}
                    {committee.role && committee.role.toLowerCase() === 'ranking' && (
                      <Badge variant="secondary" className="text-xs">
                        Ranking
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">
                    {committee.committee_name}
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {committee.chamber && (
                      <Badge variant="outline" className="text-xs">
                        {committee.chamber}
                      </Badge>
                    )}
                    {committee.role && committee.role.toLowerCase() !== 'chair' && committee.role.toLowerCase() !== 'ranking' && (
                      <Badge variant="outline" className="text-xs">
                        {committee.role}
                      </Badge>
                    )}
                  </div>

                  {committee.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {committee.description}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
