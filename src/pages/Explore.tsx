import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatHeader } from '@/components/ChatHeader';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type BlogPost = Tables<'blog_posts'>;

const CARD_GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-yellow-400 to-amber-500',
  'from-orange-400 to-red-400',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-sky-500',
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
        .select('id, slug, title, description, content, published_at, is_published')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      setPosts(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const featured = posts.slice(0, 8);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <div className="flex-1 pt-[60px]">
        <div className="px-6 pt-4 pb-16">

          {/* Featured — horizontal scroll portrait cards */}
          <h2 className="text-xl font-bold text-foreground mb-4">Featured</h2>
          <div className="overflow-x-auto -mx-6 scrollbar-hide">
            <div className="flex gap-3 px-6 snap-x snap-mandatory pb-2">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="shrink-0 w-[calc(50vw-22px)] sm:w-[220px] aspect-[3/4] rounded-2xl bg-muted/50 animate-pulse snap-start"
                    />
                  ))
                : featured.map((post, i) => (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/blog/${post.slug}`)}
                      className="group relative shrink-0 w-[calc(50vw-22px)] sm:w-[220px] aspect-[3/4] rounded-2xl snap-start shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} opacity-90 group-hover:opacity-100 transition-opacity`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                        <p className="text-sm font-bold text-white leading-snug line-clamp-3">
                          {post.title}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Discover — 2-column large landscape cards */}
          <h2 className="text-xl font-bold text-foreground mt-8 mb-4">Discover</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full aspect-[16/9] rounded-2xl bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="group relative w-full aspect-[16/9] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[(i + 3) % CARD_GRADIENTS.length]} opacity-85 group-hover:opacity-100 transition-opacity`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                    <p className="text-lg font-bold text-white line-clamp-2">
                      {post.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
