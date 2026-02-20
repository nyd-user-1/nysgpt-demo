import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChatHeader } from '@/components/ChatHeader';
import FooterSimple from '@/components/marketing/FooterSimple';
import { cn } from '@/lib/utils';
import {
  ArrowUp, PenLine, Megaphone,
  ExternalLink, FileText,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Curated prompts from across the platform, categorized for the hub
// ---------------------------------------------------------------------------

interface HubPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  upvotes: number;
  context?: string;
  image?: string;
  link?: string;
}

const hubPrompts: HubPrompt[] = [
  // Featured (ordered for Trending sidebar – descending chat counts)
  {
    id: 'featured-brooklyn-dems',
    title: 'Brooklyn Dems pull Hochul endorsement after LG pick',
    prompt: "Summarize 'Brooklyn Dems pull Hochul endorsement after LG pick' by City & State NY",
    context: 'fetchUrl:https://www.cityandstateny.com/politics/2026/02/brooklyn-dems-pull-hochul-endorsement-after-lg-pick/411204/',
    category: 'Featured',
    upvotes: 101,
    image: '/cns-logo.avif',
  },
  {
    id: 'featured-4',
    title: 'Hochul – With Her Best Ever Favorability Rating, 49-40% – Continues to Hold Commanding Leads Over Blakeman (54-28%) & Among Dems, Delgado (64-11%)',
    prompt: "Summarize 'Hochul continues to hold commanding leads over Blakeman and Delgado' by Siena Research Institute",
    context: 'fetchUrl:https://sri.siena.edu/2026/02/03/hochul-with-her-best-ever-favorability-rating-49-40-continues-to-hold-commanding-leads-over-blakeman-54-28-among-dems-delgado-64-11/',
    category: 'Featured',
    upvotes: 98,
    image: '/sri-logo-2.avif',
  },
  {
    id: 'featured-1',
    title: 'Special NYC elections 2026',
    prompt: "Summarize 'Special NYC elections 2026' by Spectrum News NY1",
    context: 'fetchUrl:https://ny1.com/nyc/queens/politics/2026/02/04/special-nyc-elections-2026--manhattan--queens-districts',
    category: 'Featured',
    upvotes: 95,
    image: '/spectrum-1-news-rectangle.avif',
  },
  {
    id: 'featured-cnbc',
    title: 'U.S. court again rules an offshore wind project can resume construction',
    prompt: "Summarize 'U.S. court again rules an offshore wind project can resume construction' by CNBC",
    context: 'fetchUrl:https://www.cnbc.com/2026/02/02/us-court-again-rules-an-offshore-wind-project-can-resume-construction.html',
    category: 'Featured',
    upvotes: 92,
    image: '/cnbc-logo.avif',
  },
  {
    id: 'featured-cns',
    title: 'New York lawmakers want to keep AI out of news',
    prompt: "Summarize 'New York lawmakers want to keep AI out of news' by City & State NY",
    context: 'fetchUrl:https://www.cityandstateny.com/policy/2026/02/new-york-lawmakers-want-keep-ai-out-news/411111/?oref=csny-homepage-river',
    category: 'Featured',
    upvotes: 88,
    image: '/cns-logo.avif',
  },
  {
    id: 'featured-politico',
    title: 'The NYC Council says a detained employee was law abiding. The Department of Homeland Security argues otherwise',
    prompt: "Summarize 'The NYC Council says a detained employee was law abiding. DHS argues otherwise' by Politico",
    context: 'fetchUrl:https://www.politico.com/news/2026/01/13/new-york-city-council-detained-employee-dhs-00725904',
    category: 'Featured',
    upvotes: 85,
    image: '/politico-logo.avif',
  },
  {
    id: 'featured-3',
    title: "Kathy Hochul's Chances of Being Defeated by Trump Ally Bruce Blakeman",
    prompt: "Summarize 'Kathy Hochul's Chances of Being Defeated by Trump Ally Bruce Blakeman' by Newsweek",
    context: 'fetchUrl:https://www.newsweek.com/kathy-hochul-chances-defeated-bruce-blakeman-poll-11459862',
    category: 'Featured',
    upvotes: 82,
    image: '/newsweek-rectangle.avif',
  },
  {
    id: 'featured-nyfocus',
    title: "'What Stood Out Was What Wasn't Said': Antonio Delgado on Hochul's Speech",
    prompt: "Summarize 'What Stood Out Was What Wasn't Said: Antonio Delgado on Hochul's Speech' by New York Focus",
    context: 'fetchUrl:https://nysfocus.com/2026/01/16/antonio-delgado-kathy-hochul',
    category: 'Featured',
    upvotes: 78,
    image: '/newyork-focus-rectangle.avif',
  },
  {
    id: 'featured-2',
    title: "Queens voters head to the polls for Assembly District 36 special election to fill Mamdani's old seat",
    prompt: "Summarize 'Queens voters head to the polls for Assembly District 36 special election' by QNS",
    context: 'fetchUrl:https://qns.com/2026/02/voters-polls-district-36-special-election/',
    category: 'Featured',
    upvotes: 74,
    image: '/qns-rectangle.avif',
  },
  {
    id: 'featured-7',
    title: 'Nassau County Executive Blakeman defies state plan to end ICE cooperation',
    prompt: "Summarize 'Nassau County Executive Blakeman defies state plan to end ICE cooperation' by News10",
    context: 'fetchUrl:https://www.news10.com/news/nassau-executive-fights-state-plan-to-end-ice-cooperation/',
    category: 'Featured',
    upvotes: 68,
    image: '/abc-10-rectangle.avif',
  },
  {
    id: 'featured-8',
    title: 'Snow Much to Scoop',
    prompt: "Summarize 'Snow Much to Scoop: Powder and Politics' by In The Room Media",
    context: 'fetchUrl:https://intheroommedia.com/2026/01/26/snow-much-to-scoop-powder-and-politics/',
    category: 'Featured',
    upvotes: 65,
    image: '/itr-rectangle.avif',
  },
  // Bills
  { id: 'b1', title: 'AI Consumer Protection', prompt: 'What can you tell me about efforts to protect consumers from algorithmic discrimination in New York?', category: 'Bills', upvotes: 47 },
  { id: 'b2', title: 'Childcare Affordability', prompt: 'What legislative approaches have been proposed to make childcare more affordable for working families in New York?', category: 'Bills', upvotes: 38 },
  { id: 'b3', title: 'Paid Family Leave', prompt: 'What can you tell me about efforts to expand paid family leave in New York?', category: 'Bills', upvotes: 35 },
  { id: 'b4', title: 'Affordable Housing', prompt: 'What are legislators doing to address the affordable housing crisis in New York?', category: 'Bills', upvotes: 52 },
  { id: 'b5', title: 'Minimum Wage', prompt: "What's the current state of minimum wage legislation in New York and what changes are being proposed?", category: 'Bills', upvotes: 44 },
  { id: 'b6', title: 'Clean Energy Incentives', prompt: 'What tax incentives or programs are being proposed to accelerate clean energy adoption in New York?', category: 'Bills', upvotes: 31 },
  { id: 'b7', title: 'School Safety', prompt: 'What measures are being proposed to improve safety around school zones in New York?', category: 'Bills', upvotes: 29 },
  { id: 'b8', title: 'Veteran Services', prompt: 'What initiatives are being considered to improve services and support for veterans in New York?', category: 'Bills', upvotes: 26 },
  // Policy
  { id: 'p1', title: 'Policy Analysis Framework', prompt: 'What framework should I use to analyze the potential impact of a proposed policy change?', category: 'Policy', upvotes: 63 },
  { id: 'p2', title: 'Stakeholder Mapping', prompt: 'How do I identify and map stakeholders who would be affected by a new housing policy?', category: 'Policy', upvotes: 41 },
  { id: 'p3', title: 'Evidence-Based Policy', prompt: 'What does evidence-based policymaking look like and how can I apply it to education reform?', category: 'Policy', upvotes: 55 },
  { id: 'p4', title: 'Cost-Benefit Analysis', prompt: 'How do I perform a cost-benefit analysis for a proposed public health initiative?', category: 'Policy', upvotes: 37 },
  { id: 'p5', title: 'Building Coalition Support', prompt: 'How do I build a coalition of support for a policy initiative across different interest groups?', category: 'Policy', upvotes: 33 },
  { id: 'p6', title: 'Legislative Strategy', prompt: 'What strategies work best for moving a policy idea from concept to introduced legislation?', category: 'Policy', upvotes: 48 },
  // Advocacy
  { id: 'a1', title: 'Climate Leadership Act', prompt: "What are the key provisions of New York's Climate Leadership and Community Protection Act, and how is implementation progressing?", category: 'Advocacy', upvotes: 58, link: '/nonprofits/environmental-advocacy' },
  { id: 'a2', title: 'Environmental Justice', prompt: 'What environmental justice legislation is being considered in New York to protect overburdened communities?', category: 'Advocacy', upvotes: 42, link: '/nonprofits/environmental-advocacy' },
  { id: 'a3', title: 'Workforce Development', prompt: 'What funding opportunities and legislation exist to support workforce development and job training programs in New York?', category: 'Advocacy', upvotes: 36, link: '/nonprofits/economic-advocacy' },
  { id: 'a4', title: 'Gig Worker Protections', prompt: 'What legislation is being considered to provide protections and benefits for gig economy workers in New York?', category: 'Advocacy', upvotes: 39, link: '/nonprofits/social-advocacy' },
  { id: 'a5', title: 'Renewable Energy Mandates', prompt: 'What renewable energy mandates exist in New York, and what legislation could accelerate the transition to clean energy?', category: 'Advocacy', upvotes: 45, link: '/nonprofits/environmental-advocacy' },
  { id: 'a6', title: 'Anti-Poverty Programs', prompt: 'What state-level anti-poverty programs exist in New York, and what legislation could strengthen them?', category: 'Advocacy', upvotes: 30, link: '/nonprofits/economic-advocacy' },
  // Policy (Use Cases)
  { id: 'u1', title: 'Policy Memo Writing', prompt: "What's the best structure for writing a policy memo that will be read by busy decision-makers?", category: 'Policy', upvotes: 71, link: '/use-cases/policy' },
  { id: 'u2', title: 'Data-Driven Advocacy', prompt: 'How can I use data effectively to support my policy arguments and recommendations?', category: 'Policy', upvotes: 54, link: '/use-cases/policy' },
  { id: 'u3', title: 'Equity Impact Assessment', prompt: 'How do I assess whether a policy will have equitable outcomes across different communities?', category: 'Policy', upvotes: 46, link: '/use-cases/policy' },
  { id: 'u4', title: 'Public Comment Strategy', prompt: "What's the most effective way to participate in a public comment period for proposed regulations?", category: 'Policy', upvotes: 32, link: '/use-cases/policy' },
  // Departments
  { id: 'd1', title: 'DOH Public Health', prompt: 'What public health initiatives is the NYS Department of Health currently prioritizing, and what legislation supports them?', category: 'Departments', upvotes: 45, link: '/departments/department-of-health' },
  { id: 'd2', title: 'NYSERDA Clean Energy', prompt: 'What clean energy programs is NYSERDA currently funding, and what are the latest results?', category: 'Departments', upvotes: 43, link: '/departments/nyserda' },
  { id: 'd3', title: 'DOT Infrastructure', prompt: 'What infrastructure projects is the NYS Department of Transportation currently managing, and what is the funding status?', category: 'Departments', upvotes: 40, link: '/departments/department-of-transportation' },
  { id: 'd4', title: 'DEC Environmental Oversight', prompt: 'What environmental enforcement actions has the NYS Department of Environmental Conservation taken recently?', category: 'Departments', upvotes: 38, link: '/departments/department-of-environmental-conservation' },
  { id: 'd5', title: 'SED Education Standards', prompt: 'What changes is the NYS State Education Department making to curriculum standards and teacher certification?', category: 'Departments', upvotes: 36, link: '/departments/education-department' },
  { id: 'd6', title: 'DMV Services Modernization', prompt: 'What services does the NYS Department of Motor Vehicles provide, and what modernization efforts are underway?', category: 'Departments', upvotes: 34, link: '/departments/department-of-motor-vehicles' },
  { id: 'd7', title: 'DOL Workforce Programs', prompt: 'What workforce development programs does the NYS Department of Labor offer, and how effective have they been?', category: 'Departments', upvotes: 31, link: '/departments/department-of-labor' },
  { id: 'd8', title: 'DOCCS Reform Efforts', prompt: 'What reforms are being proposed for the NYS Department of Corrections and Community Supervision?', category: 'Departments', upvotes: 28, link: '/departments/department-of-corrections-and-community-supervision' },
];

// Category tag colors
const categoryColors: Record<string, string> = {
  Featured: 'bg-rose-100 text-rose-700',
  Bills: 'bg-blue-100 text-blue-700',
  Policy: 'bg-emerald-100 text-emerald-700',
  Advocacy: 'bg-purple-100 text-purple-700',
  Departments: 'bg-yellow-100 text-yellow-700',
};

function decodeEntities(str: string): string {
  if (typeof document === 'undefined') return str;
  const textarea = document.createElement('textarea');
  let decoded = str;
  let prev = '';
  while (decoded !== prev) {
    prev = decoded;
    textarea.innerHTML = decoded;
    decoded = textarea.value;
  }
  return decoded;
}

function getDomainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Featured category cards (gradient image placeholders)
const featuredCards = [
  { title: 'Bill Research', subtitle: 'Explore legislation', gradient: 'from-blue-400 to-cyan-300', category: 'Bills' },
  { title: 'Policy', subtitle: 'Frameworks & analysis', gradient: 'from-emerald-400 to-teal-300', category: 'Policy' },
  { title: 'Advocacy', subtitle: 'Nonprofit', gradient: 'from-purple-400 to-pink-300', category: 'Advocacy' },
  { title: 'Departments', subtitle: '100+ state entities', gradient: 'from-yellow-300 via-amber-400 to-amber-600', category: 'Departments' },
];

// Press releases for the right sidebar
const pressReleaseItems = [
  {
    id: 'pr-6',
    title: 'Money in Your Pockets: Governor Hochul Highlights Proposals to Bring Down Costs of Vehicle Insurance',
    prompt: "Summarize 'Governor Hochul Highlights Proposals to Bring Down Costs of Vehicle Insurance' by NYS Governor",
    context: 'fetchUrl:https://www.governor.ny.gov/news/money-your-pockets-governor-hochul-highlights-proposals-bring-down-costs-vehicle-insurance-0',
    image: '/nys-seal.avif',
    chats: 31,
  },
  {
    id: 'pr-7',
    title: 'New York, New Jersey Sue Trump Administration for Illegally Withholding Gateway Tunnel Funding',
    prompt: "Summarize 'New York, New Jersey Sue Trump Administration for Illegally Withholding Gateway Tunnel Funding' by NYS Governor",
    context: 'fetchUrl:https://www.governor.ny.gov/news/new-york-new-jersey-sue-trump-administration-illegally-withholding-gateway-tunnel-funding',
    image: '/nys-seal.avif',
    chats: 29,
  },
  {
    id: 'pr-1',
    title: 'Senate Acts to Protect Access to Reproductive Healthcare, Strengthen Privacy and IVF Coverage',
    prompt: "Summarize 'Senate Acts to Protect Access to Reproductive Healthcare, Strengthen Privacy and IVF Coverage' by NYS Senate",
    context: 'fetchUrl:https://www.nysenate.gov/newsroom/press-releases/2026/senate-acts-protect-access-reproductive-healthcare-strengthen-privacy',
    image: '/nys-senate-seal.avif',
    chats: 27,
  },
  {
    id: 'pr-2',
    title: 'Legislature Announces 2026 Joint Legislative Budget Hearing Schedule',
    prompt: "Summarize 'Legislature Announces 2026 Joint Legislative Budget Hearing Schedule' by NYS Senate",
    context: 'fetchUrl:https://www.nysenate.gov/newsroom/press-releases/2026/liz-krueger/legislature-announces-2026-joint-legislative-budget',
    image: '/nys-senate-seal.avif',
    chats: 25,
  },
  {
    id: 'pr-3',
    title: 'Senate Advances Reforms to Protect Election Integrity and Support Election Workers',
    prompt: "Summarize 'Senate Advances Reforms to Protect Election Integrity and Support Election Workers' by NYS Senate",
    context: 'fetchUrl:https://www.nysenate.gov/newsroom/press-releases/2026/senate-advances-reforms-protect-election-integrity-and-support',
    image: '/nys-senate-seal.avif',
    chats: 23,
  },
  {
    id: 'pr-4',
    title: 'The Blue Book: Senate Majority Staff Analysis of the 2026-2027 Executive Budget Proposal',
    prompt: "Summarize 'The Blue Book: Senate Majority Staff Analysis of the 2026-2027 Executive Budget Proposal' by NYS Senate",
    context: 'fetchUrl:https://www.nysenate.gov/newsroom/articles/2026/blue-book-senate-majority-staff-analysis-2026-2027-executive-budget-proposal',
    image: '/nys-senate-seal.avif',
    chats: 21,
  },
  {
    id: 'pr-5',
    title: 'Assembly Passes Bill to Protect Health Care Providers that Prescribe and Dispense Abortion Medication',
    prompt: "Summarize 'Assembly Passes Bill to Protect Health Care Providers that Prescribe and Dispense Abortion Medication' by NYS Assembly",
    context: 'fetchUrl:https://nyassembly.gov/Press/?sec=story&story=116637',
    image: '/nys-assembly-seal.avif',
    chats: 19,
  },
  {
    id: 'pr-8',
    title: 'Governor Hochul Announces $4 Million for Clean Energy Workforce Development Programs',
    prompt: "Summarize 'Governor Hochul Announces $4 Million for Clean Energy Workforce Development Programs' by NYS Governor",
    context: 'fetchUrl:https://www.governor.ny.gov/news/governor-hochul-announces-4-million-clean-energy-workforce-development-programs',
    image: '/nys-seal.avif',
    chats: 17,
  },
  {
    id: 'pr-9',
    title: 'Governor Hochul Announces $9 Million Awarded Through the State and Local Cybersecurity Grant Program',
    prompt: "Summarize 'Governor Hochul Announces $9 Million Awarded Through the State and Local Cybersecurity Grant Program' by NYS Governor",
    context: 'fetchUrl:https://www.governor.ny.gov/news/governor-hochul-announces-9-million-awarded-through-state-and-local-cybersecurity-grant',
    image: '/nys-seal.avif',
    chats: 15,
  },
];

const CATEGORIES = ['All', 'Bills', 'Policy', 'Advocacy', 'Departments'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PromptHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [pageTab, setPageTab] = useState<'prompts' | 'lists'>('prompts');
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(10);
  const [userGenVisibleCount, setUserGenVisibleCount] = useState(10);

  useEffect(() => {
    if (location.hash === '#lists') {
      setPageTab('lists');
    } else if (location.hash === '#community') {
      setPageTab('prompts');
      setTimeout(() => {
        document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setPageTab('prompts');
    }
  }, [location.hash]);

  // Derived prompt lists
  const allFilteredPrompts = useMemo(() => {
    const items =
      activeCategory === 'All'
        ? hubPrompts.filter((p) => p.category !== 'Featured')
        : hubPrompts.filter((p) => p.category === activeCategory);
    return [...items].sort((a, b) => b.upvotes - a.upvotes);
  }, [activeCategory]);

  const filteredPrompts = allFilteredPrompts.slice(0, visibleCount);
  const hasMore = visibleCount < allFilteredPrompts.length;

  // Reset visible count when category changes
  useEffect(() => {
    setVisibleCount(10);
  }, [activeCategory]);


  const trendingPrompts = useMemo(
    () => hubPrompts.filter((p) => p.category === 'Featured'),
    [],
  );


  // -----------------------------------------------------------------------
  // Supabase: prompt chat counts
  // -----------------------------------------------------------------------
  const { data: chatCounts } = useQuery({
    queryKey: ['prompt-chat-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prompt_chat_counts')
        .select('prompt_id, chat_count');
      if (!data) return {};
      const map: Record<string, number> = {};
      data.forEach((row: any) => {
        map[row.prompt_id] = row.chat_count;
      });
      return map;
    },
    staleTime: 30 * 1000,
  });

  // -----------------------------------------------------------------------
  // Supabase: submitted community prompts
  // -----------------------------------------------------------------------
  const { data: submittedPrompts } = useQuery({
    queryKey: ['submitted-prompts-hub'],
    queryFn: async () => {
      const { data } = await (supabase.from as any)('submitted_prompts')
        .select('id, title, prompt, url, category, featured, created_at, avatar_url, user_generated, show_in_news, show_in_trending, display_name')
        .order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const getChatCount = (id: string, fallback: number) =>
    chatCounts?.[id] ?? fallback;

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const handlePromptClick = (promptId: string, seedCount: number, prompt: string, context?: string) => {
    // Fire-and-forget increment
    supabase.rpc('increment_prompt_chat_count', {
      p_prompt_id: promptId,
      p_seed_count: seedCount,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['prompt-chat-counts'] });
    });

    const url = context
      ? `/?prompt=${encodeURIComponent(prompt)}&context=${encodeURIComponent(context)}`
      : `/?prompt=${encodeURIComponent(prompt)}`;
    navigate(url);
  };

  // -----------------------------------------------------------------------
  // Favicon logic: Try Supabase bucket first, fall back to Google
  // -----------------------------------------------------------------------
  const SUPABASE_FAVICON_BASE = 'https://kwyjohornlgujoqypyvu.supabase.co/storage/v1/object/public/Favicons';

  // Explicit domain-to-favicon mappings (for non-standard naming)
  const LOCAL_FAVICONS: Record<string, string> = {
    'www.islandharvest.org': `${SUPABASE_FAVICON_BASE}/island-harvest.avif`,
    'islandharvest.org': `${SUPABASE_FAVICON_BASE}/island-harvest.avif`,
    'www.votemamafoundation.org': `${SUPABASE_FAVICON_BASE}/votemamafoundation.avif`,
    'votemamafoundation.org': `${SUPABASE_FAVICON_BASE}/votemamafoundation.avif`,
    'www.ncsl.org': `${SUPABASE_FAVICON_BASE}/ncsl.avif`,
    'ncsl.org': `${SUPABASE_FAVICON_BASE}/ncsl.avif`,
  };

  // Normalize domain to a likely bucket filename (e.g., "www.ncsl.org" -> "ncsl")
  const getDomainFaviconUrl = (domain: string): string => {
    // Check explicit overrides first
    if (LOCAL_FAVICONS[domain]) {
      return LOCAL_FAVICONS[domain];
    }
    // Normalize: remove www., take first part before .org/.com/etc
    const normalized = domain.replace(/^www\./, '').split('.')[0];
    return `${SUPABASE_FAVICON_BASE}/${normalized}.avif`;
  };

  // Fallback to Google favicon
  const getGoogleFavicon = (domain: string): string => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  };

  // -----------------------------------------------------------------------
  // Community prompt row renderer
  // -----------------------------------------------------------------------
  const renderSubmittedRow = (p: any, baseChatCount = 0) => {
    const domain = getDomainFromUrl(p.url || '');
    const promptText = p.prompt || `Summarize '${p.title}'`;
    const context = p.url ? `fetchUrl:${p.url}` : undefined;
    const chats = getChatCount(p.id, 0) + baseChatCount;
    return (
      <div key={p.id} className="py-3 first:pt-0">
        <div
          onClick={() => handlePromptClick(p.id, 0, promptText, context)}
          className="group flex items-center gap-3 py-2 hover:bg-muted/30 hover:shadow-md px-4 rounded-lg transition-all duration-200 cursor-pointer"
        >
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-muted shrink-0"
            />
          ) : domain ? (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <img
                src={getDomainFaviconUrl(domain)}
                onError={(e) => {
                  const target = e.currentTarget;
                  const googleUrl = getGoogleFavicon(domain);
                  if (target.src !== googleUrl) {
                    target.src = googleUrl;
                  }
                }}
                alt=""
                className="w-10 h-10 rounded-full object-cover bg-muted p-1"
              />
            </a>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{decodeEntities(p.title)}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-blue-500">{chats} chats</span>
              {p.display_name && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <p className="text-xs font-medium text-muted-foreground">{p.display_name}</p>
                </>
              )}
            </div>
          </div>
          <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUp className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Pill tab toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-muted/50 rounded-full p-1">
              {(['prompts', 'lists'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPageTab(tab)}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    pageTab === tab
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'prompts' ? 'User' : 'Admin'}
                </button>
              ))}
            </div>
          </div>

          {pageTab === 'prompts' && (
          <>
          {/* ============================================================= */}
          {/* SECTION: User Prompts                                          */}
          {/* ============================================================= */}
          {(submittedPrompts || []).length > 0 && (
          <div id="community">
            {/* Heading Block */}
            <div className="mb-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    User Prompts
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    User generated prompts and submissions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/advertise"
                    className="flex items-center gap-3 py-3 bg-muted/50 hover:bg-muted/70 hover:shadow-lg hover:border-border rounded-lg px-4 border border-transparent transition-all"
                  >
                    <Megaphone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Partner</span>
                  </Link>
                  <Link
                    to="/submit-prompt"
                    className="flex items-center gap-3 py-3 bg-muted/50 hover:bg-muted/70 hover:shadow-lg hover:border-border rounded-lg px-4 border border-transparent transition-all"
                  >
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Submit a Prompt</span>
                  </Link>
                </div>
              </div>
            </div>

            {(() => {
              // Combine all prompts and sort by chats descending
              const seed = [78, 74, 69, 68, 65, 61, 59, 58, 52, 51, 49, 44, 43, 42, 38, 37, 34, 31, 29, 27, 24, 22, 21, 18, 16, 14, 12, 11, 8, 6];
              const allSortedPrompts = [...(submittedPrompts || [])]
                .map((p: any, idx: number) => ({ ...p, seedCount: seed[idx % seed.length] || 5 }))
                .sort((a: any, b: any) => {
                  const aChats = getChatCount(a.id, 0) + a.seedCount;
                  const bChats = getChatCount(b.id, 0) + b.seedCount;
                  return bChats - aChats;
                });

              // Each column gets userGenVisibleCount items
              const totalToShow = userGenVisibleCount * 3;
              const visiblePrompts = allSortedPrompts.slice(0, totalToShow);
              const hasMore = allSortedPrompts.length > totalToShow;

              // Split evenly into 3 columns (each column gets userGenVisibleCount items)
              const col1 = visiblePrompts.slice(0, userGenVisibleCount);
              const col2 = visiblePrompts.slice(userGenVisibleCount, userGenVisibleCount * 2);
              const col3 = visiblePrompts.slice(userGenVisibleCount * 2, userGenVisibleCount * 3);

              return (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                    <div className="lg:border-r-2 lg:border-dotted lg:border-border/80 lg:pr-6 pb-8 lg:pb-0">
                      <div className="divide-y-2 divide-dotted divide-border/80">
                        {col1.map((p: any) => renderSubmittedRow(p, p.seedCount))}
                      </div>
                    </div>

                    <div className="lg:border-r-2 lg:border-dotted lg:border-border/80 lg:px-6 border-t-2 border-dotted border-border/80 lg:border-t-0 pt-8 lg:pt-0 pb-8 lg:pb-0">
                      <div className="divide-y-2 divide-dotted divide-border/80">
                        {col2.map((p: any) => renderSubmittedRow(p, p.seedCount))}
                      </div>
                    </div>

                    <div className="lg:pl-6 border-t-2 border-dotted border-border/80 lg:border-t-0 pt-8 lg:pt-0">
                      <div className="divide-y-2 divide-dotted divide-border/80">
                        {col3.map((p: any) => renderSubmittedRow(p, p.seedCount))}
                      </div>
                    </div>
                  </div>

                  {hasMore && (
                    <div className="flex justify-center py-8">
                      <button
                        onClick={() => setUserGenVisibleCount((prev) => prev + 10)}
                        className="rounded-lg border border-border bg-muted/30 px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:shadow-lg transition-all"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          )}
          </>
          )}

          {pageTab === 'lists' && (
          <>
          {/* ============================================================= */}
          {/* SECTION: Admin Prompts                                         */}
          {/* ============================================================= */}
          <div className="mb-8">
            <div>
              <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                Admin Prompts
              </h2>
              <p className="text-muted-foreground mt-2">
                Prompts of the news from across New York.
              </p>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 3-COLUMN LAYOUT                                                */}
          {/* ============================================================= */}
          <div className="flex gap-8">
            {/* ----------------------------------------------------------- */}
            {/* LEFT SIDEBAR (lg+)                                           */}
            {/* ----------------------------------------------------------- */}
            <aside className="hidden lg:block w-[300px] flex-shrink-0 border-r-2 border-dotted border-border/80 pr-8">
              <div className="sticky top-24">
                <div>
                  <div className="space-y-3.5">
                    {trendingPrompts.map((p, idx) => {
                      const articleUrl = p.context?.startsWith('fetchUrl:')
                        ? p.context.slice('fetchUrl:'.length).trim()
                        : null;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handlePromptClick(p.id, p.upvotes, p.prompt, p.context)}
                          className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border border-transparent hover:border-border"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-sm line-clamp-2">{p.title}</h4>
                              <span className="text-xs text-blue-500">{getChatCount(p.id, p.upvotes)} chats</span>
                            </div>
                            {idx === 0 && <span className="text-base ml-2 shrink-0">🔥</span>}
                            {idx === 1 && <span className="text-base ml-2 shrink-0">✅</span>}
                          </div>
                          {/* Bottom row: logo left, arrow right */}
                          <div className="flex items-end justify-between mt-3">
                            <div className="flex items-center gap-2">
                              {p.image && articleUrl ? (
                                <a
                                  href={articleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Read article"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <img
                                    src={p.image}
                                    alt={p.title}
                                    className="h-7 rounded-lg object-cover border border-border/50 hover:shadow-md transition-all"
                                  />
                                </a>
                              ) : <div />}
                            </div>
                            <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <ArrowUp className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            {/* ----------------------------------------------------------- */}
            {/* CENTER COLUMN                                                */}
            {/* ----------------------------------------------------------- */}
            <div className="flex-1 min-w-0">
              {/* Hero — Budget Dashboard Preview */}
              <Link
                to="/charts/budget"
                className="block rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white p-8 mb-8 relative overflow-hidden group hover:shadow-xl transition-shadow"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                <div className="relative z-10 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3">
                      NYS FY2027 Budget Dashboard
                    </h2>
                    <p className="text-white/70 text-sm md:text-base max-w-xl leading-relaxed">
                      Explore New York State's $252B+ budget with interactive breakdowns by
                      agency, fund type, and fiscal year. Track spending trends and capital
                      appropriations.
                    </p>
                  </div>
                  <div className="mt-6">
                    <span className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-lg text-sm font-medium group-hover:bg-white/90 transition-colors">
                      Explorer
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                {/* Decorative chart bars */}
                <div className="absolute right-8 bottom-0 hidden md:flex items-end gap-2 h-32 opacity-20">
                  {[40, 65, 50, 80, 55, 70, 90, 60].map((h, i) => (
                    <div
                      key={i}
                      className="w-6 bg-white/50 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </Link>

              {/* Featured Category Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {featuredCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCategory(activeCategory === card.category ? 'All' : card.category)}
                    className={cn(
                      "group rounded-xl overflow-hidden relative h-28 text-left hover:shadow-lg transition-all duration-200",
                      activeCategory === card.category && "ring-2 ring-white/60 shadow-lg"
                    )}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.gradient} group-hover:scale-105 transition-transform duration-300`}
                    />
                    <div className="relative z-10 p-4 flex flex-col justify-end h-full">
                      <h3 className="text-white font-semibold text-sm">{card.title}</h3>
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile category pills (below lg) */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1 lg:hidden">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                      activeCategory === cat
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Prompt Feed */}
              <div className="space-y-3.5">
                {filteredPrompts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handlePromptClick(p.id, p.upvotes, p.prompt, p.context)}
                    className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border border-transparent hover:border-border"
                  >
                    {/* Top row: category tag + chats count */}
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          categoryColors[p.category] || 'bg-muted text-muted-foreground',
                        )}
                      >
                        {p.category}
                      </span>
                      <span className="text-xs font-medium text-blue-500">
                        {getChatCount(p.id, p.upvotes)} chats
                      </span>
                    </div>

                    <h3 className="font-semibold text-base mb-1">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {p.prompt}
                    </p>

                    {/* Bottom row: logo + send button */}
                    <div className="flex items-center justify-between mt-4">
                      {p.link ? (
                        <Link
                          to={p.link}
                          onClick={(e) => e.stopPropagation()}
                          title="Learn more"
                        >
                          <img
                            src="/nysgpt-rectangle.avif"
                            alt="NYSgpt"
                            className="h-7 rounded-lg object-cover border border-border/50 hover:shadow-md transition-all"
                          />
                        </Link>
                      ) : (
                        <img
                          src="/nysgpt-rectangle.avif"
                          alt="NYSgpt"
                          className="h-7 rounded-lg object-cover border border-border/50"
                        />
                      )}
                      <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ArrowUp className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div className="flex justify-center py-8">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="rounded-lg border border-border bg-muted/30 px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:shadow-lg transition-all"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* RIGHT SIDEBAR (xl+)                                          */}
            {/* ----------------------------------------------------------- */}
            <aside className="hidden xl:block w-[300px] flex-shrink-0 border-l-2 border-dotted border-border/80 pl-8">
              <div className="sticky top-24">
                {/* Press Releases */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Press Releases
                  </h3>
                  <div className="space-y-3.5">
                    {pressReleaseItems.map((p) => {
                      const articleUrl = p.context?.startsWith('fetchUrl:')
                        ? p.context.slice('fetchUrl:'.length).trim()
                        : null;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handlePromptClick(p.id, p.chats, p.prompt, p.context)}
                          className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border border-transparent hover:border-border"
                        >
                          <div>
                            <h4 className="font-semibold text-sm line-clamp-2">{p.title}</h4>
                            <span className="text-xs text-blue-500">{getChatCount(p.id, p.chats)} chats</span>
                          </div>
                          <div className="flex items-end justify-between mt-3">
                            <div className="flex items-center gap-2">
                              {p.image && articleUrl ? (
                                <a
                                  href={articleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Read press release"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <img
                                    src={p.image}
                                    alt="Source"
                                    className="h-7 rounded-lg object-cover border border-border/50 hover:shadow-md transition-all"
                                  />
                                </a>
                              ) : <div />}
                            </div>
                            <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <ArrowUp className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </div>
          </>
          )}
        </div>
      </main>

      <FooterSimple />
    </div>
  );
}
