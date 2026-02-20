import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Revenue, FISCAL_YEARS, fiscalYearLabel } from "@/types/revenue";
import { formatRevenueAmount } from "@/hooks/useRevenueSearch";
import { useContractNotes } from "@/hooks/useContractNotes";
import { NoteDialog } from "@/components/shared/NoteDialog";
import { InsetPanel } from '@/components/ui/inset-panel';

const RevenueDetail = () => {
  const navigate = useNavigate();
  const { revenueId } = useParams<{ revenueId: string }>();
  const [revenueChats, setRevenueChats] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Notes state — reuse the contract notes hook with a revenue-specific key
  const noteKey = revenueId ? `revenue-${revenueId}` : undefined;
  const { notes, addNote, updateNote, deleteNote } = useContractNotes(noteKey);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string; content: string } | null>(null);

  useEffect(() => {
    setSidebarMounted(true);
  }, []);

  // Fetch revenue data by id
  const { data: revenue, isLoading, error } = useQuery({
    queryKey: ['revenue', revenueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Revenue')
        .select('*')
        .eq('id', Number(revenueId))
        .single();

      if (error) throw error;
      return data as Revenue;
    },
    enabled: !!revenueId,
  });

  // Fetch revenue-related chats
  useEffect(() => {
    const fetchRevenueChats = async () => {
      if (!revenueId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("chat_sessions")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .ilike("title", `%[Revenue:${revenueId}]%`)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setRevenueChats(data);
        }
      } catch (error) {
        console.error("Error fetching revenue chats:", error);
      }
    };

    fetchRevenueChats();
  }, [revenueId]);

  const formatNoteDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleNewChat = async () => {
    if (!revenue || !revenueId) return;
    const receipt = revenue.Detail_Receipt || 'this revenue source';
    const fund = revenue.Fund_Group ? ` in the ${revenue.Fund_Group} fund group` : '';
    const category = revenue.FP_Category ? ` (${revenue.FP_Category})` : '';

    const initialPrompt = `[Revenue:${revenueId}] Tell me about the NYS revenue source "${receipt}"${fund}${category}. What should I know about this revenue category?`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const handleBack = () => {
    navigate('/revenue');
  };

  // Note handlers
  const handleAddNote = () => {
    setEditingNote(null);
    setNoteDialogOpen(true);
  };

  const handleEditNote = (note: { id: string; content: string }) => {
    setEditingNote(note);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = (content: string) => {
    if (editingNote) {
      updateNote(editingNote.id, content);
    } else {
      addNote(content);
    }
    setNoteDialogOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 bg-background min-h-screen">
        <div className="max-w-[1300px] mx-auto space-y-6">
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !revenue) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 bg-background min-h-screen">
        <div className="max-w-[1300px] mx-auto">
          <Button variant="outline" onClick={handleBack} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Revenue
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Revenue record not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Build revenue history from fiscal year columns
  const revenueHistory = FISCAL_YEARS.map((year) => ({
    year,
    amount: revenue[year as keyof Revenue] as string | null,
  })).reverse(); // Show most recent first

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Slide-in sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-[60]",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 transition-opacity"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Main Container with padding */}
      <InsetPanel>
          {/* Header */}
          <div className="flex-shrink-0 bg-background">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLeftSidebarOpen(true)}
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
            {/* Back button */}
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Revenue</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* Revenue Header Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-6 relative">
                  {/* Header */}
                  <div className="pb-4 border-b">
                    <h1 className="text-2xl font-semibold text-foreground">
                      {revenue.Detail_Receipt || 'Unknown Revenue Source'}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      {revenue.Fund_Group && (
                        <Badge variant="secondary">{revenue.Fund_Group}</Badge>
                      )}
                      {revenue.FP_Category && (
                        <span className="text-sm text-muted-foreground">
                          {revenue.FP_Category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Fund Group</div>
                      <div className="font-semibold text-sm">{revenue.Fund_Group || 'N/A'}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Category</div>
                      <div className="font-semibold text-sm">{revenue.FP_Category || 'N/A'}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Years of Data</div>
                      <div className="font-semibold text-sm">
                        {revenueHistory.filter(h => h.amount && h.amount.trim() !== '').length} of {FISCAL_YEARS.length}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue History */}
            <Card className="bg-card rounded-xl shadow-sm border">
              <CardHeader className="px-6 py-4 border-b">
                <CardTitle className="text-lg font-semibold">
                  Revenue History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-1">
                  {revenueHistory.map(({ year, amount }) => (
                    <div
                      key={year}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-medium text-muted-foreground">
                        {fiscalYearLabel(year)}
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        amount && amount.trim() !== '' ? "text-foreground" : "text-muted-foreground/50"
                      )}>
                        {formatRevenueAmount(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                    <span className="text-muted-foreground italic">No notes yet. Add a note to keep track of important information.</span>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {notes.map((note) => (
                      <AccordionItem key={note.id} value={note.id} className="border-b last:border-b-0">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 text-left">
                            <span className="text-xs text-muted-foreground">
                              {formatNoteDate(note.created_at)}
                            </span>
                            <span className="text-sm truncate max-w-[300px]">
                              {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
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

            {/* Related Chats Section */}
            <Card className="bg-card rounded-xl shadow-sm border">
              <CardHeader className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg font-semibold">
                      Related Chats
                    </CardTitle>
                    {revenueChats.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {revenueChats.length} {revenueChats.length === 1 ? 'chat' : 'chats'}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewChat}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {revenueChats.length === 0 ? (
                  <div className="bg-muted/30 rounded-lg p-4 text-sm">
                    <span className="text-muted-foreground italic">No chats yet. Start a conversation about this revenue source.</span>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {revenueChats.map((chat) => (
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
      </InsetPanel>

      {/* Note Dialog */}
      <NoteDialog
        isOpen={noteDialogOpen}
        onClose={() => {
          setNoteDialogOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialNote={editingNote?.content || ''}
        placeholder="Add your notes about this revenue source..."
      />
    </div>
  );
};

export default RevenueDetail;
