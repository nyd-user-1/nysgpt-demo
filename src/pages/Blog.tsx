import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3Icon, ArrowRight, Newspaper } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-6 bg-muted rounded w-3/4 mt-2" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                  </CardContent>
                </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  <CardHeader className="pb-3">
                    <span className="text-muted-foreground text-sm">
                      {formatDate(post.published_at)}
                    </span>
                    <h3 className="font-semibold text-lg leading-tight tracking-tight sm:text-xl pt-1">
                      {post.title}
                    </h3>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {post.description && (
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {post.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-muted-foreground flex items-center text-sm">
                          <Clock3Icon className="mr-1 h-3 w-3" />
                          <span>{estimateReadTime(post)}</span>
                        </div>

                        <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-background" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
