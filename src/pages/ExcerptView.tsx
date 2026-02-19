import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useExcerptPersistence } from "@/hooks/useExcerptPersistence";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, Trash2, ExternalLink, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InsetPanel } from '@/components/ui/inset-panel';
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { supabase } from "@/integrations/supabase/client";
import { ChatMarkdown } from "@/components/shared/ChatMarkdown";
import { ChatResponseFooter } from "@/components/ChatResponseFooter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Excerpt = Tables<"chat_excerpts">;

interface BillCitation {
  bill_number: string;
  title: string;
  status_desc: string;
  description?: string;
  committee?: string;
  session_id?: number;
}

const ExcerptView = () => {
  const { excerptId } = useParams<{ excerptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchExcerptById, deleteExcerpt } = useExcerptPersistence();
  const [excerpt, setExcerpt] = useState<Excerpt | null>(null);
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState<BillCitation | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadExcerpt = async () => {
      if (!excerptId) return;

      setLoading(true);
      const data = await fetchExcerptById(excerptId);
      setExcerpt(data);

      // Fetch associated bill if exists
      if (data?.bill_id) {
        const { data: billData } = await supabase
          .from("Bills")
          .select("bill_number, title, status_desc, description, committee, session_id")
          .eq("bill_id", data.bill_id)
          .single();

        if (billData) {
          setBill(billData);
        }
      }

      setLoading(false);
    };

    loadExcerpt();
  }, [excerptId, fetchExcerptById]);

  const handleDelete = async () => {
    if (!excerptId) return;

    const success = await deleteExcerpt(excerptId);
    if (success) {
      toast({
        title: "Excerpt deleted",
        description: "The excerpt has been removed.",
      });
      // Refresh sidebar
      window.dispatchEvent(new CustomEvent("refresh-sidebar-excerpts"));
      navigate("/new-chat");
    } else {
      toast({
        title: "Error",
        description: "Failed to delete excerpt.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Please log in to view excerpts.</p>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/auth-4")}
            className="bg-black text-white hover:bg-black/90 font-semibold"
          >
            Sign Up
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading excerpt...</div>
      </div>
    );
  }

  if (!excerpt) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-muted-foreground">Excerpt not found</div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Left Sidebar - OUTSIDE container, slides in from off-screen */}
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
      <InsetPanel className="relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile Sidebar Toggle */}
              <MobileMenuIcon onOpenSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)} />
              {/* Left Sidebar Toggle (Desktop) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className={cn("hidden md:inline-flex flex-shrink-0", leftSidebarOpen && "bg-muted")}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>

              {/* Back button and title */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-medium text-sm truncate max-w-[300px]">
                  {excerpt.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Saved {new Date(excerpt.created_at || "").toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {excerpt.parent_session_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/c/${excerpt.parent_session_id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View full chat
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete excerpt?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this saved excerpt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <MobileNYSgpt />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-8 px-4">
            <div className="max-w-[720px] mx-auto space-y-6">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="bg-muted/40 rounded-lg p-4 max-w-[70%]">
              <p className="text-base leading-relaxed">{excerpt.user_message}</p>
            </div>
          </div>

          {/* Assistant Message with ChatResponseFooter */}
          <div className="space-y-3">
            <ChatResponseFooter
              isStreaming={false}
              messageContent={
                <ChatMarkdown>{excerpt.assistant_message}</ChatMarkdown>
              }
              bills={bill ? [bill] : []}
              relatedBills={[]}
              sources={[
                {
                  number: 1,
                  url: "https://www.nysgpt.com",
                  title: "NYSgpt - Legislative Policy Platform",
                  excerpt: "AI-powered legislative research and policy analysis platform.",
                },
                {
                  number: 2,
                  url: "https://nyassembly.gov/",
                  title: "New York State Assembly",
                  excerpt: "Official website of the New York State Assembly.",
                },
                {
                  number: 3,
                  url: "https://www.nysenate.gov/",
                  title: "New York State Senate",
                  excerpt: "Official website of the New York State Senate.",
                },
              ]}
              onCitationClick={(num) => console.log("Citation clicked:", num)}
              hideCreateExcerpt
            />
          </div>
            </div>
          </div>
      </InsetPanel>
    </div>
  );
};

export default ExcerptView;
