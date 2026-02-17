import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExcerptPersistence } from "@/hooks/useExcerptPersistence";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { MobileMenuIcon } from "@/components/MobileMenuButton";
import { ChatMarkdown } from "@/components/shared/ChatMarkdown";

type Excerpt = Tables<"chat_excerpts">;

interface BlogMessage {
  role: string;
  content: string;
}

export default function BlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { fetchPublishedPostById } = useExcerptPersistence();

  const [post, setPost] = useState<Excerpt | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!postId) return;
      setLoading(true);
      const data = await fetchPublishedPostById(postId);
      setPost(data);
      setLoading(false);
    };
    load();
  }, [postId, fetchPublishedPostById]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="outline" onClick={() => navigate("/blog")}>
          Back to Blog
        </Button>
      </div>
    );
  }

  const messages: BlogMessage[] = Array.isArray(post.messages)
    ? (post.messages as BlogMessage[])
    : [];

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-[60]",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {/* Backdrop */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Main Content Container */}
      <div className="h-full md:p-2 bg-muted/30">
        <div className="w-full h-full md:rounded-2xl md:border bg-background overflow-hidden flex flex-col relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
            <div className="flex items-center gap-2">
              <MobileMenuIcon onOpenSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)} />
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className={cn(
                  "hidden md:inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors",
                  leftSidebarOpen && "bg-muted"
                )}
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                  <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                  <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
                </svg>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/blog")}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{post.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {formatDate(post.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/?prompt=What%20is%20NYSgpt%3F")}
              className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
            >
              NYSgpt
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-8 px-4">
            <div className="max-w-[720px] mx-auto space-y-6">
              {messages.map((message, index) => {
                if (message.role === "user") {
                  return (
                    <div key={index} className="flex justify-end">
                      <div className="bg-muted/40 rounded-lg p-4 max-w-[70%]">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  );
                }

                if (message.role === "assistant") {
                  return (
                    <div key={index} className="space-y-3">
                      <div className="prose prose-sm max-w-none">
                        <ChatMarkdown>{message.content}</ChatMarkdown>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages in this post.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
