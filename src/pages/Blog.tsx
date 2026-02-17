import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { MobileMenuIcon } from '@/components/MobileMenuButton';
import { useExcerptPersistence } from '@/hooks/useExcerptPersistence';
import { Tables } from '@/integrations/supabase/types';

type Excerpt = Tables<'chat_excerpts'>;

export default function Blog() {
  const navigate = useNavigate();
  const { fetchPublishedPosts } = useExcerptPersistence();
  const [posts, setPosts] = useState<Excerpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchPublishedPosts();
      setPosts(data);
      setLoading(false);
    };
    load();
  }, [fetchPublishedPosts]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

      {/* Main Content Container */}
      <div className="h-full md:p-2 bg-muted/30">
        <div className="h-full flex flex-col relative md:rounded-2xl md:border bg-background overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
            <div className="flex items-center gap-2">
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
            </div>
            <button
              onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
              className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
            >
              NYSgpt
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="absolute top-[57px] bottom-0 left-0 right-0 overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
              {/* Heading */}
              <div className="mb-8">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  Blog
                </h1>
                <p className="text-muted-foreground mt-2">
                  Published chats and walkthroughs.
                </p>
              </div>

              {/* Posts Grid */}
              {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
                      <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                      <div className="h-4 bg-muted rounded w-full mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No blog posts yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => navigate(`/blog/${post.id}`)}
                      className="rounded-lg border bg-card p-6 text-left hover:border-foreground/20 hover:shadow-sm transition-all"
                    >
                      <h3 className="font-semibold text-base line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {post.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatDate(post.created_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
