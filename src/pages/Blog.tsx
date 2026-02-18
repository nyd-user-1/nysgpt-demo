import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3Icon, ArrowRightIcon, Newspaper } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { useExcerptPersistence } from '@/hooks/useExcerptPersistence';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Excerpt = Tables<'chat_excerpts'>;

// Placeholder posts for preview — will be filtered out once real posts fill in
const PLACEHOLDER_POSTS: Excerpt[] = [
  {
    id: 'placeholder-1',
    user_id: '',
    parent_session_id: null,
    title: 'Understanding the NYS Budget Process',
    user_message: '',
    assistant_message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    created_at: '2026-02-15T12:00:00Z',
    updated_at: '2026-02-15T12:00:00Z',
  },
  {
    id: 'placeholder-2',
    user_id: '',
    parent_session_id: null,
    title: 'How a Bill Becomes Law in New York',
    user_message: '',
    assistant_message: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem.',
    created_at: '2026-02-14T12:00:00Z',
    updated_at: '2026-02-14T12:00:00Z',
  },
];

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

  // Merge real posts with placeholders
  const allPosts = useMemo(() => [...posts, ...PLACEHOLDER_POSTS], [posts]);

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

  const isPlaceholder = (post: Excerpt) => post.id.startsWith('placeholder-');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-8 md:px-6 2xl:max-w-[1400px]">
          {/* Header — left-aligned like Members page */}
          <div className="mb-8">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Journal
            </h1>
            <p className="text-muted-foreground mt-2">
              Published chats, walkthroughs, and legislative insights.
            </p>
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <Separator className="mt-6" />
                </div>
              ))}
            </div>
          ) : allPosts.length === 0 ? (
            <div className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No articles published yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {allPosts.map((post) => (
                <article key={post.id} className="space-y-3">
                  <span className="text-muted-foreground text-sm">
                    {formatDate(post.created_at)}
                  </span>

                  <h3 className="hover:text-primary text-lg font-semibold tracking-tight transition-colors sm:text-xl">
                    <button
                      onClick={() => !isPlaceholder(post) && navigate(`/blog/${post.id}`)}
                      className={`text-left ${isPlaceholder(post) ? 'cursor-default' : ''}`}
                    >
                      {post.title}
                    </button>
                  </h3>

                  {post.description && (
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {post.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3">
                    <div className="text-muted-foreground flex items-center text-sm">
                      <Clock3Icon className="mr-1 h-3 w-3" />
                      <span>{estimateReadTime(post)}</span>
                    </div>

                    {!isPlaceholder(post) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:text-primary hover:bg-transparent"
                        onClick={() => navigate(`/blog/${post.id}`)}
                      >
                        Continue Reading
                        <ArrowRightIcon className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Separator className="mt-4" />
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
