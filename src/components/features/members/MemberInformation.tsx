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

// Senate leadership titles — keyed by normalized last name (or "last, first" for disambiguation)
const SENATE_LEADERSHIP: Record<string, string> = {
  "stewart-cousins": "President Pro Tempore and Majority Leader",
  "gianaris": "Deputy Majority Leader",
  "krueger": "Chair of the Senate Finance Committee",
  "stavisky": "Vice President Pro Tempore",
  "parker": "Senior Assistant Majority Leader",
  "serrano": "Chair of the Majority Conference",
  "gounardes": "Chair of Majority Program Development Committee",
  "rivera": "Assistant Majority Leader on Conference Operations",
  "bailey": "Assistant Majority Leader on House Operations",
  "comrie": "Majority Whip",
  "liu": "Majority Conference Vice-Chair",
  "persaud": "Majority Conference Secretary",
  "addabbo": "Majority Deputy Whip",
  "mayer": "Majority Assistant Whip",
  "martinez": "Liaison to the Executive Branch",
  "skoufis": "Deputy Majority Leader for State Federal Relations",
  "salazar": "Deputy Majority Leader for Senate and Assembly Relations",
  "may": "Chair of the Majority Steering Committee",
  "ortt": "Minority Leader",
  "lanza": "Deputy Minority Leader and Floor Leader",
  "o'mara": "Ranking Member of the Finance Committee",
  "helming": "Chair of the Senate Minority Conference",
  "gallivan": "Minority Whip",
  "palumbo": "Deputy Floor Leader",
  "griffo": "Assistant Minority Leader",
  "canzoneri-fitzpatrick": "Vice Chair of the Senate Minority Conference",
  "weilk": "Secretary of the Minority Conference",
};

function getLeadershipTitle(member: Member): string | null {
  const lastName = (member.last_name || '').toLowerCase().trim();
  if (!lastName) return null;
  return SENATE_LEADERSHIP[lastName] || null;
}

export const MemberInformation = ({ member, hasNotes = false }: MemberInformationProps) => {
  const [imageError, setImageError] = useState(false);
  const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member #${member.people_id}`;
  const leadershipTitle = member.chamber === 'Senate' ? getLeadershipTitle(member) : null;

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
              {leadershipTitle && (
                <p className="text-sm text-muted-foreground mt-1">{leadershipTitle}</p>
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
