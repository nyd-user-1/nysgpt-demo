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
import { ExternalLink } from 'lucide-react';

export interface BillCitationData {
  bill_number: string;
  title: string;
  status_desc: string;
  description?: string;
  committee?: string;
  session_id?: number;
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

interface BillHoverLinkProps {
  to: string;
  bill: BillCitationData;
  children: React.ReactNode;
}

function BillHoverLink({ to, bill, children }: BillHoverLinkProps) {
  return (
    <HoverCard openDelay={300} closeDelay={100}>
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
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link to={to} className="group flex-1">
              <h4 className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                {bill.bill_number}
              </h4>
            </Link>
            <Link to={to} className="shrink-0 text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs text-foreground leading-snug line-clamp-2">
            {bill.title}
          </p>
          <div className="flex items-center flex-wrap gap-1.5">
            {bill.status_desc && (
              <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                {bill.status_desc}
              </Badge>
            )}
            {bill.committee && (
              <span className="text-[10px] text-muted-foreground">
                {bill.committee}
              </span>
            )}
          </div>
          {bill.description && (
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3 border-t pt-2">
              {bill.description}
            </p>
          )}
        </div>
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
