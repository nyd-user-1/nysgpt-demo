import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MessageSquare, ScrollText, Users, Landmark, Wallet, GraduationCap, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileMenuIcon } from '@/components/MobileMenuButton';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChatSessions } from '@/pages/chats/hooks/useChatSessions';
import { ChatSession } from '@/pages/chats/types';
import { InsetPanel } from '@/components/ui/inset-panel';

type ChatType = 'all' | 'bill' | 'member' | 'committee' | 'school-funding' | 'contract' | 'general';

const Chats2 = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { chatSessions, loading, deleteSession } = useChatSessions();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChatType>('all');

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

  // Determine chat type
  const getChatType = (session: ChatSession): ChatType => {
    const titleLower = session.title.toLowerCase();

    if (session.bill_id) return 'bill';
    if (session.member_id) return 'member';
    if (session.committee_id) return 'committee';

    // Detect by title pattern
    if (titleLower.includes('school funding') || titleLower.includes('school aid')) return 'school-funding';
    if (titleLower.includes('contract')) return 'contract';
    if (titleLower.includes('bill ') || titleLower.match(/^(a|s)\d+/i)) return 'bill';

    return 'general';
  };

  // Filter chats based on search and type
  const filteredChats = chatSessions.filter((session) => {
    const searchLower = searchTerm.toLowerCase();

    // Search in title
    const matchesTitle = session.title.toLowerCase().includes(searchLower);

    // Search in all message content (both user and assistant messages)
    const messages = session.messages as unknown as Array<{ role: string; content: string }>;
    const matchesContent = searchTerm && Array.isArray(messages) && messages.some(
      msg => msg.content?.toLowerCase().includes(searchLower)
    );

    const matchesSearch = !searchTerm || matchesTitle || matchesContent;
    const chatType = getChatType(session);
    const matchesType = typeFilter === 'all' || chatType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Navigate to chat
  const handleChatClick = (session: ChatSession) => {
    navigate(`/c/${session.id}`);
  };

  // Delete chat with confirmation
  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete);
    }
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchTerm || typeFilter !== 'all';

  // Get counts by type using getChatType for consistency
  const typeCounts = {
    all: chatSessions.length,
    bill: chatSessions.filter(s => getChatType(s) === 'bill').length,
    member: chatSessions.filter(s => getChatType(s) === 'member').length,
    committee: chatSessions.filter(s => getChatType(s) === 'committee').length,
    'school-funding': chatSessions.filter(s => getChatType(s) === 'school-funding').length,
    contract: chatSessions.filter(s => getChatType(s) === 'contract').length,
    general: chatSessions.filter(s => getChatType(s) === 'general').length,
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
      <InsetPanel>
          {/* Header */}
          <div className="flex-shrink-0 bg-background">
            <div className="px-4 py-4">
              <div className="flex flex-col gap-4">
                {/* Title row with sidebar toggle and command button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MobileMenuIcon onOpenSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)} />
                    <button
                      onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                      className={cn("hidden md:inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors", leftSidebarOpen && "bg-muted")}
                      aria-label="Open menu"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                        <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                        <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
                      </svg>
                    </button>
                    <h1 className="text-xl font-semibold">Chat History</h1>
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
                    placeholder="Search chats by title or content... (press / to focus)"
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
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ChatType)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-muted rounded-lg px-3 py-2 h-auto text-muted-foreground data-[state=open]:bg-muted [&>svg]:hidden focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="focus:bg-muted focus:text-foreground">All Types ({typeCounts.all})</SelectItem>
                      <SelectItem value="bill" className="focus:bg-muted focus:text-foreground">Bills ({typeCounts.bill})</SelectItem>
                      <SelectItem value="member" className="focus:bg-muted focus:text-foreground">Members ({typeCounts.member})</SelectItem>
                      <SelectItem value="committee" className="focus:bg-muted focus:text-foreground">Committees ({typeCounts.committee})</SelectItem>
                      <SelectItem value="school-funding" className="focus:bg-muted focus:text-foreground">School Funding ({typeCounts['school-funding']})</SelectItem>
                      <SelectItem value="contract" className="focus:bg-muted focus:text-foreground">Contracts ({typeCounts.contract})</SelectItem>
                      <SelectItem value="general" className="focus:bg-muted focus:text-foreground">General ({typeCounts.general})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Results - Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {!isAuthenticated ? (
                  <>
                    <p className="text-muted-foreground">Please sign in to view your complete chat history.</p>
                    <Button variant="ghost" onClick={() => navigate('/auth-4')}
                      className="mt-4 h-9 px-3 font-semibold text-base hover:bg-muted">
                      Sign Up
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No chats found matching your criteria.</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Clear filters
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredChats.map((session) => (
                  <ChatCard
                    key={session.id}
                    session={session}
                    onClick={() => handleChatClick(session)}
                    onDeleteClick={(e) => handleDeleteClick(session.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
      </InsetPanel>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Chat card component
interface ChatCardProps {
  session: ChatSession;
  onClick: () => void;
  onDeleteClick: (e: React.MouseEvent) => void;
}

function ChatCard({ session, onClick, onDeleteClick }: ChatCardProps) {
  // Determine chat type and icon based on session data or title patterns
  const getChatTypeInfo = () => {
    const titleLower = session.title.toLowerCase();

    // Check for specific entity IDs first
    if (session.bill_id) return { type: 'Bill', icon: ScrollText, color: 'text-muted-foreground' };
    if (session.member_id) return { type: 'Member', icon: Users, color: 'text-muted-foreground' };
    if (session.committee_id) return { type: 'Committee', icon: Landmark, color: 'text-muted-foreground' };

    // Check for school funding and contracts by title pattern
    if (titleLower.includes('school funding') || titleLower.includes('school aid')) {
      return { type: 'School Funding', icon: GraduationCap, color: 'text-muted-foreground' };
    }
    if (titleLower.includes('contract')) {
      return { type: 'Contract', icon: Wallet, color: 'text-muted-foreground' };
    }

    // Check for bill-related titles without bill_id
    if (titleLower.includes('bill ') || titleLower.match(/^(a|s)\d+/i)) {
      return { type: 'Bill', icon: ScrollText, color: 'text-muted-foreground' };
    }

    return { type: 'General', icon: MessageSquare, color: 'text-muted-foreground' };
  };

  const typeInfo = getChatTypeInfo();
  const TypeIcon = typeInfo.icon;

  // Get message count from messages JSON
  const messages = session.messages as unknown as Array<{ role: string; content: string }>;
  const messageCount = Array.isArray(messages) ? messages.length : 0;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get preview from first user message
  const getPreview = () => {
    if (Array.isArray(messages) && messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg?.content) {
        const preview = firstUserMsg.content.substring(0, 100);
        return preview.length < firstUserMsg.content.length ? `${preview}...` : preview;
      }
    }
    return 'No messages yet';
  };

  return (
    <div
      onClick={onClick}
      className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-6 cursor-pointer transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-base flex-1 line-clamp-2 pr-2">
          {session.title}
        </h3>
        <TypeIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${typeInfo.color}`} />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {getPreview()}
      </p>

      {/* Details and button - render on hover */}
      <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-4 transition-all duration-200">
        {/* Chat details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium">{typeInfo.type}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Messages</span>
            <p className="font-medium">{messageCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated</span>
            <p className="font-medium">{formatDate(session.updated_at)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <p className="font-medium">{formatDate(session.created_at)}</p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onDeleteClick}
                  className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default Chats2;
