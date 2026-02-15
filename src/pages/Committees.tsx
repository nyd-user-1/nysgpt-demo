import { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useCommitteesData } from "@/hooks/useCommitteesData";
import { generateCommitteeSlug, parseCommitteeSlug } from "@/utils/committeeSlug";
import { useCommitteeFavorites } from "@/hooks/useCommitteeFavorites";
import { CommitteesHeader } from "@/components/features/committees/CommitteesHeader";
import { CommitteesSearchFilters } from "@/components/features/committees/CommitteesSearchFilters";
import { CommitteesGrid } from "@/components/features/committees/CommitteesGrid";
import { CommitteesEmptyState } from "@/components/features/committees/CommitteesEmptyState";
import { CommitteesLoadingSkeleton } from "@/components/features/committees/CommitteesLoadingSkeleton";
import { CommitteesErrorState } from "@/components/features/committees/CommitteesErrorState";
import { CommitteeDetail } from "@/components/CommitteeDetail";
import { supabase } from "@/integrations/supabase/client";

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

const Committees = () => {
  const [searchParams] = useSearchParams();
  const { committeeSlug } = useParams<{ committeeSlug?: string }>();
  const navigate = useNavigate();
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [loadingSlug, setLoadingSlug] = useState(!!committeeSlug); // True if we have a slug to resolve
  const [committeesWithAIChat, setCommitteesWithAIChat] = useState<Set<number>>(new Set());

  const { favoriteCommitteeIds, toggleFavorite } = useCommitteeFavorites();

  const {
    committees,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    chamberFilter,
    setChamberFilter,
    fetchCommittees,
    totalCommittees,
    filteredCount,
    chambers,
  } = useCommitteesData();

  // Handle URL parameter for selected committee (legacy support for ?selected=id)
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId && committees && committees.length > 0) {
      const committee = committees.find(c => c.committee_id.toString() === selectedId);
      if (committee) {
        setSelectedCommittee(committee);
      }
    }
  }, [searchParams, committees]);

  // Handle URL parameter for committee slug (/committees/:committeeSlug)
  useEffect(() => {
    const fetchCommitteeBySlug = async () => {
      if (committeeSlug) {
        setLoadingSlug(true);
        try {
          const { chamber, name } = parseCommitteeSlug(committeeSlug);

          // Fetch all committees for this chamber
          const { data: chamberCommittees, error } = await supabase
            .from("Committees")
            .select("*")
            .ilike("chamber", chamber);

          if (error) throw error;

          // Try multiple matching strategies on the client side
          let matchedCommittee = null;

          if (chamberCommittees && chamberCommittees.length > 0) {
            // Strategy 1: Exact case-insensitive partial match
            matchedCommittee = chamberCommittees.find(c =>
              c.committee_name?.toLowerCase().includes(name.toLowerCase())
            );

            // Strategy 2: If not found, try fuzzy matching by comparing significant words
            // This handles "governmental operations" vs "government operations"
            if (!matchedCommittee) {
              const words = name.split(' ').filter(word =>
                word.length > 2 && !['the', 'and', 'for', 'of', 'on'].includes(word)
              );

              matchedCommittee = chamberCommittees.find(c => {
                const committeeName = c.committee_name?.toLowerCase() || '';
                // Match if all significant words are present (even as substrings)
                return words.every(word => committeeName.includes(word.substring(0, Math.max(4, word.length - 2))));
              });
            }

            // Strategy 3: If still not found, try matching individual words
            if (!matchedCommittee) {
              const words = name.split(' ').filter(word => word.length > 3);

              matchedCommittee = chamberCommittees.find(c => {
                const committeeName = c.committee_name?.toLowerCase() || '';
                // Match if at least 2 significant words are present
                const matchCount = words.filter(word => committeeName.includes(word)).length;
                return matchCount >= Math.min(2, words.length);
              });
            }
          }

          if (matchedCommittee) {
            // Transform to match Committee type
            const committee: Committee = {
              committee_id: matchedCommittee.committee_id,
              name: matchedCommittee.committee_name || '',
              memberCount: matchedCommittee.committee_members
                ? String(matchedCommittee.committee_members.split(';').filter((s: string) => s.trim()).length)
                : (matchedCommittee.member_count || '0'),
              billCount: matchedCommittee.active_bills_count || '0',
              description: matchedCommittee.description,
              chair_name: matchedCommittee.chair_name,
              chair_email: matchedCommittee.chair_email,
              chamber: matchedCommittee.chamber,
              committee_url: matchedCommittee.committee_url,
              meeting_schedule: matchedCommittee.meeting_schedule,
              next_meeting: matchedCommittee.next_meeting,
              upcoming_agenda: matchedCommittee.upcoming_agenda,
              address: matchedCommittee.address,
              slug: committeeSlug,
            };
            setSelectedCommittee(committee);
          } else {
            console.error("Committee not found:", committeeSlug);
          }
        } catch (error) {
          console.error("Error fetching committee:", error);
        } finally {
          setLoadingSlug(false);
        }
      } else {
        // If no committeeSlug in URL, clear selected committee
        setSelectedCommittee(null);
        setLoadingSlug(false);
      }
    };

    fetchCommitteeBySlug();
  }, [committeeSlug]);

  // Fetch committees that have AI chat sessions
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
      }
    };

    fetchCommitteesWithAIChat();
  }, []);

  const handleFavorite = async (committee: Committee, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(committee.committee_id);
  };

  const handleAIAnalysis = (committee: Committee, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to chat with prompt - the chat page will create the session
    const initialPrompt = `Tell me about the ${committee.chamber} ${committee.name} committee`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  if (loading || loadingSlug) {
    return <CommitteesLoadingSkeleton />;
  }

  if (error) {
    return <CommitteesErrorState error={error} onRetry={fetchCommittees} />;
  }

  // Navigate to committee detail
  const handleCommitteeSelect = (committee: Committee) => {
    const slug = generateCommitteeSlug({
      committee_id: committee.committee_id,
      committee_name: committee.name,
      chamber: committee.chamber,
      slug: committee.slug,
      description: committee.description,
      chair_name: committee.chair_name,
      member_count: committee.memberCount,
      active_bills_count: committee.billCount,
    } as any);
    navigate(`/committees/${slug}`);
  };

  // Show committee detail if one is selected
  if (selectedCommittee) {
    return (
      <CommitteeDetail
        committee={selectedCommittee}
        onBack={() => navigate('/committees')}
      />
    );
  }

  const handleFiltersChange = (newFilters: {
    search: string;
  }) => {
    setSearchTerm(newFilters.search);
  };

  const hasFilters = searchTerm !== "";

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">
          <CommitteesHeader 
            filteredCount={filteredCount}
            totalCount={totalCommittees}
            chamberFilter={chamberFilter}
            onChamberFilterChange={setChamberFilter}
            chambers={chambers}
          />

          <CommitteesSearchFilters
            filters={{
              search: searchTerm,
            }}
            onFiltersChange={handleFiltersChange}
          />

          {committees.length === 0 ? (
            <CommitteesEmptyState hasFilters={hasFilters} />
          ) : (
            <CommitteesGrid
              committees={committees}
              onCommitteeSelect={handleCommitteeSelect}
              onFavorite={handleFavorite}
              onAIAnalysis={handleAIAnalysis}
              favoriteCommittees={favoriteCommitteeIds}
              committeesWithAIChat={committeesWithAIChat}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Committees;