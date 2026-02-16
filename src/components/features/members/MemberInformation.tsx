import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  Mail,
  User,
  StickyNote
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Member = Tables<"People">;

interface MemberInformationProps {
  member: Member;
  hasNotes?: boolean;
}

export const MemberInformation = ({ member, hasNotes = false }: MemberInformationProps) => {
  const [imageError, setImageError] = useState(false);
  const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member #${member.people_id}`;

  return (
    <>
      <div className="space-y-6 relative">
        {/* Has Note Badge - Top Right Corner */}
        {hasNotes && (
          <div className="absolute top-0 right-0 z-10">
            <Badge
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
            >
              <StickyNote className="h-3 w-3 mr-1" />
              Has Note
            </Badge>
          </div>
        )}

        {/* Member Name Header */}
        <div className={`pb-4 border-b ${hasNotes ? 'pr-24' : ''}`}>
          <div className="flex items-center gap-4">
            {member.photo_url && !imageError ? (
              <img
                src={member.photo_url}
                alt={memberName}
                className="w-14 h-14 rounded-full object-cover bg-primary/10 flex-shrink-0"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{memberName}</h1>
              {member.archived && (
                <p className="text-sm text-muted-foreground mt-1">Retired</p>
              )}
              {member.leadership_title && !member.archived && (
                <p className="text-sm text-muted-foreground mt-1">{member.leadership_title}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Party & Chamber */}
            {(member.party || member.chamber) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <User className="h-4 w-4" />
                  <span>Party & Chamber</span>
                </div>
                <div className="text-muted-foreground ml-6">
                  {member.party && member.chamber ? `${member.party} - ${member.chamber}` : member.party || member.chamber}
                </div>
              </div>
            )}

            {/* District */}
            {member.district && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <MapPin className="h-4 w-4" />
                  <span>District</span>
                </div>
                 <div className="text-muted-foreground ml-6">
                   {member.district}
                 </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Email */}
            {member.email && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <div className="text-muted-foreground ml-6">
                  <a 
                    href={`mailto:${member.email}`} 
                    className="text-primary hover:text-primary/80 hover:underline"
                  >
                    {member.email}
                  </a>
                </div>
              </div>
            )}

            {/* Phone */}
            {(member.phone_capitol || member.phone_district) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Phone className="h-4 w-4" />
                  <span>Phone</span>
                </div>
                <div className="text-muted-foreground ml-6 space-y-1">
                  {member.phone_capitol && (
                    <div>Capitol: {member.phone_capitol}</div>
                  )}
                  {member.phone_district && (
                    <div>District: {member.phone_district}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
