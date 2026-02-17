import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ReviewStatus = 'support' | 'oppose' | 'neutral' | null;

// Individual note structure
export interface BillNote {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface BillReview {
  id: string;
  user_id: string;
  bill_id: number;
  review_status: ReviewStatus;
  note: string | null; // Raw field from DB (may be string or JSON)
  notes?: BillNote[]; // Parsed notes array
  created_at: string;
  updated_at: string;
}

// Helper to parse notes from the database field
const parseNotes = (noteField: string | null): BillNote[] => {
  if (!noteField) return [];

  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(noteField);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Not JSON, treat as legacy single note string
    if (noteField.trim()) {
      return [{
        id: 'legacy-note',
        content: noteField,
        created_at: new Date().toISOString(),
      }];
    }
  }
  return [];
};

// Helper to stringify notes for storage
const stringifyNotes = (notes: BillNote[]): string => {
  return JSON.stringify(notes);
};

// Generate unique ID for notes
const generateNoteId = (): string => {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useBillReviews = () => {
  const [reviews, setReviews] = useState<BillReview[]>([]);
  const [reviewsByBillId, setReviewsByBillId] = useState<Map<number, BillReview>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReviews([]);
        setReviewsByBillId(new Map());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_bill_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Parse notes for each review
      const reviewsData = (data || []).map(review => ({
        ...review,
        notes: parseNotes(review.note),
      })) as BillReview[];
      setReviews(reviewsData);

      const reviewMap = new Map<number, BillReview>();
      reviewsData.forEach(review => {
        reviewMap.set(review.bill_id, review);
      });
      setReviewsByBillId(reviewMap);
    } catch (error) {
      console.error("Failed to load bill reviews:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getReviewForBill = useCallback((billId: number): BillReview | undefined => {
    return reviewsByBillId.get(billId);
  }, [reviewsByBillId]);

  const setReviewStatus = useCallback(async (billId: number, status: ReviewStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to review bills",
          variant: "destructive",
        });
        return;
      }

      const existingReview = reviewsByBillId.get(billId);

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("user_bill_reviews")
          .update({ review_status: status })
          .eq("id", existingReview.id);

        if (error) throw error;

        // Update local state
        const updatedReview = { ...existingReview, review_status: status, updated_at: new Date().toISOString() };
        setReviewsByBillId(prev => new Map(prev).set(billId, updatedReview));
        setReviews(prev => prev.map(r => r.id === existingReview.id ? updatedReview : r));
      } else {
        // Create new review
        const { data, error } = await supabase
          .from("user_bill_reviews")
          .insert({
            user_id: user.id,
            bill_id: billId,
            review_status: status,
          })
          .select()
          .single();

        if (error) throw error;

        const newReview = data as BillReview;
        setReviewsByBillId(prev => new Map(prev).set(billId, newReview));
        setReviews(prev => [newReview, ...prev]);
      }

      const statusLabel = status === 'support' ? 'Support' : status === 'oppose' ? 'Oppose' : 'Neutral';
      toast({
        title: "Review saved",
        description: `Bill marked as "${statusLabel}"`,
      });
    } catch (error) {
      console.error("Failed to save review status:", error);
      toast({
        title: "Error",
        description: "Failed to save review status",
        variant: "destructive",
      });
    }
  }, [reviewsByBillId, toast]);

  const saveNote = useCallback(async (billId: number, note: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add notes",
          variant: "destructive",
        });
        return;
      }

      const existingReview = reviewsByBillId.get(billId);

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("user_bill_reviews")
          .update({ note })
          .eq("id", existingReview.id);

        if (error) throw error;

        // Update local state
        const updatedReview = { ...existingReview, note, updated_at: new Date().toISOString() };
        setReviewsByBillId(prev => new Map(prev).set(billId, updatedReview));
        setReviews(prev => prev.map(r => r.id === existingReview.id ? updatedReview : r));
      } else {
        // Create new review with just a note
        const { data, error } = await supabase
          .from("user_bill_reviews")
          .insert({
            user_id: user.id,
            bill_id: billId,
            note,
          })
          .select()
          .single();

        if (error) throw error;

        const newReview = data as BillReview;
        setReviewsByBillId(prev => new Map(prev).set(billId, newReview));
        setReviews(prev => [newReview, ...prev]);
      }

      toast({
        title: "Note saved",
        description: "Your note has been saved",
      });
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    }
  }, [reviewsByBillId, toast]);

  const saveReview = useCallback(async (billId: number, status: ReviewStatus, note: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to review bills",
          variant: "destructive",
        });
        return;
      }

      const existingReview = reviewsByBillId.get(billId);

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("user_bill_reviews")
          .update({ review_status: status, note })
          .eq("id", existingReview.id);

        if (error) throw error;

        // Update local state
        const updatedReview = { ...existingReview, review_status: status, note, updated_at: new Date().toISOString() };
        setReviewsByBillId(prev => new Map(prev).set(billId, updatedReview));
        setReviews(prev => prev.map(r => r.id === existingReview.id ? updatedReview : r));
      } else {
        // Create new review
        const { data, error } = await supabase
          .from("user_bill_reviews")
          .insert({
            user_id: user.id,
            bill_id: billId,
            review_status: status,
            note,
          })
          .select()
          .single();

        if (error) throw error;

        const newReview = data as BillReview;
        setReviewsByBillId(prev => new Map(prev).set(billId, newReview));
        setReviews(prev => [newReview, ...prev]);
      }

      toast({
        title: "Review saved",
        description: "Your review has been saved",
      });
    } catch (error) {
      console.error("Failed to save review:", error);
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive",
      });
    }
  }, [reviewsByBillId, toast]);

  // Add a new note to a bill
  const addNote = useCallback(async (billId: number, content: string, silent?: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add notes",
          variant: "destructive",
        });
        return;
      }

      const existingReview = reviewsByBillId.get(billId);
      const existingNotes = existingReview?.notes || [];

      const newNote: BillNote = {
        id: generateNoteId(),
        content,
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [...existingNotes, newNote];
      const noteString = stringifyNotes(updatedNotes);

      if (existingReview) {
        const { error } = await supabase
          .from("user_bill_reviews")
          .update({ note: noteString })
          .eq("id", existingReview.id);

        if (error) throw error;

        const updatedReview = {
          ...existingReview,
          note: noteString,
          notes: updatedNotes,
          updated_at: new Date().toISOString()
        };
        setReviewsByBillId(prev => new Map(prev).set(billId, updatedReview));
        setReviews(prev => prev.map(r => r.id === existingReview.id ? updatedReview : r));
      } else {
        const { data, error } = await supabase
          .from("user_bill_reviews")
          .insert({
            user_id: user.id,
            bill_id: billId,
            note: noteString,
          })
          .select()
          .single();

        if (error) throw error;

        const newReview = { ...data, notes: updatedNotes } as BillReview;
        setReviewsByBillId(prev => new Map(prev).set(billId, newReview));
        setReviews(prev => [newReview, ...prev]);
      }

      if (!silent) {
        toast({
          title: "Note added",
          description: "Your note has been saved",
        });
      }
    } catch (error) {
      console.error("Failed to add note:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to add note",
          variant: "destructive",
        });
      }
    }
  }, [reviewsByBillId, toast]);

  // Update an existing note
  const updateNote = useCallback(async (billId: number, noteId: string, content: string, silent?: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to edit notes",
          variant: "destructive",
        });
        return;
      }

      const existingReview = reviewsByBillId.get(billId);
      if (!existingReview) return;

      const updatedNotes = (existingReview.notes || []).map(note =>
        note.id === noteId
          ? { ...note, content, updated_at: new Date().toISOString() }
          : note
      );

      const noteString = stringifyNotes(updatedNotes);

      const { error } = await supabase
        .from("user_bill_reviews")
        .update({ note: noteString })
        .eq("id", existingReview.id);

      if (error) throw error;

      const updatedReview = {
        ...existingReview,
        note: noteString,
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      };
      setReviewsByBillId(prev => new Map(prev).set(billId, updatedReview));
      setReviews(prev => prev.map(r => r.id === existingReview.id ? updatedReview : r));

      if (!silent) {
        toast({
          title: "Note updated",
          description: "Your note has been updated",
        });
      }
    } catch (error) {
      console.error("Failed to update note:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to update note",
          variant: "destructive",
        });
      }
    }
  }, [reviewsByBillId, toast]);

  // Delete a note
  const deleteNote = useCallback(async (billId: number, noteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete notes",
          variant: "destructive",
        });
        return;
      }

      const existingReview = reviewsByBillId.get(billId);
      if (!existingReview) return;

      const updatedNotes = (existingReview.notes || []).filter(note => note.id !== noteId);
      const noteString = updatedNotes.length > 0 ? stringifyNotes(updatedNotes) : null;

      const { error } = await supabase
        .from("user_bill_reviews")
        .update({ note: noteString })
        .eq("id", existingReview.id);

      if (error) throw error;

      const updatedReview = {
        ...existingReview,
        note: noteString,
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      };
      setReviewsByBillId(prev => new Map(prev).set(billId, updatedReview));
      setReviews(prev => prev.map(r => r.id === existingReview.id ? updatedReview : r));

      toast({
        title: "Note deleted",
        description: "Your note has been removed",
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  }, [reviewsByBillId, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    reviewsByBillId,
    loading,
    getReviewForBill,
    setReviewStatus,
    saveNote,
    saveReview,
    addNote,
    updateNote,
    deleteNote,
    refetch: fetchReviews,
  };
};
