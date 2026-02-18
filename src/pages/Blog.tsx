import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3Icon, ArrowRightIcon, Newspaper } from 'lucide-react';
import { ChatHeader } from '@/components/ChatHeader';
import { useExcerptPersistence } from '@/hooks/useExcerptPersistence';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Excerpt = Tables<'chat_excerpts'>;

// Editorial posts based on FY 2027 Executive Budget and Senate Blue Book analysis
const EDITORIAL_POSTS: Excerpt[] = [
  {
    id: 'editorial-1',
    user_id: '',
    parent_session_id: null,
    title: 'FY 2027 Financial Plan: A $318.8 Billion Investment in New York\'s Future',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'Governor Hochul\'s FY 2027 Executive Budget proposes $318.8 billion in total appropriations, with General Fund spending growing 6.1% to $132.5 billion. Education leads with a $1.53 billion increase to $49.7 billion, while Children and Family Services sees a 16.7% boost. The budget preserves $14.6 billion in principal reserves and adds 441 new FTEs statewide \u2014 a disciplined approach to growth that prioritizes classrooms, child welfare, and fiscal stability.',
    created_at: '2026-02-16T10:00:00Z',
    updated_at: '2026-02-16T10:00:00Z',
  },
  {
    id: 'editorial-2',
    user_id: '',
    parent_session_id: null,
    title: 'The Hidden Risks in the FY 2027 Financial Plan',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'Behind the topline numbers of the $318.8 billion FY 2027 budget lie structural concerns. The 0.9% overall decline masks a $8.3 billion drop at the Department of Labor as pandemic-era federal funds expire \u2014 a cliff that could strain unemployment services. Aid to Localities, which makes up 75% of spending, actually decreases 1.7%. And with $312.9 billion in reappropriations carried forward (nearly matching the entire budget), the state is deferring an enormous backlog of unfunded commitments.',
    created_at: '2026-02-16T08:00:00Z',
    updated_at: '2026-02-16T08:00:00Z',
  },
  {
    id: 'editorial-3',
    user_id: '',
    parent_session_id: null,
    title: 'Blue Book Analysis: Senate Majority Highlights Smart Investments in Education and Health',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The Senate Majority\'s Blue Book staff analysis underscores the FY 2027 budget\'s commitment to core services. Education receives the single largest dollar increase at $1.53 billion, bringing the State Education Department to $49.7 billion. The Department of Health, at $135.1 billion, accounts for 42% of all state spending. General State Charges grow $915 million to cover pension and employee benefit obligations \u2014 keeping the state\'s promises to its workforce while investing in the services New Yorkers depend on.',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'editorial-4',
    user_id: '',
    parent_session_id: null,
    title: 'Blue Book Analysis: What the Senate Majority Staff Flagged as Concerns',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The Senate Majority\'s Blue Book raises pointed questions about the Executive Budget\'s long-term sustainability. The Department of Labor\'s 54% funding drop ($8.3 billion) signals a post-pandemic fiscal cliff. Enterprise fund spending plunges 46.3%. Meanwhile, agencies like the Council on Developmental Disabilities (+55.9%) and Deferred Compensation Board (+39.0%) see outsized percentage growth with limited public explanation. The Blue Book analysis also notes that $201 billion in Health Department reappropriations represent an unprecedented level of deferred spending authority that warrants closer legislative scrutiny.',
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-02-15T08:00:00Z',
  },
  {
    id: 'editorial-5',
    user_id: '',
    parent_session_id: null,
    title: 'Where the Money Goes: Breaking Down $318.8 Billion Across 101 Agencies',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'New York\'s FY 2027 budget spans 101 agencies, but spending is remarkably concentrated. The Department of Health ($135.1B), Education ($49.7B), and SUNY ($13.4B) together account for over 62% of all appropriations. Aid to Localities at $239 billion dwarfs State Operations at $69.1 billion and Debt Service at $10.6 billion. A deeper look at the appropriations data reveals how Albany allocates resources \u2014 and where smaller agencies like Agriculture (+$22M, +11.2%) and Mental Health (+$344M, +5.7%) are getting meaningful new investment.',
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-14T10:00:00Z',
  },
  {
    id: 'editorial-6',
    user_id: '',
    parent_session_id: null,
    title: 'The Post-Pandemic Fiscal Cliff: What the Labor Department\'s $8.3 Billion Cut Means',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The single largest line-item change in the FY 2027 budget is the Department of Labor\'s $8.3 billion reduction \u2014 a 54% cut that accounts for nearly all of the budget\'s overall decline. This drop reflects the expiration of federal pandemic-era unemployment insurance funds, not a policy decision to slash services. But the impact is real: as enhanced federal support disappears, New York must absorb workforce development costs with state dollars or accept diminished capacity. The question for legislators is whether the Executive Budget adequately bridges this gap or simply lets it widen.',
    created_at: '2026-02-14T08:00:00Z',
    updated_at: '2026-02-14T08:00:00Z',
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
  const allPosts = useMemo(() => [...posts, ...EDITORIAL_POSTS], [posts]);

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

  const isEditorial = (post: Excerpt) => post.id.startsWith('editorial-');

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
                      onClick={() => !isEditorial(post) && navigate(`/blog/${post.id}`)}
                      className={`text-left ${isEditorial(post) ? 'cursor-default' : ''}`}
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

                    {!isEditorial(post) && (
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
