import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarIcon, PlayCircleIcon } from 'lucide-react';

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

const categories = [
  'All Videos',
  'Advocacy',
  'Quick Start',
  'Deep Dive',
  'Walkthrough',
];

export default function Video() {
  const [activeTab, setActiveTab] = useState('popular');
  const [activeCategory, setActiveCategory] = useState('All Videos');

  const featuredVideo = videoPosts.find((post) => post.featured);

  const filteredVideos = videoPosts.filter(
    (video) =>
      !video.featured &&
      (activeCategory === 'All Videos' || video.category === activeCategory)
  );

  const formatViews = (views: number): string => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  return (
    <section className="container mx-auto px-4 py-12 md:px-6 2xl:max-w-[1400px]">
      <div className="mb-12 flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Video Demos</h2>
        <p className="text-muted-foreground">
          See NYSgpt in action — interactive walkthroughs of key features
        </p>
      </div>

      {/* Featured Video */}
      {featuredVideo && (
        <div className="mb-12">
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
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge>{featuredVideo.category}</Badge>
            </div>
            <h3 className="text-xl font-bold md:text-2xl">
              {featuredVideo.title}
            </h3>
            <p className="text-muted-foreground mt-2">
              {featuredVideo.excerpt}
            </p>
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-sm">
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

      {/* Tab Navigation - Desktop */}
      <div className="mb-8 hidden md:block">
        <Tabs defaultValue="popular" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`text-sm px-3 py-1 rounded-full transition-colors ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Tab Navigation - Mobile */}
      <div className="mb-6 md:hidden">
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="border-input bg-background ring-offset-background w-full rounded-md border px-3 py-2 text-sm"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className="flex h-full flex-col overflow-hidden pt-0"
          >
            <div className="relative w-full" style={{ paddingBottom: 'calc(57.3684% + 41px)' }}>
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
            <CardHeader className="pb-2">
              <div className="mb-1">
                <Badge variant="secondary" className="text-xs">
                  {video.category}
                </Badge>
              </div>
              <CardTitle className="line-clamp-2 text-lg">
                {video.title}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {video.excerpt}
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto flex items-center justify-between pt-0">
              <div className="text-muted-foreground text-sm">{video.date}</div>
              <div className="text-muted-foreground flex items-center text-sm">
                <PlayCircleIcon className="mr-1 h-3 w-3" />
                {formatViews(video.views)} views
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
