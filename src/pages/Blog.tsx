import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3Icon, ArrowRightIcon, Newspaper } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { useExcerptPersistence } from '@/hooks/useExcerptPersistence';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Excerpt = Tables<'chat_excerpts'>;

export default function Blog() {
  const navigate = useNavigate();
  const { fetchPublishedPosts } = useExcerptPersistence();
  const [posts, setPosts] = useState<Excerpt[]>([]);
  const [loading, setLoading] = useState(true);

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

  const estimateReadTime = (post: Excerpt): string => {
    const text = post.assistant_message || post.description || '';
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 md:py-24 md:px-6 2xl:max-w-[1400px]">
          <div className="mx-auto max-w-3xl space-y-16">
            {/* Title Section */}
            <div className="space-y-4">
              <h2 className="text-center text-3xl font-bold tracking-tight">
                Journal
              </h2>
              <p className="text-muted-foreground text-center">
                Published chats, walkthroughs, and legislative insights.
              </p>
            </div>

            {/* Posts */}
            {loading ? (
              <div className="space-y-12">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <Separator className="mt-8" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center">
                <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No articles published yet.
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {posts.map((post) => (
                  <article key={post.id} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                          {formatDate(post.created_at)}
                        </span>
                      </div>

                      <h3 className="hover:text-primary text-xl font-semibold tracking-tight transition-colors sm:text-2xl">
                        <button
                          onClick={() => navigate(`/blog/${post.id}`)}
                          className="text-left"
                        >
                          {post.title}
                        </button>
                      </h3>
                    </div>

                    {post.description && (
                      <p className="text-muted-foreground text-sm sm:text-base line-clamp-3">
                        {post.description}
                      </p>
                    )}

                    <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-muted-foreground flex items-center text-sm">
                          <Clock3Icon className="mr-1 h-3 w-3" />
                          <span>{estimateReadTime(post)}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:text-primary self-start hover:bg-transparent sm:self-center"
                        onClick={() => navigate(`/blog/${post.id}`)}
                      >
                        Continue Reading
                        <ArrowRightIcon className="ml-1 h-4 w-4" />
                      </Button>
                    </div>

                    <Separator className="mt-8" />
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
