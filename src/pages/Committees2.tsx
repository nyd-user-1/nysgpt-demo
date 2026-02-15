import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCommitteesSearch } from '@/hooks/useCommitteesSearch';
import { Committee } from '@/types/committee';
import { generateCommitteeSlug } from '@/utils/committeeSlug';

const Committees2 = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const {
    committees,
    totalCount,
    isLoading,
    error,
    chambers,
    searchTerm,
    setSearchTerm,
    chamberFilter,
    setChamberFilter,
  } = useCommitteesSearch();

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Generate a prompt for a committee - varies based on available data
  const generatePrompt = (committee: Committee): string => {
    const chamberPrefix = committee.chamber === 'Senate' ? 'Senate ' : committee.chamber === 'Assembly' ? 'Assembly ' : '';
    const name = `${chamberPrefix}${committee.committee_name || 'Committee'}`;
    const chair = committee.chair_name ? ` chaired by ${committee.chair_name}` : '';

    // Use description if available to vary the prompt
    if (committee.description) {
      return `Tell me about the ${name}${chair}. The committee's focus is: "${committee.description}". What current legislation is this committee working on?`;
    }

    return `Tell me about the ${name}${chair}. What legislation does this committee handle and what should I know about it?`;
  };

  // Navigate to committee detail page
  const handleCommitteeClick = (committee: Committee) => {
    const slug = generateCommitteeSlug({
      committee_id: committee.committee_id,
      committee_name: committee.committee_name,
      chamber: committee.chamber,
    } as any);
    navigate(`/committees/${slug}`);
  };

  // Navigate to new chat with prompt and committee_id
  const handleChatClick = (committee: Committee, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = generatePrompt(committee);
    navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}&committeeId=${committee.committee_id}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setChamberFilter('');
  };

  const hasActiveFilters = searchTerm || chamberFilter;

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
        {/* Inner container with rounded corners and border */}
        <div className="w-full h-full md:rounded-2xl md:border bg-background overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-background">
            <div className="px-4 py-4">
              <div className="flex flex-col gap-4">
                {/* Title row with sidebar toggle and command button */}
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
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear filters
                      </Button>
                    )}
                    <button
                      onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
                      className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
                    >
                      NYSgpt
                    </button>
                  </div>
                </div>

                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search committees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 h-12 text-base"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-2">
                  <Select value={chamberFilter || "all"} onValueChange={(v) => setChamberFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="All Chambers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">All Chambers</SelectItem>
                      {chambers.map((chamber) => (
                        <SelectItem key={chamber} value={chamber} className="focus:bg-muted focus:text-foreground">
                          {chamber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Results - Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive">Error loading committees: {String(error)}</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : committees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No committees found matching your criteria.</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {committees.map((committee) => (
                  <CommitteeCard
                    key={committee.committee_id}
                    committee={committee}
                    onClick={() => handleCommitteeClick(committee)}
                    onChatClick={(e) => handleChatClick(committee, e)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Committee card component
interface CommitteeCardProps {
  committee: Committee;
  onClick: () => void;
  onChatClick: (e: React.MouseEvent) => void;
}

function CommitteeCard({ committee, onClick, onChatClick }: CommitteeCardProps) {
  const chamber = committee.chamber;
  const chair = committee.chair_name;

  // Build committee name with chamber prefix
  const chamberPrefix = chamber === 'Senate' ? 'Senate ' : chamber === 'Assembly' ? 'Assembly ' : '';
  const fullCommitteeName = `${chamberPrefix}${committee.committee_name || 'Unknown Committee'}`;

  // Build varied prompt preview text based on description
  let promptText: string;
  if (committee.description) {
    // Truncate description if too long
    const shortDesc = committee.description.length > 100
      ? committee.description.substring(0, 100) + '...'
      : committee.description;
    promptText = shortDesc;
  } else if (chair) {
    promptText = `Chaired by ${chair}`;
  } else {
    promptText = `${chamber || 'Legislative'} committee`;
  }

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      <h3 className="font-semibold text-base mb-3">
        {fullCommitteeName}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {promptText}
      </p>

      {/* Committee details grid - always visible */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {committee.chamber && (
            <div>
              <span className="text-muted-foreground">Chamber</span>
              <p className="font-medium">{committee.chamber}</p>
            </div>
          )}
          {committee.chair_name && (
            <div>
              <span className="text-muted-foreground">Chair</span>
              <p className="font-medium truncate">{committee.chair_name}</p>
            </div>
          )}
          {(committee.committee_members || committee.member_count) && (
            <div>
              <span className="text-muted-foreground">Members</span>
              <p className="font-medium">{committee.committee_members
                ? committee.committee_members.split(';').filter(s => s.trim()).length
                : committee.member_count}</p>
            </div>
          )}
          {committee.meeting_schedule && (
            <div>
              <span className="text-muted-foreground">Meeting Schedule</span>
              <p className="font-medium">{committee.meeting_schedule}</p>
            </div>
          )}
        </div>

        {/* Action button - appears on hover */}
        <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onChatClick}
            className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Committees2;
