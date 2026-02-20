/**
 * NoteViewSidebar - A standalone sidebar component for the NoteView page
 * Slides in from off-screen outside the main container
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ScrollText,
  Users,
  Landmark,
  DollarSign,
  ChevronRight,
  ChevronDown,
  PenSquare,
  TextQuote,
  Wallet,
  GraduationCap,
  NotebookPen,
  Search,
  Settings,
  Sun,
  Moon,
  LogIn,
  LogOut,
  HandCoins,
  TrendingUp,
  Banknote,
  MoreHorizontal,
  Pin,
  Trash2,
  Pencil,
  BookCheck,
  BarChart3,
  CirclePlus,
  Shield,
  Sparkles,
  Briefcase,
  Play,
  ArrowUpRight,
  Zap,
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useRecentChats } from "@/hooks/useRecentChats";
import { trackEvent } from "@/utils/analytics";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent as RenameDialogContent,
  DialogHeader as RenameDialogHeader,
  DialogTitle as RenameDialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface NoteViewSidebarProps {
  onClose?: () => void;
}

interface Excerpt {
  id: string;
  title: string;
}

interface Note {
  id: string;
  title: string;
  updated_at: string;
  isPinned?: boolean;
}

const PINNED_NOTES_KEY = "nysgpt_pinned_notes";

// Helper to get pinned note IDs from localStorage
const getPinnedNoteIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem(PINNED_NOTES_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
};

const savePinnedNoteIds = (ids: Set<string>) => {
  localStorage.setItem(PINNED_NOTES_KEY, JSON.stringify([...ids]));
};

export function NoteViewSidebar({ onClose }: NoteViewSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const { recentChats, deleteChat, togglePinChat, renameChat, refetch: refetchChats, loadMore, loadingMore, hasMore } = useRecentChats();
  const [recentExcerpts, setRecentExcerpts] = useState<Excerpt[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(getPinnedNoteIds());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<{ id: string; title: string; type: 'chat' | 'note' } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  // Infinite scroll - load more chats when scrolling sidebar to bottom
  useEffect(() => {
    const scrollContainer = sidebarScrollRef.current;
    const loadMoreElement = loadMoreRef.current;

    if (!scrollContainer || !loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, recentChats.length]);

  // Check current theme
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose?.();
  }, [location.pathname]);

  // Fetch recent excerpts
  const fetchRecentExcerpts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("chat_excerpts")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentExcerpts(data);
    }
  }, [user]);

  // Fetch recent notes
  const fetchRecentNotes = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("chat_notes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentNotes(data);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentExcerpts();
    fetchRecentNotes();
  }, [fetchRecentExcerpts, fetchRecentNotes]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetchChats();
      fetchRecentExcerpts();
      fetchRecentNotes();
    };
    window.addEventListener("refresh-sidebar-notes", handleRefresh);
    return () => window.removeEventListener("refresh-sidebar-notes", handleRefresh);
  }, [refetchChats, fetchRecentExcerpts, fetchRecentNotes]);

  const isActive = (url: string) => location.pathname === url;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };


  const handleRenameClick = (id: string, currentTitle: string, type: 'chat' | 'note') => {
    setItemToRename({ id, title: currentTitle, type });
    setRenameValue(currentTitle);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!itemToRename || !renameValue.trim()) return;

    if (itemToRename.type === 'chat') {
      await renameChat(itemToRename.id, renameValue.trim());
    } else if (itemToRename.type === 'note') {
      await renameNote(itemToRename.id, renameValue.trim());
    }

    setRenameDialogOpen(false);
    setItemToRename(null);
    setRenameValue("");
  };

  const handleInlineRenameSubmit = async (id: string, type: 'chat' | 'note') => {
    if (!inlineEditValue.trim()) {
      setInlineEditId(null);
      return;
    }
    if (type === 'chat') {
      await renameChat(id, inlineEditValue.trim());
    } else {
      await renameNote(id, inlineEditValue.trim());
    }
    setInlineEditId(null);
    setInlineEditValue("");
  };

  // Note operations
  const renameNote = async (noteId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("chat_notes")
        .update({ title: newTitle })
        .eq("id", noteId);

      if (error) throw error;

      setRecentNotes(prev => prev.map(note =>
        note.id === noteId ? { ...note, title: newTitle } : note
      ));
    } catch (error) {
      console.error("Error renaming note:", error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("chat_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setRecentNotes(prev => prev.filter(note => note.id !== noteId));

      // Remove from pinned if it was pinned
      const newPinnedIds = new Set(pinnedNoteIds);
      newPinnedIds.delete(noteId);
      setPinnedNoteIds(newPinnedIds);
      savePinnedNoteIds(newPinnedIds);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const togglePinNote = (noteId: string) => {
    const newPinnedIds = new Set(pinnedNoteIds);
    if (newPinnedIds.has(noteId)) {
      newPinnedIds.delete(noteId);
    } else {
      newPinnedIds.add(noteId);
    }
    setPinnedNoteIds(newPinnedIds);
    savePinnedNoteIds(newPinnedIds);
  };

  // Get user display name
  const displayName = user ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User') : 'Guest';

  return (
    <TooltipProvider delayDuration={300}>
    {/* Single scroll container - ChatGPT architecture */}
    <nav ref={sidebarScrollRef} className="relative flex h-full w-full flex-col overflow-y-auto bg-[#f9f9f9] dark:bg-background">
      {/* Sticky Header - stays at top while scrolling */}
      <aside className="sticky top-0 z-40 bg-[#f9f9f9] dark:bg-background">
        {/* Header with NYSgpt logo and close button */}
        <div className="flex items-center justify-between px-3 py-3">
          {/* NYSgpt Logo */}
          <button
            onClick={() => navigate(user ? '/new-chat' : '/')}
            className="font-bold text-lg hover:opacity-80 transition-opacity"
          >
            NYSgpt
          </button>

          {/* Close sidebar button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
              <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
              <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
            </svg>
          </Button>
        </div>

        {/* Fixed Top Actions */}
        <div className="px-2 pb-2 space-y-1">
        {/* #1 New Chat */}
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to="/new-chat"
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                isActive("/new-chat") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <PenSquare className="h-4 w-4" />
              <span className="flex-1">New Chat</span>
              <span className="hidden sm:block text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                ⇧⌘O
              </span>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Start a new conversation</p>
          </TooltipContent>
        </Tooltip>

        {/* #2 Search Chats */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
                onClose?.();
              }}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors w-full text-left",
                "hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1">Search Chats</span>
              <span className="hidden sm:block text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                ⌘K
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Search your chats</p>
          </TooltipContent>
        </Tooltip>

        {/* #3 User Prompts */}
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to="/prompts"
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                isActive("/prompts") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span className="flex-1">User Prompts</span>
              <span className="hidden sm:block text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                New
              </span>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Browse prompts & lists</p>
          </TooltipContent>
        </Tooltip>
        </div>
      </aside>

      {/* Scrollable Content Area - flows behind sticky header/footer */}
      <div className="flex-1 py-2">
        {/* Research Navigation */}
        <div className="px-2 space-y-1">
            {/* Civic Tier Section */}
            <Collapsible className="group/civic">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <span>Civic Tier</span>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                    Free
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/civic:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/bills"
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/bills") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <ScrollText className="h-4 w-4" />
                      <span className="flex-1">Bills</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Browse legislative bills</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/committees"
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/committees") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <Landmark className="h-4 w-4" />
                      <span className="flex-1">Committees</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Explore legislative committees</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/departments"
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/departments") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <BookCheck className="h-4 w-4" />
                      <span className="flex-1">Departments</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Explore NYS departments & agencies</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/members"
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/members") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      <span className="flex-1">Members</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>View elected officials</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/blog"
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/blog") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <Newspaper className="h-4 w-4" />
                      <span className="flex-1">Journal</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Legislative insights & analysis</p>
                  </TooltipContent>
                </Tooltip>
              </CollapsibleContent>
            </Collapsible>

            {/* Pro Tier Section */}
            <Collapsible className="group/pro">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <span>Pro Tier</span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); navigate('/plans'); onClose?.(); }}
                    className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 transition-shadow hover:shadow-sm cursor-pointer"
                  >
                    Upgrade
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/pro:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                {/* Notes */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/new-note"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/new-note") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <NotebookPen className="h-4 w-4" />
                      <span>Notes</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Create a new note</p>
                  </TooltipContent>
                </Tooltip>


                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/budget"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/budget") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Budget</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>NYS Budget data</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/contracts"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/contracts") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Contracts</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Search government contracts</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/explore/budget"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/explore/budget") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Explorer</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Explore NYS budget spending data</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/lobbying"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/lobbying") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <HandCoins className="h-4 w-4" />
                      <span>Lobbyists</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Explore lobbying data</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/revenue"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/revenue") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Revenue</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>NYS revenue data</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/discretionary"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/discretionary") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>Discretionary</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>NYS discretionary grants</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/school-funding"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors",
                        isActive("/school-funding") ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Schools</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>School funding information</p>
                  </TooltipContent>
                </Tooltip>
              </CollapsibleContent>
            </Collapsible>

            {/* User Login - only for unauthenticated users */}
            {!user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate('/auth')}
                    className="flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-base md:text-[15px] font-normal transition-colors hover:bg-muted w-full text-left"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>User Login</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Log in to your account</p>
                </TooltipContent>
              </Tooltip>
            )}

        </div>

        {/* Notes Section */}
        {recentNotes.length > 0 && (
          <Collapsible className="group/notes mt-4">
            <div className="px-2">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors">
                Notes
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/notes:rotate-90" />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="px-2 space-y-1">
              {recentNotes.map((note) => (
                <div key={`note-${note.id}`} className="group/item relative">
                  {inlineEditId === note.id ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 md:py-2 pr-8 rounded-md text-[15px] md:text-sm bg-muted w-full">
                      {pinnedNoteIds.has(note.id) ? (
                        <Pin className="h-4 w-4 flex-shrink-0 text-primary" />
                      ) : (
                        <NotebookPen className="h-4 w-4 flex-shrink-0" />
                      )}
                      <input
                        autoFocus
                        className="flex-1 bg-transparent outline-none text-[15px] md:text-sm min-w-0"
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInlineRenameSubmit(note.id, 'note');
                          } else if (e.key === 'Escape') {
                            setInlineEditId(null);
                          }
                        }}
                        onBlur={() => handleInlineRenameSubmit(note.id, 'note')}
                      />
                    </div>
                  ) : (
                    <NavLink
                      to={`/n/${note.id}`}
                      onClick={onClose}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setInlineEditId(note.id);
                        setInlineEditValue(note.title || "Untitled Note");
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 md:py-2 pr-8 rounded-md text-[15px] md:text-sm transition-colors",
                        location.pathname === `/n/${note.id}` ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      {pinnedNoteIds.has(note.id) ? (
                        <Pin className="h-4 w-4 flex-shrink-0 text-primary" />
                      ) : (
                        <NotebookPen className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="truncate">{note.title || "Untitled Note"}</span>
                    </NavLink>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="right">
                      <DropdownMenuItem onClick={() => handleRenameClick(note.id, note.title || "Untitled Note", 'note')}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePinNote(note.id)}>
                        <Pin className="h-4 w-4 mr-2" />
                        {pinnedNoteIds.has(note.id) ? "Unpin Note" : "Pin Note"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteNote(note.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Excerpts Section */}
        {recentExcerpts.length > 0 && (
          <Collapsible className="group/excerpts mt-2">
            <div className="px-2">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors">
                Excerpts
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/excerpts:rotate-90" />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="px-2 space-y-1">
              {recentExcerpts.map((excerpt) => (
                <NavLink
                  key={`excerpt-${excerpt.id}`}
                  to={`/e/${excerpt.id}`}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-[15px] md:text-sm transition-colors",
                    location.pathname === `/e/${excerpt.id}` ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                >
                  <TextQuote className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{excerpt.title}</span>
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Your Chats Section - AT BOTTOM for infinite scroll */}
        {recentChats.length > 0 && (
          <Collapsible className="group/chats mt-2">
            <div className="px-2">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors">
                Your Chats
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/chats:rotate-90" />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="px-2 space-y-1">
              {recentChats.map((chat) => {
                const rawTitle = chat.title || "Untitled Chat";
                const chatTitle = rawTitle.replace(/^\[Contract:[^\]]+\]\s*/, '').replace(/^\[SchoolFunding:[^\]]+\]\s*/, '');

                return (
                  <div key={`chat-${chat.id}`} className="group/item relative">
                    {inlineEditId === chat.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 pr-8 rounded-md text-sm font-normal bg-muted w-full">
                        {chat.isPinned && <Pin className="h-4 w-4 flex-shrink-0 text-primary" />}
                        <input
                          autoFocus
                          className="flex-1 bg-transparent outline-none text-sm min-w-0"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleInlineRenameSubmit(chat.id, 'chat');
                            } else if (e.key === 'Escape') {
                              setInlineEditId(null);
                            }
                          }}
                          onBlur={() => handleInlineRenameSubmit(chat.id, 'chat')}
                        />
                      </div>
                    ) : (
                      <NavLink
                        to={`/c/${chat.id}`}
                        onClick={onClose}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          setInlineEditId(chat.id);
                          setInlineEditValue(chatTitle);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 pr-12 rounded-md text-sm font-normal transition-colors",
                          location.pathname === `/c/${chat.id}` ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"
                        )}
                      >
                        {chat.isPinned && <Pin className="h-4 w-4 flex-shrink-0 text-primary" />}
                        <span className="truncate">{chatTitle}</span>
                      </NavLink>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="right">
                        <DropdownMenuItem onClick={() => handleRenameClick(chat.id, chatTitle, 'chat')}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePinChat(chat.id)}>
                          <Pin className="h-4 w-4 mr-2" />
                          {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteChat(chat.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
              {/* Load more trigger - always rendered so IntersectionObserver can observe */}
              <div ref={loadMoreRef} className="py-1">
                {loadingMore && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-3">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Sticky Bottom Section - Account button (ChatGPT style) */}
      <aside className="sticky bottom-0 z-30 bg-[#f9f9f9] dark:bg-background p-2 pb-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                {/* Avatar with initials */}
                <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{subscription?.subscription_tier || 'Free'}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-64 mb-1">
              {/* User Info Header */}
              <div className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => { trackEvent('upgrade_prompt_clicked', { source: 'sidebar_account' }); navigate('/plans'); onClose?.(); }}>
                <Zap className="h-4 w-4 mr-2" />
                Upgrade plan
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {isDarkMode ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => { document.documentElement.classList.remove('dark'); setIsDarkMode(false); }}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { document.documentElement.classList.add('dark'); setIsDarkMode(true); }}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => { navigate('/features'); onClose?.(); }}>
                <Sparkles className="h-4 w-4 mr-2" />
                Features
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/use-cases'); onClose?.(); }}>
                <Briefcase className="h-4 w-4 mr-2" />
                Use Cases
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/video'); onClose?.(); }}>
                <Play className="h-4 w-4 mr-2" />
                Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/blog'); onClose?.(); }}>
                <Newspaper className="h-4 w-4 mr-2" />
                Blog
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => navigate('/auth-4')}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <LogIn className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Sign up or log in</p>
            </div>
          </button>
        )}
      </aside>

      {/* Rename Chat Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={(open) => {
        setRenameDialogOpen(open);
        if (!open) document.body.style.pointerEvents = '';
      }}>
        <RenameDialogContent className="sm:max-w-[425px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          <RenameDialogHeader>
            <RenameDialogTitle>Rename Chat</RenameDialogTitle>
          </RenameDialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new title"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>
              Save
            </Button>
          </DialogFooter>
        </RenameDialogContent>
      </Dialog>
    </nav>
    </TooltipProvider>
  );
}
