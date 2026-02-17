import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, PlayCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { MobileMenuIcon } from '@/components/MobileMenuButton';

interface VideoPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  embedUrl: string;
  views: number;
  featured?: boolean;
}

const videoPosts: VideoPost[] = [
  {
    id: 1,
    title: 'Draft an Email to a Bill Sponsor and CC Committee Members',
    excerpt:
      'Learn how to use NYSgpt to draft a professional advocacy email to a bill sponsor, then CC the entire committee reviewing the bill — all in a few clicks.',
    category: 'Advocacy',
    date: 'February 16, 2026',
    embedUrl:
      'https://demo.arcade.software/9qSJTupyGmlV4zQCxSP8?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true',
    views: 1240,
    featured: true,
  },
  {
    id: 2,
    title: 'Draft and Send an Email to a Bill Sponsor',
    excerpt:
      'See how NYSgpt generates a support letter and opens your email client with the sponsor\'s address pre-filled — ready to send in seconds.',
    category: 'Quick Start',
    date: 'February 16, 2026',
    embedUrl:
      'https://demo.arcade.software/dFG3QSOevfc5NYtiCyQU?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true',
    views: 980,
  },
  {
    id: 3,
    title: 'Draft an Email to a Bill Sponsor and CC Committee Members',
    excerpt:
      'A closer look at the CC committee members feature — see how NYSgpt automatically identifies the right committee and fills in every member\'s email.',
    category: 'Deep Dive',
    date: 'February 16, 2026',
    embedUrl:
      'https://demo.arcade.software/9qSJTupyGmlV4zQCxSP8?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true',
    views: 750,
  },
  {
    id: 4,
    title: 'Draft and Send an Email to a Bill Sponsor',
    excerpt:
      'Watch the full workflow from finding a bill to emailing its sponsor with a professional support letter — powered by NYSgpt\'s AI.',
    category: 'Walkthrough',
    date: 'February 16, 2026',
    embedUrl:
      'https://demo.arcade.software/dFG3QSOevfc5NYtiCyQU?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true',
    views: 620,
  },
];

export default function Video() {
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const featuredVideo = videoPosts.find((post) => post.featured);
  const otherVideos = videoPosts.filter((video) => !video.featured);

  const formatViews = (views: number): string => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Left Sidebar - slides in from off-screen */}
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
        {/* Inner container - rounded with border */}
        <div className="h-full flex flex-col relative md:rounded-2xl md:border bg-background overflow-hidden">
          {/* Header with sidebar toggle and NYSgpt */}
          <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
            {/* Left side: Sidebar toggle */}
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
            {/* Right side: NYSgpt */}
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
                  How To
                </h1>
                <p className="text-muted-foreground mt-2">
                  Interactive walkthroughs and feature demos.
                </p>
              </div>

              {/* Featured Video */}
              {featuredVideo && (
                <div className="mb-8">
                  <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: 'calc(57.3684% + 41px)' }}>
                    <iframe
                      src={featuredVideo.embedUrl}
                      title={featuredVideo.title}
                      frameBorder="0"
                      loading="lazy"
                      allowFullScreen
                      allow="clipboard-write"
                      className="absolute inset-0 w-full h-full"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xl font-bold md:text-2xl">
                      {featuredVideo.title}
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {featuredVideo.excerpt}
                    </p>
                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center">
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        {featuredVideo.date}
                      </span>
                      <span className="flex items-center">
                        <PlayCircleIcon className="mr-1 h-4 w-4" />
                        {formatViews(featuredVideo.views)} views
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex flex-col overflow-hidden rounded-lg"
                  >
                    <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: 'calc(57.3684% + 41px)' }}>
                      <iframe
                        src={video.embedUrl}
                        title={video.title}
                        frameBorder="0"
                        loading="lazy"
                        allowFullScreen
                        allow="clipboard-write"
                        className="absolute inset-0 w-full h-full"
                        style={{ colorScheme: 'light' }}
                      />
                    </div>
                    <div className="py-3">
                      <h3 className="line-clamp-2 text-base font-semibold">
                        {video.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground mt-1">
                        {video.excerpt}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{video.date}</span>
                        <span className="flex items-center">
                          <PlayCircleIcon className="mr-1 h-3 w-3" />
                          {formatViews(video.views)} views
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
