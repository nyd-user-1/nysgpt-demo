import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Vote, ChevronDown, Search } from "lucide-react";
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

type RollCall = Tables<"Roll Call">;
type VoteRecord = Tables<"Votes">;
type Person = Tables<"People">;
type Bill = Tables<"Bills">;

interface RollCallWithVotes extends RollCall {
  votes?: (VoteRecord & { person?: Person })[];
  bill?: Pick<Bill, "bill_id" | "bill_number">;
}

interface CommitteeVotesTableProps {
  committee: Committee;
}

// Individual expandable vote card component
const VoteCard = ({ rollCall, formatDate }: { rollCall: RollCallWithVotes; formatDate: (date: string | null) => string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasVotes = rollCall.votes && rollCall.votes.length > 0;

  return (
    <Card
      className={`transition-all duration-300 ${hasVotes ? 'cursor-pointer hover:bg-muted/30' : ''}`}
      onClick={hasVotes ? () => setIsExpanded(!isExpanded) : undefined}
    >
      <CardContent className="p-4">
        {/* Card Header - Always visible */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">
                {formatDate(rollCall.date)}
              </span>
              {rollCall.chamber && (
                <Badge variant="outline" className="text-xs">
                  {rollCall.chamber}
                </Badge>
              )}
            </div>
            {rollCall.bill?.bill_number && (
              <p className="text-sm text-primary font-medium mb-1">
                {rollCall.bill.bill_number}
              </p>
            )}
            {rollCall.description && (
              <p className="text-xs text-muted-foreground mb-2">
                {rollCall.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <span className="font-medium">{rollCall.yea || 0} Yes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                <span className="font-medium">{rollCall.nay || 0} No</span>
              </div>
              <span className="text-muted-foreground text-xs">
                Total: {rollCall.total || 0}
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          {hasVotes && (
            <div className="p-1.5">
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          )}
        </div>

        {/* Expandable Individual Votes Section */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'mt-4 max-h-[400px]' : 'max-h-0'
          }`}
        >
          <div className="border-t pt-3">
            <h5 className="font-medium text-xs text-muted-foreground mb-2">Individual Votes</h5>
            <div className="space-y-1.5">
              {rollCall.votes?.map((vote) => (
                <div
                  key={`${vote.people_id}-${vote.roll_call_id}`}
                  className="flex items-center justify-between text-xs py-1.5 px-2 bg-muted/30 rounded"
                >
                  <span className="font-medium truncate mr-2">
                    {vote.person?.name || `Person ${vote.people_id}`}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {vote.person?.party && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {vote.person.party}
                      </Badge>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      vote.vote_desc === 'Yes' || vote.vote_desc === 'Yea' ? 'bg-green-100 text-green-800' :
                      vote.vote_desc === 'No' || vote.vote_desc === 'Nay' ? 'bg-red-100 text-red-800' :
                      vote.vote_desc === 'NV' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {vote.vote_desc || 'Unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CommitteeVotesTable = ({ committee }: CommitteeVotesTableProps) => {
  const [rollCalls, setRollCalls] = useState<RollCallWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCommitteeVotes = async () => {
      setLoading(true);
      try {
        // First, find bills that belong to this committee
        const { data: committeeBills, error: billsError } = await supabase
          .from("Bills")
          .select("bill_id, bill_number")
          .ilike("committee", `%${committee.name}%`);

        if (billsError) {
          console.error("Error fetching committee bills:", billsError);
          setRollCalls([]);
          return;
        }

        if (!committeeBills || committeeBills.length === 0) {
          setRollCalls([]);
          return;
        }

        const billIds = committeeBills.map(b => b.bill_id);

        // Get roll calls for these bills where description is COMMITTEE, scoped to this committee's chamber
        const { data: rollCallData, error: rollCallError } = await supabase
          .from("Roll Call")
          .select("*")
          .in("bill_id", billIds)
          .ilike("description", "%COMMITTEE%")
          .eq("chamber", committee.chamber)
          .order("date", { ascending: false })
          .limit(100);

        if (rollCallError) {
          console.error("Error fetching roll calls:", rollCallError);
          setRollCalls([]);
          return;
        }

        if (!rollCallData || rollCallData.length === 0) {
          setRollCalls([]);
          return;
        }

        // Fetch detailed vote records for each roll call
        const rollCallsWithVotes: RollCallWithVotes[] = await Promise.all(
          rollCallData.map(async (rollCall) => {
            const { data: votesData } = await supabase
              .from("Votes")
              .select("*")
              .eq("roll_call_id", rollCall.roll_call_id);

            let votesWithPeople: (VoteRecord & { person?: Person })[] = [];
            if (votesData && votesData.length > 0) {
              const voterIds = votesData.map(v => v.people_id);
              const { data: votersData } = await supabase
                .from("People")
                .select("*")
                .in("people_id", voterIds);

              votesWithPeople = votesData.map(vote => ({
                ...vote,
                person: votersData?.find(p => p.people_id === vote.people_id)
              }));
            }

            const bill = committeeBills.find(b => b.bill_id === rollCall.bill_id);

            return {
              ...rollCall,
              votes: votesWithPeople,
              bill: bill
            };
          })
        );

        setRollCalls(rollCallsWithVotes);
      } catch (error) {
        console.error("Error fetching committee votes:", error);
        setRollCalls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommitteeVotes();
  }, [committee.committee_id, committee.name]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Filter roll calls based on search query
  const filteredRollCalls = useMemo(() => {
    if (!searchQuery.trim()) return rollCalls;

    const query = searchQuery.toLowerCase();
    return rollCalls.filter(rollCall => {
      // Search by bill number
      if (rollCall.bill?.bill_number?.toLowerCase().includes(query)) return true;
      // Search by date
      if (rollCall.date?.toLowerCase().includes(query)) return true;
      // Search by voter name
      if (rollCall.votes?.some(v => v.person?.name?.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [rollCalls, searchQuery]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Committee Votes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rollCalls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Committee Votes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No committee vote records found.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Committee voting records may become available as bills are processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Committee Votes</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredRollCalls.length} {filteredRollCalls.length === 1 ? 'Vote' : 'Votes'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bill number or voter name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Vote Cards Grid */}
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
            {filteredRollCalls.map((rollCall) => (
              <VoteCard
                key={rollCall.roll_call_id}
                rollCall={rollCall}
                formatDate={formatDate}
              />
            ))}
          </div>

          {filteredRollCalls.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No votes found matching "{searchQuery}"
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
