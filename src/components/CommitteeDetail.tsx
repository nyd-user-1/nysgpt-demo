import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  CommitteeInformation,
  CommitteeTabs
} from "./features/committees";
import { useCommitteeNotes, CommitteeNote } from "@/hooks/useCommitteeNotes";
import { CommitteeNoteDialog } from "./features/committees/CommitteeNoteDialog";

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

interface CommitteeDetailProps {
  committee: Committee;
  onBack: () => void;
}

export const CommitteeDetail = ({ committee, onBack }: CommitteeDetailProps) => {
  const navigate = useNavigate();
  const [committeeChats, setCommitteeChats] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CommitteeNote | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { notes, addNote, updateNote, deleteNote } = useCommitteeNotes(committee.committee_id);

  // Fetch committee chats
  useEffect(() => {
    const fetchCommitteeChats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("chat_sessions")
          .select("id, title, created_at")
          .eq("committee_id", committee.committee_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setCommitteeChats(data);
        }
      } catch (error) {
        console.error("Error fetching committee chats:", error);
      }
    };

    fetchCommitteeChats();
  }, [committee.committee_id]);

  const formatNoteDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleAddNote = () => {
    setEditingNote(null);
    setNoteDialogOpen(true);
  };

  const handleEditNote = (note: CommitteeNote) => {
    setEditingNote(note);
    setNoteDialogOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
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

  const handleNewChat = async () => {
    const initialPrompt = `Tell me about the ${committee.chamber} ${committee.name} committee`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}&committeeId=${committee.committee_id}`);
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
                    className="inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-muted transition-colors"
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
            <div className="container mx-auto px-4 sm:px-6 py-6">
              <div className="max-w-7xl mx-auto space-y-6">
        {/* Committee Header Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <CommitteeInformation committee={committee} hasNotes={notes.length > 0} />
          </CardContent>
        </Card>

        {/* Committee Tabs Section */}
        <section>
          <CommitteeTabs committee={committee} />
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

        {/* Committee Chats Section */}
        <Card className="bg-card rounded-xl shadow-sm border">
          <CardHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-semibold">
                  Committee Chats
                </CardTitle>
                {committeeChats.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {committeeChats.length} {committeeChats.length === 1 ? 'chat' : 'chats'}
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
            {committeeChats.length === 0 ? (
              <div className="bg-muted/30 rounded-lg p-4 text-sm">
                <span className="text-muted-foreground italic">No chats yet. Start a conversation about this committee.</span>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {committeeChats.map((chat) => (
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

      {/* Note Dialog */}
      <CommitteeNoteDialog
        isOpen={noteDialogOpen}
        onClose={() => {
          setNoteDialogOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialNote={editingNote?.content || ''}
      />
    </div>
  );
};
