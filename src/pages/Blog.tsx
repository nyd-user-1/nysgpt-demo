import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3Icon, ArrowRight, Newspaper } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type BlogPost = Tables<'blog_posts'>;

export default function Blog() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('blog_posts')
        .select('id, slug, title, description, content, author_name, author_avatar, published_at, created_at, is_published, updated_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      setPosts(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const estimateReadTime = (post: BlogPost): string => {
    const text = post.content || post.description || '';
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1">
        <section className="container mx-auto px-4 pt-[164px] pb-8 md:px-6 2xl:max-w-[1400px]">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="group bg-muted/30 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  <span className="text-muted-foreground text-sm">
                    {formatDate(post.published_at)}
                  </span>
                  <h3 className="font-semibold text-lg leading-tight tracking-tight sm:text-xl mt-2">
                    {post.title}
                  </h3>

                  {post.description && (
                    <p className="text-muted-foreground text-sm line-clamp-3 mt-3">
                      {post.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4">
                    <div className="text-muted-foreground flex items-center text-sm">
                      <Clock3Icon className="mr-1 h-3 w-3" />
                      <span>{estimateReadTime(post)}</span>
                    </div>

                    <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
