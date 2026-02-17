import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, User, Pencil, Plus, Trash2, ExternalLink, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { BillSummary, BillKeyInformation, QuickReviewNoteDialog } from "./features/bills";
import { BillMilestones } from "./features/bills/BillMilestones";
import { BillText } from "./features/bills/BillText";
import { useBillReviews, ReviewStatus, BillNote } from "@/hooks/useBillReviews";
import { useBillExtendedData } from "@/hooks/useBillExtendedData";

type Bill = Tables<"Bills">;
type HistoryEntry = Tables<"History Table">;
type Sponsor = Tables<"Sponsors">;
type Person = Tables<"People">;
type RollCall = Tables<"Roll Call">;
type Vote = Tables<"Votes">;

interface BillDetailProps {
  bill: Bill;
  onBack: () => void;
}

// Expandable Vote Card component
const VoteCard = ({
  rollCall,
  formatDate
}: {
  rollCall: RollCall & { votes?: (Vote & { person?: Person })[] };
  formatDate: (date: string | null) => string;
}) => {
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
              {rollCall.nv && Number(rollCall.nv) > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">{rollCall.nv} NV</span>
                </div>
              )}
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

export const BillDetail = ({ bill, onBack }: BillDetailProps) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sponsors, setSponsors] = useState<(Sponsor & { person?: Person })[]>([]);
  const [rollCalls, setRollCalls] = useState<(RollCall & { votes?: (Vote & { person?: Person })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<BillNote | null>(null);
  const [billChats, setBillChats] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [otherSessionBills, setOtherSessionBills] = useState<Array<{ session_id: number; bill_number: string; status_desc: string | null; bill_id: number }>>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [voteSearchQuery, setVoteSearchQuery] = useState("");

  // Fetch extended data from NYS API (previous versions, same-as, milestones, etc.)
  const { data: extendedData } = useBillExtendedData(bill.bill_number, bill.session_id);

  // Fetch companion bill data (sameAs) for dual-track milestones
  const companionBill = extendedData?.sameAs?.[0];
  const { data: companionData } = useBillExtendedData(
    companionBill?.basePrintNo ?? null,
    companionBill?.session ?? null
  );

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { getReviewForBill, saveReview, addNote, updateNote, deleteNote } = useBillReviews();
  const billReview = getReviewForBill(bill.bill_id);
  const notes = billReview?.notes || [];

  const handleSaveReview = (status: ReviewStatus, note: string) => {
    if (bill?.bill_id) {
      saveReview(bill.bill_id, status, note);
    }
  };

  const handleAddNote = () => {
    setEditingNote(null);
    setNoteDialogOpen(true);
  };

  const handleEditNote = (note: BillNote) => {
    setEditingNote(note);
    setNoteDialogOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (bill?.bill_id) {
      deleteNote(bill.bill_id, noteId);
    }
  };

  const handleSaveNote = (status: ReviewStatus, noteContent: string) => {
    if (!bill?.bill_id) return;

    if (editingNote) {
      // Update existing note
      updateNote(bill.bill_id, editingNote.id, noteContent);
    } else {
      // Add new note
      addNote(bill.bill_id, noteContent);
    }

    // Also save the review status if provided
    if (status) {
      saveReview(bill.bill_id, status, '');
    }
  };

  const formatNoteDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    fetchBillDetails();
    fetchBillChats();
  }, [bill.bill_id]);

  const fetchBillChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, title, created_at")
        .eq("bill_id", bill.bill_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBillChats(data);
      }
    } catch (error) {
      console.error("Error fetching bill chats:", error);
    }
  };

  const fetchBillDetails = async () => {
    try {
      setLoading(true);

      // Fetch history
      const { data: historyData } = await supabase
        .from("History Table")
        .select("*")
        .eq("bill_id", bill.bill_id)
        .order("date", { ascending: false });

      // Fetch sponsors and people data separately
      const { data: sponsorsData } = await supabase
        .from("Sponsors")
        .select("*")
        .eq("bill_id", bill.bill_id)
        .order("position");

      // Fetch people data for sponsors
      let sponsorsWithPeople: (Sponsor & { person?: Person })[] = [];
      if (sponsorsData && sponsorsData.length > 0) {
        const peopleIds = sponsorsData.map(s => s.people_id).filter(Boolean);
        
        if (peopleIds.length > 0) {
          const { data: peopleData } = await supabase
            .from("People")
            .select("*")
            .in("people_id", peopleIds);

          sponsorsWithPeople = sponsorsData.map(sponsor => ({
            ...sponsor,
            person: peopleData?.find(p => p.people_id === sponsor.people_id)
          }));
        } else {
          sponsorsWithPeople = sponsorsData.map(sponsor => ({ ...sponsor }));
        }
      }

      // Fetch roll call votes for this bill
      const { data: rollCallData } = await supabase
        .from("Roll Call")
        .select("*")
        .eq("bill_id", bill.bill_id)
        .order("date", { ascending: false });

      // Fetch detailed vote records for each roll call
      let rollCallsWithVotes: (RollCall & { votes?: (Vote & { person?: Person })[] })[] = [];
      if (rollCallData && rollCallData.length > 0) {
        rollCallsWithVotes = await Promise.all(
          rollCallData.map(async (rollCall) => {
            // Get votes for this roll call
            const { data: votesData } = await supabase
              .from("Votes")
              .select("*")
              .eq("roll_call_id", rollCall.roll_call_id);

            // Get person data for the votes
            let votesWithPeople: (Vote & { person?: Person })[] = [];
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

            return {
              ...rollCall,
              votes: votesWithPeople
            };
          })
        );
      }

      // Fetch same bill in other sessions
      const { data: otherSessions } = await supabase
        .from("Bills")
        .select("session_id, bill_number, status_desc, bill_id")
        .eq("bill_number", bill.bill_number)
        .neq("bill_id", bill.bill_id)
        .order("session_id", { ascending: false });

      setHistory(historyData || []);
      setSponsors(sponsorsWithPeople);
      setRollCalls(rollCallsWithVotes);
      setOtherSessionBills(otherSessions || []);

    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

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

  const generateMemberSlug = (person: Person) => {
    if (!person.name) return '';
    return person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Filter roll calls based on search query
  const filteredRollCalls = useMemo(() => {
    if (!voteSearchQuery.trim()) return rollCalls;

    const query = voteSearchQuery.toLowerCase();
    return rollCalls.filter(rollCall => {
      // Search by description (COMMITTEE, FLOOR, etc.)
      if (rollCall.description?.toLowerCase().includes(query)) return true;
      // Search by date
      if (rollCall.date?.toLowerCase().includes(query)) return true;
      // Search by voter name
      if (rollCall.votes?.some(v => v.person?.name?.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [rollCalls, voteSearchQuery]);

  const handleAIAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation();
    const initialPrompt = `Tell me about bill ${bill.bill_number}`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}&billId=${bill.bill_id}`);
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Left Sidebar - slides in from off-screen */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-50",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {/* Backdrop overlay when sidebar is open */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Main Container with padding */}
      <div className="h-full md:p-2 bg-muted/30">
        <div className="w-full h-full md:rounded-2xl md:border bg-background overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-background">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
                    aria-label="Open menu"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                      <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                      <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
                    className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
                  >
                    NYSgpt
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto space-y-6">
          {/* Bill Summary Section - Full Width */}
          <BillSummary
            bill={bill}
            sponsors={sponsors}
            reviewStatus={billReview?.review_status}
            hasNotes={notes.length > 0}
            onSendToChat={handleAIAnalysis}
          />


          {/* Bill Tabs Section */}
          <section>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted rounded-lg">
                <TabsTrigger value="overview" className="h-10 rounded-md text-sm font-medium">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="sponsors" className="h-10 rounded-md text-sm font-medium">
                  Sponsors
                </TabsTrigger>
                <TabsTrigger value="history" className="h-10 rounded-md text-sm font-medium">
                  History
                </TabsTrigger>
                <TabsTrigger value="votes" className="h-10 rounded-md text-sm font-medium">
                  Votes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Bill Key Information Section (includes Related Bills) */}
                <BillKeyInformation
                  bill={bill}
                  previousVersions={extendedData?.previousVersions}
                  sameAs={extendedData?.sameAs}
                  substitutedBy={extendedData?.substitutedBy}
                  lawSection={extendedData?.lawSection}
                  lawCode={extendedData?.lawCode}
                />

                {/* Bill Text - Lazy loaded on expand */}
                <BillText
                  billNumber={bill.bill_number}
                  sessionId={bill.session_id}
                />
              </TabsContent>

              <TabsContent value="sponsors" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Bill Sponsors</h2>
                    <Badge variant="secondary" className="text-xs">
                      {sponsors.length} {sponsors.length === 1 ? 'Sponsor' : 'Sponsors'}
                    </Badge>
                  </div>
                  <div>
                    {loading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : sponsors.length === 0 ? (
                      <p className="text-muted-foreground text-center py-12">
                        No sponsors information available for this bill.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sponsors.map((sponsor, _index) => {
                          const memberSlug = sponsor.person ? generateMemberSlug(sponsor.person) : '';
                          const memberUrl = memberSlug ? `/members/${memberSlug}` : '#';

                          return sponsor.person && memberSlug ? (
                            <Link
                              key={sponsor.id}
                              to={memberUrl}
                              className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors block"
                            >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {sponsor.person?.photo_url && !failedImages.has(sponsor.people_id) ? (
                                  <img
                                    src={sponsor.person.photo_url}
                                    alt={sponsor.person?.name || 'Sponsor photo'}
                                    className="w-8 h-8 rounded-full object-cover bg-primary/10"
                                    onError={() => {
                                      console.log(`Failed to load image for sponsor: ${sponsor.person?.name}`);
                                      setFailedImages(prev => new Set([...prev, sponsor.people_id]));
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4" />
                                  </div>
                                )}
                                {sponsor.position === 1 && (
                                  <Badge variant="default" className="text-xs">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              {sponsor.position && (
                                <span className="text-xs text-muted-foreground">#{sponsor.position}</span>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">
                                {sponsor.person?.name || 
                                 `${sponsor.person?.first_name || ''} ${sponsor.person?.last_name || ''}`.trim() ||
                                 `Person ID: ${sponsor.people_id}`}
                              </h4>
                              
                              <div className="flex flex-wrap gap-2">
                                {sponsor.person?.party && (
                                  <Badge variant="outline" className="text-xs">
                                    {sponsor.person.party}
                                  </Badge>
                                )}
                                {sponsor.person?.chamber && (
                                  <Badge variant="outline" className="text-xs">
                                    {sponsor.person.chamber}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {sponsor.person?.role && (
                                  <p>{sponsor.person.role}</p>
                                )}
                                {sponsor.person?.district && (
                                  <p>District {sponsor.person.district}</p>
                                )}
                              </div>
                            </div>
                            </Link>
                          ) : (
                            <div key={sponsor.id} className="p-4 border border-border rounded-lg bg-muted/10">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4" />
                                  </div>
                                  {sponsor.position === 1 && (
                                    <Badge variant="default" className="text-xs">
                                      Primary
                                    </Badge>
                                  )}
                                </div>
                                {sponsor.position && (
                                  <span className="text-xs text-muted-foreground">#{sponsor.position}</span>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground">
                                  Person ID: {sponsor.people_id}
                                </h4>
                                <p className="text-xs text-muted-foreground">Member information not available</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Legislative History</h2>
                    <Badge variant="secondary" className="text-xs">
                      {history.length} {history.length === 1 ? 'Action' : 'Actions'}
                    </Badge>
                  </div>
                  <div>
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-muted-foreground text-center py-12">
                        No legislative history available for this bill.
                      </p>
                    ) : (
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="relative">
                          {/* Timeline line */}
                          <div className="absolute left-6 top-6 bottom-6 w-px bg-border"></div>
                          
                          <div className="space-y-6">
                            {history.map((entry, _index) => (
                              <div key={`${entry.date}-${entry.sequence}`} className="relative flex gap-6">
                                {/* Timeline dot */}
                                <div className="flex-shrink-0 w-3 h-3 bg-primary rounded-full mt-2 relative z-10"></div>
                                
                                <div className="flex-1 pb-6">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-medium text-sm">
                                      {formatDate(entry.date)}
                                    </h4>
                                    {entry.chamber && (
                                      <Badge variant="outline" className="text-xs">
                                        {entry.chamber}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      Sequence {entry.sequence}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {entry.action || "No action recorded"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="votes" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Voting Records</h2>
                    <Badge variant="secondary" className="text-xs">
                      {filteredRollCalls.length} {filteredRollCalls.length === 1 ? 'Vote' : 'Votes'}
                    </Badge>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                      ))}
                    </div>
                  ) : rollCalls.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Voting Records</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        No roll call votes have been recorded for this bill yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by voter name or vote type..."
                          value={voteSearchQuery}
                          onChange={(e) => setVoteSearchQuery(e.target.value)}
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

                        {filteredRollCalls.length === 0 && voteSearchQuery && (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">
                              No votes found matching "{voteSearchQuery}"
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* Your Notes Section */}
          <Card className="bg-card rounded-xl shadow-sm border">
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg font-semibold">
                    Your Notes
                  </CardTitle>
                  {notes.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddNote}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {notes.length === 0 ? (
                <div className="bg-muted/30 rounded-lg p-4 text-sm">
                  <span className="text-muted-foreground italic">Add your notes here.</span>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {notes.map((note) => (
                    <AccordionItem key={note.id} value={note.id} className="border-b last:border-b-0">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-xs text-muted-foreground">
                            {formatNoteDate(note.updated_at || note.created_at)}
                          </span>
                          <span className="text-sm truncate max-w-[300px]">
                            {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap mb-3">
                          {note.content}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditNote(note)}
                            className="gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Bill Chat Section - Shows chats related to this bill */}
          <Card className="bg-card rounded-xl shadow-sm border">
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg font-semibold">
                    Bill Chats
                  </CardTitle>
                  {billChats.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {billChats.length} {billChats.length === 1 ? 'chat' : 'chats'}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIAnalysis}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {billChats.length === 0 ? (
                <div className="bg-muted/30 rounded-lg p-4 text-sm">
                  <span className="text-muted-foreground italic">No chats yet. Start a conversation about this bill.</span>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {billChats.map((chat) => (
                    <AccordionItem key={chat.id} value={chat.id} className="border-b last:border-b-0">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-xs text-muted-foreground">
                            {formatNoteDate(chat.created_at)}
                          </span>
                          <span className="text-sm truncate max-w-[300px]">
                            {chat.title}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/c/${chat.id}`)}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Chat
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Review Note Dialog */}
      <QuickReviewNoteDialog
        isOpen={noteDialogOpen}
        onClose={() => {
          setNoteDialogOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialStatus={billReview?.review_status}
        initialNote={editingNote?.content || ''}
      />
    </div>
  );
};