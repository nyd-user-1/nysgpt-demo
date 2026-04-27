import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3Icon, ArrowRight } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type BlogPost = Tables<'blog_posts'>;

const GRADIENTS = [
  'from-blue-500 via-blue-400 to-cyan-400',
  'from-emerald-500 via-emerald-400 to-teal-300',
  'from-purple-500 via-violet-400 to-pink-400',
  'from-amber-500 via-yellow-400 to-orange-300',
  'from-sky-500 via-sky-400 to-cyan-300',
  'from-rose-500 via-pink-400 to-fuchsia-300',
  'from-indigo-500 via-indigo-400 to-blue-300',
  'from-teal-500 via-emerald-400 to-green-300',
];

export default function Explore() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('blog_posts')
        .select('id, slug, title, description, content, author_name, published_at, updated_at, is_published')
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
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl translate-y-1/2" />

        <div className="container mx-auto px-4 md:px-6 2xl:max-w-[1400px] pt-[140px] pb-20 md:pb-28 relative z-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 text-xs font-medium text-white/80 mb-5">
              NYSgpt Insights
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Explore
            </h1>
            <p className="text-lg text-white/70 mt-4 max-w-xl leading-relaxed">
              Walkthroughs, analysis, and insights on New York State legislation, budget, and policy.
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-12 md:py-16 md:px-6 2xl:max-w-[1400px]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border/50">
                  <div className="h-44 bg-muted/50 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-muted/50 rounded animate-pulse w-24" />
                    <div className="h-5 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-muted-foreground">No articles published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => {
                const gradient = GRADIENTS[index % GRADIENTS.length];
                return (
                  <div
                    key={post.id}
                    className="group rounded-2xl overflow-hidden border border-border/50 bg-card cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {/* Gradient image placeholder */}
                    <div className={`h-44 bg-gradient-to-br ${gradient} relative overflow-hidden flex-shrink-0`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-300" />
                      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                      <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/10" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5" />
                    </div>

                    {/* Card content */}
                    <div className="p-5 flex flex-col flex-1">
                      <span className="text-muted-foreground text-xs">
                        {formatDate(post.published_at)}
                      </span>
                      <h3 className="font-semibold text-base leading-snug tracking-tight mt-2 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2 mt-2 flex-1">
                          {post.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Clock3Icon className="h-3 w-3" />
                          <span>{estimateReadTime(post)}</span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-foreground/5 group-hover:bg-foreground flex items-center justify-center transition-all duration-200">
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-background transition-colors duration-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
