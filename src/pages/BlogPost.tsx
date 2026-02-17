import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExcerptPersistence } from "@/hooks/useExcerptPersistence";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHeader } from "@/components/ChatHeader";
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
      <div className="min-h-screen bg-background flex flex-col">
        <ChatHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ChatHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Post not found</p>
          <Button variant="outline" onClick={() => navigate("/blog")}>
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  const messages: BlogMessage[] = Array.isArray(post.messages)
    ? (post.messages as BlogMessage[])
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1">
        <div className="max-w-[720px] mx-auto px-4 py-8 md:py-16">
          {/* Back link + title */}
          <div className="mb-8 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/blog")}
              className="hover:bg-transparent hover:text-primary -ml-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Journal
            </Button>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {post.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(post.created_at)}
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-6">
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
      </main>
    </div>
  );
}
