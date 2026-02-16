import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { autoLinkBills } from '@/utils/autoLinkBills';
import { normalizeBillNumber } from '@/utils/billNumberUtils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BillCitationData {
  bill_number: string;
  title: string;
  status_desc: string;
  description?: string;
  committee?: string;
  session_id?: number;
  sponsor_name?: string;
  sponsor_party?: string;
  sponsor_district?: string;
  sponsor_chamber?: string;
  sponsor_slug?: string;
  committee_slug?: string;
}

/**
 * Rewrite known external NYS URLs to internal paths.
 * e.g. nysenate.gov/legislation/bills/2025/S1234 → /bills/S1234
 */
function rewriteExternalUrl(href: string): string | null {
  try {
    const url = new URL(href, 'https://placeholder.com');

    if (
      url.hostname.includes('nysenate.gov') &&
      url.pathname.includes('/legislation/bills/')
    ) {
      const segments = url.pathname.split('/');
      const billNum = segments[segments.length - 1];
      if (billNum && /^[ASJK]\d+[A-Z]?$/i.test(billNum)) {
        return `/bills/${normalizeBillNumber(billNum)}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract bill number from an internal /bills/XXXX path.
 */
function extractBillFromPath(href: string): string | null {
  const match = href.match(/^\/bills\/([ASJK]\d+[A-Z]?)$/i);
  return match ? normalizeBillNumber(match[1]) : null;
}

/**
 * Find bill metadata by bill number (case-insensitive).
 */
function findBill(bills: BillCitationData[], billNumber: string): BillCitationData | undefined {
  const normalized = normalizeBillNumber(billNumber);
  return bills.find(b => normalizeBillNumber(b.bill_number) === normalized);
}

/**
 * Generate a slug from a name (matching memberSlug.ts logic).
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(part => part.length > 1)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface BillHoverLinkProps {
  to: string;
  bill: BillCitationData;
  children: React.ReactNode;
}

function BillHoverLink({ to, bill, children }: BillHoverLinkProps) {
  const [slide, setSlide] = useState(0);

  // Count total slides: always bill (1), + sponsor if present, + committee if present
  const hasSponsor = !!bill.sponsor_name;
  const hasCommittee = !!bill.committee;
  const totalSlides = 1 + (hasSponsor ? 1 : 0) + (hasCommittee ? 1 : 0);

  const prev = useCallback(() => setSlide(s => Math.max(0, s - 1)), []);
  const next = useCallback(() => setSlide(s => Math.min(totalSlides - 1, s + 1)), [totalSlides]);

  // Reset slide when hover card opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) setSlide(0);
  }, []);

  const sponsorSlug = bill.sponsor_slug || (bill.sponsor_name ? nameToSlug(bill.sponsor_name) : '');

  return (
    <HoverCard openDelay={300} closeDelay={150} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <Link
          to={to}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          {children}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-0 overflow-hidden"
        align="start"
        side="bottom"
        sideOffset={6}
      >
        {/* Carousel Header */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
                disabled={slide === 0}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
                disabled={slide === totalSlides - 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {slide + 1}/{totalSlides}
            </span>
          </div>
        )}

        {/* Slide 1: Bill */}
        {slide === 0 && (
          <div className="p-3 space-y-2">
            <Link to={to} className="group">
              <h4 className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                {bill.bill_number}
              </h4>
            </Link>
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {bill.title}
            </p>
            {bill.description && (
              <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                {bill.description}
              </p>
            )}
          </div>
        )}

        {/* Slide 2: Sponsor */}
        {hasSponsor && slide === 1 && (
          <div className="p-3 space-y-2">
            {sponsorSlug ? (
              <Link to={`/members/${sponsorSlug}`} className="group">
                <h4 className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                  {bill.sponsor_name}
                </h4>
              </Link>
            ) : (
              <h4 className="text-sm font-semibold text-foreground">
                {bill.sponsor_name}
              </h4>
            )}
            <p className="text-xs text-muted-foreground">
              Primary Sponsor
            </p>
            <div className="flex items-center flex-wrap gap-1.5">
              {bill.sponsor_party && (
                <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                  {bill.sponsor_party}
                </Badge>
              )}
              {bill.sponsor_chamber && (
                <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                  {bill.sponsor_chamber}
                </Badge>
              )}
              {bill.sponsor_district && (
                <span className="text-[10px] text-muted-foreground">
                  District {bill.sponsor_district}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-snug border-t pt-2">
              Sponsor of {bill.bill_number}
              {bill.committee ? ` · ${bill.committee}` : ''}
            </p>
          </div>
        )}

        {/* Slide 3: Committee */}
        {hasCommittee && slide === (hasSponsor ? 2 : 1) && (
          <div className="p-3 space-y-2">
            {bill.committee_slug ? (
              <Link to={`/committees/${bill.committee_slug}`} className="group">
                <h4 className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                  {bill.committee}
                </h4>
              </Link>
            ) : (
              <h4 className="text-sm font-semibold text-foreground">
                {bill.committee}
              </h4>
            )}
            <p className="text-xs text-muted-foreground leading-snug">
              {bill.bill_number} is currently in the {bill.committee} committee.
            </p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

interface ChatMarkdownProps {
  children: string;
  bills?: BillCitationData[];
}

export function ChatMarkdown({ children, bills }: ChatMarkdownProps) {
  const processed = autoLinkBills(children);

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed text-foreground">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        h1: ({ children }) => (
          <h1 className="text-xl font-semibold mb-3 text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mb-2 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mb-2 text-foreground">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold mb-1 text-foreground">
            {children}
          </h4>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground text-sm">{children}</li>
        ),
        a: ({ href, children }) => {
          if (!href) return <span>{children}</span>;

          // Internal path → check if it's a bill link with metadata
          if (href.startsWith('/')) {
            const billNumber = extractBillFromPath(href);
            const bill = billNumber && bills?.length ? findBill(bills, billNumber) : undefined;

            if (bill) {
              return (
                <BillHoverLink to={href} bill={bill}>
                  {children}
                </BillHoverLink>
              );
            }

            return (
              <Link
                to={href}
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {children}
              </Link>
            );
          }

          // Rewrite known external NYS URLs to internal paths
          const internalPath = rewriteExternalUrl(href);
          if (internalPath) {
            const billNumber = extractBillFromPath(internalPath);
            const bill = billNumber && bills?.length ? findBill(bills, billNumber) : undefined;

            if (bill) {
              return (
                <BillHoverLink to={internalPath} bill={bill}>
                  {children}
                </BillHoverLink>
              );
            }

            return (
              <Link
                to={internalPath}
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {children}
              </Link>
            );
          }

          // External link — open in new tab
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
