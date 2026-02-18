import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useExcerptPersistence } from "@/hooks/useExcerptPersistence";
import { Tables } from "@/integrations/supabase/types";
import { ChevronRight, Home } from "lucide-react";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMarkdown } from "@/components/shared/ChatMarkdown";
import { findEditorialPost } from "@/data/editorialPosts";

type Excerpt = Tables<"chat_excerpts">;

interface BlogMessage {
  role: string;
  content: string;
}

// Simple SVG share icons
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function BlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { fetchPublishedPostById } = useExcerptPersistence();

  const [post, setPost] = useState<Excerpt | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!postId) return;
      setLoading(true);

      // Check editorial posts first
      const editorial = findEditorialPost(postId);
      if (editorial) {
        setPost(editorial);
        setLoading(false);
        return;
      }

      // Fall back to Supabase
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

  // Build article body content from messages or description
  const articleContent = useMemo(() => {
    if (!post) return "";
    const messages: BlogMessage[] = Array.isArray(post.messages)
      ? (post.messages as BlogMessage[])
      : [];

    if (messages.length > 0) {
      // Concatenate assistant messages as article body
      return messages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content)
        .join("\n\n");
    }

    return post.assistant_message || post.description || "";
  }, [post]);

  // Extract h2 headings from content for table of contents
  const headings = useMemo(() => {
    const matches = articleContent.matchAll(/^##\s+(.+)$/gm);
    return Array.from(matches, (m) => ({
      text: m[1].replace(/[*_`]/g, ""),
      id: m[1]
        .replace(/[*_`]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-"),
    }));
  }, [articleContent]);

  // Intersection observer for active heading tracking
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    // Small delay to let markdown render
    const timer = setTimeout(() => {
      headings.forEach((h) => {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [headings]);

  // Build share URLs
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = post?.title || "";

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ChatHeader />
        <main className="flex-1 pt-[120px]">
          <div className="container mx-auto max-w-[1200px] px-4 md:px-6">
            <div className="animate-pulse space-y-6">
              <div className="h-4 bg-muted rounded w-48" />
              <div className="h-12 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-64" />
              <div className="h-64 bg-muted rounded w-full max-w-[720px]" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ChatHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Post not found</p>
          <button
            onClick={() => navigate("/blog")}
            className="text-sm text-primary hover:underline"
          >
            Back to Journal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1 pt-[120px]">
        <div className="container mx-auto max-w-[1200px] px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
            <Link
              to="/"
              className="hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              to="/blog"
              className="hover:text-foreground transition-colors"
            >
              Journal
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate max-w-[300px]">
              {post.title}
            </span>
          </nav>

          {/* Title */}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl max-w-[820px] mb-6">
            {post.title}
          </h1>

          {/* Author + Date */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center text-background font-bold text-sm shrink-0">
              NY
            </div>
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">
                NYSgpt Editorial
              </span>{" "}
              on {formatDate(post.created_at)}
            </p>
          </div>

          {/* Content + Sidebar layout */}
          <div className="flex gap-16">
            {/* Article body */}
            <article className="min-w-0 flex-1 max-w-[720px] pb-16">
              <div className="prose prose-neutral max-w-none prose-headings:scroll-mt-24 prose-h2:text-2xl prose-h2:font-bold prose-h2:tracking-tight prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-semibold prose-p:text-base prose-p:leading-relaxed prose-p:text-foreground prose-blockquote:border-l-2 prose-blockquote:border-foreground prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:font-medium prose-a:text-primary prose-a:underline prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-td:py-2 prose-li:text-foreground">
                <ChatMarkdown>{articleContent}</ChatMarkdown>
              </div>
            </article>

            {/* Sticky sidebar — desktop only */}
            {(headings.length > 0 || true) && (
              <aside className="hidden lg:block w-[220px] shrink-0">
                <div className="sticky top-[120px] space-y-6">
                  {headings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                        On this page
                      </p>
                      <ul className="space-y-2">
                        {headings.map((h) => (
                          <li key={h.id}>
                            <a
                              href={`#${h.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document
                                  .getElementById(h.id)
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className={`text-sm leading-snug transition-colors block ${
                                activeSection === h.id
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {h.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Share buttons */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Share this article:
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={shareLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      >
                        <FacebookIcon className="h-4 w-4" />
                      </a>
                      <a
                        href={shareLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      >
                        <LinkedInIcon className="h-4 w-4" />
                      </a>
                      <a
                        href={shareLinks.x}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
