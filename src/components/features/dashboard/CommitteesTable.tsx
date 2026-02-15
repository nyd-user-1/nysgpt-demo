import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateCommitteeSlug } from "@/utils/committeeSlug";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CardActionButtons } from "@/components/ui/CardActionButtons";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCommitteeFavorites } from "@/hooks/useCommitteeFavorites";
import { useToast } from "@/hooks/use-toast";
import { useStickyTableHeader } from "@/hooks/useStickyTableHeader";

type Committee = {
  committee_id: number;
  name: string;
  chamber: string;
  description?: string;
  chair_name?: string;
  chair_email?: string;
  memberCount?: string;
  billCount?: string;
  committee_type?: string;
  meeting_schedule?: string;
  next_meeting?: string;
  address?: string;
};

type SortField = 'name' | 'chamber' | 'chair_name' | 'committee_type' | 'meeting_schedule';
type SortDirection = 'asc' | 'desc' | null;

interface CommitteesTableProps {
  limit?: number;
}

export const CommitteesTable = ({ limit = 10 }: CommitteesTableProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tableRef = useStickyTableHeader();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [committeesWithAIChat, setCommitteesWithAIChat] = useState<Set<number>>(new Set());
  const { favoriteCommitteeIds, toggleFavorite } = useCommitteeFavorites();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = limit;

  // Fetch all committees
  useEffect(() => {
    const fetchAllCommittees = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: committeesData, error: committeesError } = await supabase
          .from("Committees")
          .select("*")
          .order("committee_name", { ascending: true });

        if (committeesError) throw committeesError;

        // Transform data based on actual column names from your database
        const transformedCommittees = (committeesData || []).map((committee) => {
          return {
            committee_id: committee.committee_id,
            name: committee.committee_name || "Unknown Committee",
            chamber: committee.chamber || "Unknown",
            chair_name: committee.chair_name || null,
            chair_email: committee.chair_email || null,
            committee_type: committee.committee_type || null,
            description: committee.description || null,
            meeting_schedule: committee.meeting_schedule || null,
            next_meeting: committee.next_meeting || null,
            address: committee.address || null,
            memberCount: committee.committee_members
              ? String(committee.committee_members.split(';').filter((s: string) => s.trim()).length)
              : (committee.member_count?.toString() || "0"),
            billCount: committee.active_bills_count?.toString() || "0"
          };
        });

        setCommittees(transformedCommittees);
      } catch (err: any) {
        setError(err.message || "Failed to load committees. Please try again.");
        toast({
          title: "Error",
          description: err.message || "Failed to load committees. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllCommittees();
  }, [limit, toast]);

  useEffect(() => {
    const fetchCommitteesWithAIChat = async () => {
      try {
        const { data: sessions } = await supabase
          .from("chat_sessions")
          .select("committee_id")
          .not("committee_id", "is", null);

        if (sessions) {
          const committeeIdsWithChat = new Set(
            sessions.map((session: any) => session.committee_id).filter(Boolean)
          );
          setCommitteesWithAIChat(committeeIdsWithChat);
        }
      } catch (error) {
        console.error('Error fetching AI chat sessions:', error);
      }
    };

    fetchCommitteesWithAIChat();
  }, []);

  const handleCommitteeClick = (committee: Committee) => {
    const slug = generateCommitteeSlug({
      committee_id: committee.committee_id,
      committee_name: committee.name,
      chamber: committee.chamber,
    } as any);
    navigate(`/committees/${slug}`);
  };

  const handleAIAnalysis = (committee: Committee, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to chat with prompt - the chat page will create the session
    const initialPrompt = `Tell me about the ${committee.chamber} ${committee.name} committee`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const handleFavorite = async (committee: Committee, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(committee.committee_id);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Filter and sort committees
  const filteredAndSortedCommittees = useMemo(() => {
    let filtered = committees;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = committees.filter(committee => 
        committee.name?.toLowerCase().includes(query) ||
        committee.chamber?.toLowerCase().includes(query) ||
        committee.chair_name?.toLowerCase().includes(query) ||
        committee.description?.toLowerCase().includes(query) ||
        committee.committee_type?.toLowerCase().includes(query) ||
        committee.meeting_schedule?.toLowerCase().includes(query) ||
        committee.address?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortField] || '';
        let bValue: any = b[sortField] || '';
        
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [committees, searchQuery, sortField, sortDirection]);

  // Paginate the filtered results
  const paginatedCommittees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedCommittees.slice(startIndex, endIndex);
  }, [filteredAndSortedCommittees, currentPage, ITEMS_PER_PAGE]);

  const totalPages = Math.ceil(filteredAndSortedCommittees.length / ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search Section */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search committees by name, chamber, chair, type, or meeting schedule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Committees Table */}
        <div ref={tableRef} className="border rounded-md overflow-hidden bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading committees...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">{error}</div>
            </div>
          ) : paginatedCommittees.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                {searchQuery ? "No committees found matching your search" : "No committees found"}
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical ScrollArea for rows with fixed height */}
              <ScrollArea className="h-[600px] w-full">
                {/* Horizontal ScrollArea for columns */}
                <ScrollArea orientation="horizontal" className="w-full">
                  <div className="min-w-[1200px] relative">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-30 border-b shadow-sm supports-[backdrop-filter]:bg-background/60">
                        <TableRow className="hover:bg-transparent">
                          {/* Pinned first column */}
                          <TableHead className="sticky left-0 bg-background/95 backdrop-blur-sm z-40 w-[250px] border-r shadow-sm supports-[backdrop-filter]:bg-background/60">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('name')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Committee Name {getSortIcon('name')}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[120px]">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('chamber')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Chamber {getSortIcon('chamber')}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[180px]">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('chair_name')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Chair {getSortIcon('chair_name')}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[150px]">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('committee_type')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Type {getSortIcon('committee_type')}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[180px]">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('meeting_schedule')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Meeting Schedule {getSortIcon('meeting_schedule')}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[80px] text-center">Members</TableHead>
                          <TableHead className="w-[80px] text-center">Bills</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCommittees.map((committee) => (
                          <TableRow 
                            key={committee.committee_id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleCommitteeClick(committee)}
                          >
                            {/* Pinned first cell */}
                            <TableCell className="sticky left-0 bg-background/95 backdrop-blur-sm z-20 font-medium border-r supports-[backdrop-filter]:bg-background/60">
                              <div className="max-w-[230px]">
                                <div className="line-clamp-2 text-sm" title={committee.name}>
                                  {committee.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={committee.chamber === 'Assembly' ? 'default' : committee.chamber === 'Senate' ? 'secondary' : 'outline'}>
                                {committee.chamber || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {committee.chair_name || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {committee.committee_type || committee.description || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {committee.meeting_schedule || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              <Badge variant="outline" className="min-w-[40px]">
                                {committee.memberCount || "0"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              <Badge variant="outline" className="min-w-[40px]">
                                {committee.billCount || "0"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <CardActionButtons
                                onFavorite={(e) => handleFavorite(committee, e)}
                                onAIAnalysis={(e) => handleAIAnalysis(committee, e)}
                                isFavorited={favoriteCommitteeIds.has(committee.committee_id)}
                                hasAIChat={committeesWithAIChat.has(committee.committee_id)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedCommittees.length)} of {filteredAndSortedCommittees.length} committees
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};