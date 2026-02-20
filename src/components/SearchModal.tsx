/**
 * SearchModal - Unified tabless search with member/committee/excerpt support
 *
 * Architecture:
 * - Single unified view (no tabs)
 * - Browse mode: Pages + recent chats/notes/excerpts chronologically
 * - Search mode: Member Pages, Committee Pages, Pages, Prompts, then chronological results
 * - Server-side full-text search via Postgres tsvector
 * - Debounced input (150ms) with request cancellation
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContentNoOverlay,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  CornerDownLeft,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateMemberSlug } from "@/utils/memberSlug";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Search result from server
interface SearchResult {
  id: string;
  type: "chat" | "note" | "excerpt";
  title: string;
  preview_text: string | null;
  created_at: string;
  last_activity_at: string;
  relevance: number;
}

// Member search result
interface MemberSearchResult {
  people_id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  party: string | null;
  chamber: string | null;
}

// Committee search result
interface CommitteeSearchResult {
  committee_id: number;
  committee_name: string | null;
  chamber: string | null;
  slug: string | null;
}

// Prompt with category
interface Prompt {
  title: string;
  prompt: string;
  category: string;
}

// Routes shown in Pages section
const APP_ROUTES = [
  { path: "/charts/lobbying", label: "Lobbying Dashboard" },
  { path: "/prompts", label: "Prompts" },
  { path: "/lists", label: "Lists" },
  { path: "/features", label: "Features" },
  { path: "/use-cases", label: "Use Cases" },
  { path: "/use-cases/bills", label: "Bills Use Cases" },
  { path: "/use-cases/committees", label: "Committees Use Cases" },
  { path: "/use-cases/members", label: "Members Use Cases" },
  { path: "/use-cases/policy", label: "Policy Use Cases" },
  { path: "/use-cases/departments", label: "Departments Use Cases" },
  { path: "/nonprofits/directory", label: "Nonprofit Directory" },
  { path: "/nonprofits/economic-advocacy", label: "Economic Advocacy" },
  { path: "/nonprofits/environmental-advocacy", label: "Environmental Advocacy" },
  { path: "/nonprofits/legal-advocacy", label: "Legal Advocacy" },
  { path: "/nonprofits/social-advocacy", label: "Social Advocacy" },
  { path: "/budget", label: "Budget" },
  { path: "/school-funding", label: "School Funding" },
  { path: "/lobbying", label: "Lobbying" },
  { path: "/charts/budget", label: "Budget Dashboard" },
];

// Prompts
const ALL_PROMPTS: Prompt[] = [
  // Bills
  { title: "AI Consumer Protection", prompt: "What can you tell me about efforts to protect consumers from algorithmic discrimination in New York?", category: "Bills" },
  { title: "Childcare Affordability", prompt: "What legislative approaches have been proposed to make childcare more affordable for working families in New York?", category: "Bills" },
  { title: "Paid Family Leave", prompt: "What can you tell me about efforts to expand paid family leave in New York?", category: "Bills" },
  { title: "Affordable Housing", prompt: "What are legislators doing to address the affordable housing crisis in New York?", category: "Bills" },
  { title: "Volunteer Firefighter Recruitment", prompt: "What incentives are being considered to help recruit and retain volunteer firefighters and emergency responders?", category: "Bills" },
  { title: "Medicaid Access", prompt: "What efforts are underway to reduce barriers to Medicaid services for patients?", category: "Bills" },
  { title: "Minimum Wage", prompt: "What's the current state of minimum wage legislation in New York and what changes are being proposed?", category: "Bills" },
  { title: "School Safety", prompt: "What measures are being proposed to improve safety around school zones in New York?", category: "Bills" },
  { title: "Rental Assistance", prompt: "What programs exist or are being proposed to help New Yorkers facing housing instability?", category: "Bills" },
  { title: "Disability Benefits", prompt: "What efforts are underway to strengthen disability benefits for New York workers?", category: "Bills" },
  { title: "Veteran Services", prompt: "What initiatives are being considered to improve services and support for veterans in New York?", category: "Bills" },
  { title: "Clean Energy Incentives", prompt: "What tax incentives or programs are being proposed to accelerate clean energy adoption in New York?", category: "Bills" },
  // Members
  { title: "Find My Representative", prompt: "How can I find out who my state legislators are and how to contact them?", category: "Members" },
  { title: "Assembly Leadership", prompt: "Who are the current leaders of the New York State Assembly?", category: "Members" },
  { title: "Senate Leadership", prompt: "Who are the current leaders of the New York State Senate?", category: "Members" },
  { title: "Committee Chairs", prompt: "Who chairs the major committees in the New York legislature?", category: "Members" },
  { title: "Labor Advocates", prompt: "Which legislators are known for championing workers' rights and labor issues?", category: "Members" },
  { title: "Education Champions", prompt: "Which legislators are most active on education policy and school funding?", category: "Members" },
  { title: "Healthcare Policy Leaders", prompt: "Which legislators are leading on healthcare access and reform?", category: "Members" },
  { title: "Housing Advocates", prompt: "Which legislators are focused on affordable housing and tenant protections?", category: "Members" },
  { title: "Environmental Leaders", prompt: "Which legislators are championing climate and environmental legislation?", category: "Members" },
  { title: "Small Business Supporters", prompt: "Which legislators are focused on supporting small businesses and entrepreneurs?", category: "Members" },
  // Committees
  { title: "Labor Committee Overview", prompt: "What issues does the Labor Committee handle and what major legislation is it currently considering?", category: "Committees" },
  { title: "Education Committee Priorities", prompt: "What are the current priorities of the Education Committee in New York?", category: "Committees" },
  { title: "Health Committee Focus Areas", prompt: "What healthcare issues is the Health Committee currently focused on?", category: "Committees" },
  { title: "Housing Committee Activity", prompt: "What housing-related bills is the Housing Committee reviewing this session?", category: "Committees" },
  { title: "Environmental Conservation", prompt: "What role does the Environmental Conservation Committee play in climate policy?", category: "Committees" },
  { title: "Ways and Means", prompt: "How does the Ways and Means Committee influence the state budget process?", category: "Committees" },
  { title: "Judiciary Committee", prompt: "What types of legislation does the Judiciary Committee typically handle?", category: "Committees" },
  { title: "Children and Families", prompt: "What childcare and family support issues is the Children and Families Committee working on?", category: "Committees" },
  { title: "Transportation Committee", prompt: "What infrastructure and transit issues is the Transportation Committee addressing?", category: "Committees" },
  { title: "Economic Development", prompt: "How is the Economic Development Committee supporting job creation and workforce development?", category: "Committees" },
  // Policy
  { title: "Policy Analysis Framework", prompt: "What framework should I use to analyze the potential impact of a proposed policy change?", category: "Policy" },
  { title: "Stakeholder Mapping", prompt: "How do I identify and map stakeholders who would be affected by a new housing policy?", category: "Policy" },
  { title: "Evidence-Based Policy", prompt: "What does evidence-based policymaking look like and how can I apply it to education reform?", category: "Policy" },
  { title: "Policy Implementation", prompt: "What are the key factors that determine whether a policy will be successfully implemented?", category: "Policy" },
  { title: "Regulatory Impact Assessment", prompt: "How do I conduct a regulatory impact assessment for a proposed environmental regulation?", category: "Policy" },
  { title: "Cost-Benefit Analysis", prompt: "How do I perform a cost-benefit analysis for a proposed public health initiative?", category: "Policy" },
  { title: "Policy Evaluation Methods", prompt: "What methods can I use to evaluate whether a policy is achieving its intended outcomes?", category: "Policy" },
  { title: "Unintended Consequences", prompt: "How can I anticipate and mitigate unintended consequences when designing new policies?", category: "Policy" },
  { title: "Policy Memo Writing", prompt: "What's the best structure for writing a policy memo that will be read by busy decision-makers?", category: "Policy" },
  { title: "Building Coalition Support", prompt: "How do I build a coalition of support for a policy initiative across different interest groups?", category: "Policy" },
  // Departments
  { title: "Department Overview", prompt: "What are the major departments and agencies in New York State government?", category: "Departments" },
  { title: "Agency Functions", prompt: "How do I find out what services a specific state agency provides?", category: "Departments" },
  // Nonprofit categories
  { title: "Economic Justice Initiatives", prompt: "What economic justice initiatives are nonprofits advocating for in New York?", category: "Economic" },
  { title: "Environmental Protection", prompt: "What environmental protection efforts are being led by advocacy groups?", category: "Environmental" },
  { title: "Legal Aid Resources", prompt: "What legal aid resources are available for New Yorkers?", category: "Legal" },
  { title: "Social Services Advocacy", prompt: "What social services advocacy efforts are underway in New York?", category: "Social" },
];

// Helper to group items by date
function groupByDate(items: SearchResult[]): { today: SearchResult[]; yesterday: SearchResult[]; previous7Days: SearchResult[]; older: SearchResult[] } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups = { today: [] as SearchResult[], yesterday: [] as SearchResult[], previous7Days: [] as SearchResult[], older: [] as SearchResult[] };

  items.forEach(item => {
    const itemDate = new Date(item.last_activity_at);
    if (itemDate >= today) {
      groups.today.push(item);
    } else if (itemDate >= yesterdayDate) {
      groups.yesterday.push(item);
    } else if (itemDate >= weekAgo) {
      groups.previous7Days.push(item);
    } else {
      groups.older.push(item);
    }
  });

  return groups;
}

// Format date for display (e.g., "Feb 5", "Jan 24")
function formatSearchDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date >= today) return "Today";
  if (date >= yesterdayDate) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Extract snippet around search term with context
function extractSnippet(text: string | null, searchTerm: string): { before: string; match: string; after: string } | null {
  if (!text || !searchTerm) return null;

  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) return null;

  const contextStart = Math.max(0, index - 30);
  const contextEnd = Math.min(text.length, index + searchTerm.length + 70);

  const before = (contextStart > 0 ? "..." : "") + text.slice(contextStart, index);
  const match = text.slice(index, index + searchTerm.length);
  const after = text.slice(index + searchTerm.length, contextEnd) + (contextEnd < text.length ? "..." : "");

  return { before, match, after };
}

export function SearchModal({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: Partial<SearchModalProps>) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Self-managed state for App-level mount
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Unified results state
  const [unifiedResults, setUnifiedResults] = useState<SearchResult[]>([]);
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([]);
  const [committeeResults, setCommitteeResults] = useState<CommitteeSearchResult[]>([]);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Debounce search input (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch results (unified)
  const fetchResults = useCallback(async (query: string) => {
    if (!user) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);

    try {
      if (!query) {
        // Browse mode: fetch recent chats, notes, excerpts
        const [chatsRes, notesRes, excerptsRes] = await Promise.all([
          supabase
            .from("chat_sessions")
            .select("id, title, updated_at, created_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(30),
          supabase.rpc("search_notes", {
            p_user_id: user.id,
            p_query: null,
            p_cursor: null,
            p_limit: 30,
          }),
          supabase
            .from("chat_excerpts")
            .select("id, title, user_message, updated_at, created_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(30),
        ]);

        const chats: SearchResult[] = (chatsRes.data || []).map(chat => ({
          id: chat.id,
          type: "chat" as const,
          title: chat.title || "Untitled Chat",
          preview_text: null,
          created_at: chat.created_at,
          last_activity_at: chat.updated_at,
          relevance: 1.0,
        }));

        const notes: SearchResult[] = (notesRes.data || []).map((note: SearchResult) => ({
          ...note,
          type: "note" as const,
        }));

        const excerpts: SearchResult[] = (excerptsRes.data || []).map(exc => ({
          id: exc.id,
          type: "excerpt" as const,
          title: exc.title || "Untitled Excerpt",
          preview_text: exc.user_message || null,
          created_at: exc.created_at,
          last_activity_at: exc.updated_at,
          relevance: 1.0,
        }));

        // Merge and sort by last_activity_at DESC
        const merged = [...chats, ...notes, ...excerpts].sort(
          (a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
        );

        setUnifiedResults(merged);
        setMemberResults([]);
        setCommitteeResults([]);
      } else {
        // Search mode: 5 parallel queries
        const [chatsRes, notesRes, excerptsRes, membersRes, committeesRes] = await Promise.all([
          supabase.rpc("search_chats", {
            p_user_id: user.id,
            p_query: query,
            p_cursor: null,
            p_limit: 30,
          }),
          supabase.rpc("search_notes", {
            p_user_id: user.id,
            p_query: query,
            p_cursor: null,
            p_limit: 30,
          }),
          supabase
            .from("chat_excerpts")
            .select("id, title, user_message, updated_at, created_at")
            .eq("user_id", user.id)
            .or(`title.ilike.%${query}%,user_message.ilike.%${query}%`)
            .order("updated_at", { ascending: false })
            .limit(30),
          supabase
            .from("People")
            .select("people_id, name, first_name, last_name, photo_url, party, chamber")
            .or(`name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
            .limit(8),
          supabase
            .from("Committees")
            .select("committee_id, committee_name, chamber, slug")
            .ilike("committee_name", `%${query}%`)
            .limit(8),
        ]);

        const chats: SearchResult[] = (chatsRes.data || []).map((chat: SearchResult) => ({
          ...chat,
          type: "chat" as const,
        }));

        const notes: SearchResult[] = (notesRes.data || []).map((note: SearchResult) => ({
          ...note,
          type: "note" as const,
        }));

        const excerpts: SearchResult[] = (excerptsRes.data || []).map(exc => ({
          id: exc.id,
          type: "excerpt" as const,
          title: exc.title || "Untitled Excerpt",
          preview_text: exc.user_message || null,
          created_at: exc.created_at,
          last_activity_at: exc.updated_at,
          relevance: 0.5,
        }));

        // Merge and sort by relevance DESC, then last_activity_at DESC
        const merged = [...chats, ...notes, ...excerpts].sort((a, b) => {
          if (b.relevance !== a.relevance) return b.relevance - a.relevance;
          return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
        });

        setUnifiedResults(merged);
        setMemberResults(membersRes.data || []);
        setCommitteeResults(committeesRes.data || []);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Search error:", error);
      }
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  // Fetch when search term changes
  useEffect(() => {
    if (!open || !user) return;
    fetchResults(debouncedTerm);
  }, [open, debouncedTerm, user, fetchResults]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setDebouncedTerm("");
      setUnifiedResults([]);
      setMemberResults([]);
      setCommitteeResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter prompts client-side (search mode only, max 8)
  const filteredPrompts = useMemo(() => {
    if (!debouncedTerm) return [];
    const term = debouncedTerm.toLowerCase();
    return ALL_PROMPTS.filter(p =>
      p.title.toLowerCase().includes(term) ||
      p.prompt.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [debouncedTerm]);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    if (!debouncedTerm) return APP_ROUTES.slice(0, 5);
    const term = debouncedTerm.toLowerCase();
    return APP_ROUTES.filter(r => r.label.toLowerCase().includes(term));
  }, [debouncedTerm]);

  // Group results by date
  const groupedResults = useMemo(() => groupByDate(unifiedResults), [unifiedResults]);

  // Navigation handlers
  const handleItemClick = (type: string, id: string) => {
    onOpenChange(false);
    if (type === "chat") navigate(`/c/${id}`);
    else if (type === "note") navigate(`/n/${id}`);
    else if (type === "excerpt") navigate(`/e/${id}`);
  };

  const handleMemberClick = (member: MemberSearchResult) => {
    onOpenChange(false);
    const slug = generateMemberSlug(member as any);
    navigate(`/members/${slug}`);
  };

  const handleCommitteeClick = (committee: CommitteeSearchResult) => {
    onOpenChange(false);
    if (committee.slug) {
      navigate(`/committees/${committee.slug}`);
    }
  };

  const handlePromptClick = (prompt: string) => {
    onOpenChange(false);
    navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}`);
  };

  const handleRouteClick = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  // Check if we have any results to show
  const hasResults = useMemo(() => {
    return filteredRoutes.length > 0 ||
      unifiedResults.length > 0 ||
      memberResults.length > 0 ||
      committeeResults.length > 0 ||
      filteredPrompts.length > 0;
  }, [filteredRoutes, unifiedResults, memberResults, committeeResults, filteredPrompts]);

  // Render date group
  const renderDateGroup = (label: string, items: SearchResult[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <p className="px-4 py-2 text-xs font-medium text-muted-foreground">{label}</p>
        {items.map(item => {
          const snippet = debouncedTerm ? extractSnippet(item.preview_text, debouncedTerm) : null;

          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleItemClick(item.type, item.id)}
              className="flex items-start gap-3 w-full px-4 py-3 text-sm hover:bg-muted transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  {item.type === "note" ? `Note: ${item.title || "Untitled"}` :
                   item.type === "excerpt" ? `Excerpt: ${item.title || "Untitled"}` :
                   (item.title || "Untitled")}
                </div>
                {snippet && (
                  <div className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
                    {snippet.before}
                    <span className="font-semibold text-foreground">{snippet.match}</span>
                    {snippet.after}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                {formatSearchDate(item.last_activity_at)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentNoOverlay className="sm:max-w-[680px] p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            ref={inputRef}
            placeholder="Search NYSgpt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
            <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results - fixed height container */}
        <div className="h-[400px] overflow-y-auto">
          {/* Member Pages (search mode only) */}
          {debouncedTerm && memberResults.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Member Pages</p>
              {memberResults.map(member => (
                <button
                  key={member.people_id}
                  onClick={() => handleMemberClick(member)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium text-muted-foreground">
                      {(member.first_name?.[0] || member.name?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {member.name || `${member.first_name || ""} ${member.last_name || ""}`.trim()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[member.party, member.chamber].filter(Boolean).join(" - ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Committee Pages (search mode only) */}
          {debouncedTerm && committeeResults.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Committee Pages</p>
              {committeeResults.map(committee => (
                <button
                  key={committee.committee_id}
                  onClick={() => handleCommitteeClick(committee)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <img
                    src={committee.chamber?.toLowerCase() === "senate" ? "/nys-senate-seal.avif" : "/nys-assembly-seal.avif"}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{committee.committee_name}</div>
                    {committee.chamber && (
                      <div className="text-xs text-muted-foreground">{committee.chamber}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pages section (both modes) */}
          {filteredRoutes.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Pages</p>
              {filteredRoutes.map(route => (
                <button
                  key={route.path}
                  onClick={() => handleRouteClick(route.path)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <span className="truncate">{route.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Prompts section (search mode only, max 8) */}
          {debouncedTerm && filteredPrompts.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-medium text-muted-foreground">Prompts</p>
              {filteredPrompts.map((p, idx) => (
                <button
                  key={`prompt-${idx}`}
                  onClick={() => handlePromptClick(p.prompt)}
                  className="flex flex-col items-start w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted-foreground text-xs line-clamp-1">{p.prompt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Chronological date groups (both modes) */}
          {user && (
            <>
              {renderDateGroup("Today", groupedResults.today)}
              {renderDateGroup("Yesterday", groupedResults.yesterday)}
              {renderDateGroup("Previous 7 Days", groupedResults.previous7Days)}
              {renderDateGroup("Older", groupedResults.older)}
            </>
          )}

          {/* Unauthenticated state */}
          {!user && !debouncedTerm && (
            <div className="p-4 text-center text-muted-foreground">
              <p>Sign in to search your chats and notes</p>
            </div>
          )}

          {/* Empty / No Results State */}
          {!hasResults && !isSearching && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {debouncedTerm ? (
                <p>No results found for "{debouncedTerm}"</p>
              ) : (
                <p>No items yet</p>
              )}
            </div>
          )}

          {/* Skeleton Loading State */}
          {isSearching && (
            <div className="py-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/5 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-4/5 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
              Close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
              Navigate
            </span>
          </div>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" />
            Open
          </span>
        </div>
      </DialogContentNoOverlay>
    </Dialog>
  );
}
