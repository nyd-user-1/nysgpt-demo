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
import { ArrowLeft, Plus, ExternalLink, MapPin, Calendar, DollarSign, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SchoolFundingTotals, SchoolFunding } from "@/types/schoolFunding";
import { formatCurrency, formatPercent } from "@/hooks/useSchoolFundingSearch";
import { useSchoolFundingNotes } from "@/hooks/useSchoolFundingNotes";
import { NoteDialog } from "@/components/shared/NoteDialog";
import { InsetPanel } from '@/components/ui/inset-panel';

const SchoolFundingDetail = () => {
  const navigate = useNavigate();
  const { fundingId } = useParams<{ fundingId: string }>();
  const [fundingChats, setFundingChats] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Notes state
  const { notes, addNote, updateNote, deleteNote } = useSchoolFundingNotes(fundingId);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string; content: string } | null>(null);

  useEffect(() => {
    setSidebarMounted(true);
  }, []);

  // Fetch school funding totals data
  const { data: funding, isLoading, error } = useQuery({
    queryKey: ['school-funding-totals', fundingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_funding_totals')
        .select('*')
        .eq('id', fundingId)
        .single();

      if (error) throw error;
      return data as SchoolFundingTotals;
    },
    enabled: !!fundingId,
  });

  // Fetch detailed breakdown by aid category from school_funding JSONB categories
  const { data: categories } = useQuery({
    queryKey: ['school-funding-categories', funding?.district, funding?.enacted_budget],
    queryFn: async () => {
      if (!funding) return [];

      const { data, error } = await supabase
        .from('school_funding')
        .select('categories')
        .eq('District', funding.district)
        .eq('enacted_budget', funding.enacted_budget)
        .single();

      if (error) throw error;
      return (data?.categories || []) as SchoolFunding[];
    },
    enabled: !!funding,
  });

  // Fetch school-funding related chats - only chats initiated from this specific funding record
  useEffect(() => {
    const fetchFundingChats = async () => {
      if (!fundingId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Search for chats with this specific funding ID marker
        const { data, error } = await supabase
          .from("chat_sessions")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .ilike("title", `%[SchoolFunding:${fundingId}]%`)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setFundingChats(data);
        }
      } catch (error) {
        console.error("Error fetching funding chats:", error);
      }
    };

    fetchFundingChats();
  }, [fundingId]);

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
    if (!funding) return;

    // Store school funding details in sessionStorage for the chat to display
    const schoolFundingDetails = {
      district: funding.district,
      county: funding.county,
      budgetYear: funding.enacted_budget,
      totalBaseYear: funding.total_base_year,
      totalSchoolYear: funding.total_school_year,
      totalChange: funding.total_change,
      percentChange: funding.percent_change,
      categories: (categories || []).map((cat: SchoolFunding) => {
        // Parse dollar amounts from base_year and school_year columns
        const baseYearStr = cat.base_year || '0';
        const schoolYearStr = cat.school_year || '0';
        const baseYear = parseFloat(baseYearStr.replace(/[$,]/g, '')) || 0;
        const schoolYear = parseFloat(schoolYearStr.replace(/[$,]/g, '')) || 0;
        const rawPctChange = parseFloat(cat.percent_change || '0');
        const pctChange = isNaN(rawPctChange) ? 0 : rawPctChange;
        return {
          name: cat.aid_category || 'Unknown',
          baseYear: Math.round(baseYear).toLocaleString(),
          schoolYear: Math.round(schoolYear).toLocaleString(),
          change: formatCurrency(schoolYear - baseYear),
          percentChange: `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`,
        };
      }),
    };
    sessionStorage.setItem('schoolFundingDetails', JSON.stringify(schoolFundingDetails));

    // Include fundingId in prompt for precise chat association
    const initialPrompt = `[SchoolFunding:${fundingId}] Analyze school funding for ${funding.district} in ${funding.county || 'New York'} County for the ${funding.enacted_budget} budget year. Total change: ${formatCurrency(funding.total_change)} (${formatPercent(funding.percent_change)}). What should I know about this district's funding?`;
    navigate(`/new-chat?prompt=${encodeURIComponent(initialPrompt)}`);
  };

  const handleBack = () => {
    navigate('/school-funding');
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

  if (error || !funding) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 bg-background min-h-screen">
        <div className="max-w-[1300px] mx-auto">
          <Button variant="outline" onClick={handleBack} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to School Funding
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">School funding record not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPositiveChange = funding.total_change >= 0;

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
              <span className="hidden sm:inline">Back to School Funding</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* School Funding Header Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-6 relative">
                  {/* Header */}
                  <div className="pb-4 border-b">
                    <h1 className="text-2xl font-semibold text-foreground">
                      {funding.district}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {funding.county && `${funding.county} County`}
                    </p>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Budget Year</div>
                      <div className="font-semibold">{funding.enacted_budget}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Total Change</div>
                      <div className={`font-semibold flex items-center gap-1 ${isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPositiveChange ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {formatCurrency(funding.total_change)}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Percent Change</div>
                      <div className={`font-semibold ${isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercent(funding.percent_change)}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">Aid Categories</div>
                      <div className="font-semibold">{funding.category_count}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Base Year Total */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <DollarSign className="h-4 w-4" />
                          <span>Base Year Total</span>
                        </div>
                        <div className="text-muted-foreground ml-6">
                          {formatCurrency(funding.total_base_year)}
                        </div>
                      </div>

                      {/* School Year Total */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <DollarSign className="h-4 w-4" />
                          <span>School Year Total</span>
                        </div>
                        <div className="text-muted-foreground ml-6">
                          {formatCurrency(funding.total_school_year)}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* County */}
                      {funding.county && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-foreground font-medium">
                            <MapPin className="h-4 w-4" />
                            <span>County</span>
                          </div>
                          <div className="text-muted-foreground ml-6">
                            {funding.county}
                          </div>
                        </div>
                      )}

                      {/* Budget Year */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Calendar className="h-4 w-4" />
                          <span>Enacted Budget</span>
                        </div>
                        <div className="text-muted-foreground ml-6">
                          {funding.enacted_budget}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aid Categories Breakdown */}
            {categories && categories.length > 0 && (
              <Card className="bg-card rounded-xl shadow-sm border">
                <CardHeader className="px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg font-semibold">
                        Aid Categories Breakdown
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {categories.map((category, index) => {
                      const change = parseFloat(category.change || '0');
                      const pctChange = parseFloat(category.percent_change || '0');
                      const isPositive = change >= 0;

                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{category.aid_category || 'Unknown Category'}</div>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div className={`font-semibold text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(change)}
                            </div>
                            <div className={`text-xs ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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
                    {fundingChats.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {fundingChats.length} {fundingChats.length === 1 ? 'chat' : 'chats'}
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
                {fundingChats.length === 0 ? (
                  <div className="bg-muted/30 rounded-lg p-4 text-sm">
                    <span className="text-muted-foreground italic">No chats yet. Start a conversation about this district's funding.</span>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {fundingChats.map((chat) => (
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
        placeholder="Add your notes about this district's funding..."
      />
    </div>
  );
};

export default SchoolFundingDetail;
