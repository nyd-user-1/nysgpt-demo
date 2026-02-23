import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useS2Enrichment, S2Author } from "@/hooks/useS2Enrichment";
import {
  BookOpen,
  Quote,
  Users,
  ExternalLink,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

interface RecordDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: { id: number; title?: string; doi?: string } | null;
}

export function RecordDrawer({ open, onOpenChange, record }: RecordDrawerProps) {
  const { data: s2, isLoading, error } = useS2Enrichment(
    open && record ? record.id : null
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="line-clamp-2 text-base">
            {record?.title ?? "Record Details"}
          </DrawerTitle>
          {record?.doi && (
            <DrawerDescription className="font-mono text-xs">
              DOI: {record.doi}
            </DrawerDescription>
          )}
        </DrawerHeader>

        <ScrollArea className="max-h-[60vh] px-4 pb-6">
          {isLoading && <LoadingSkeleton />}

          {!isLoading && (!s2 || error || s2.lookup_status === "not_found") && (
            <NoDataFallback doi={record?.doi} />
          )}

          {!isLoading && s2 && s2.lookup_status === "pending" && (
            <p className="text-sm text-muted-foreground py-4">
              Enrichment is in progress. Check back shortly.
            </p>
          )}

          {!isLoading && s2 && s2.lookup_status === "error" && (
            <p className="text-sm text-muted-foreground py-4">
              There was an error looking up this record on Semantic Scholar.
            </p>
          )}

          {!isLoading && s2 && s2.lookup_status === "found" && (
            <div className="space-y-5">
              {/* TLDR */}
              {s2.tldr && <TldrSection tldr={s2.tldr} />}

              {/* Citation stats */}
              <CitationStats
                citationCount={s2.citation_count}
                influentialCitationCount={s2.influential_citation_count}
                referenceCount={s2.reference_count}
              />

              {/* Abstract */}
              {s2.abstract && <AbstractSection abstract={s2.abstract} />}

              {/* Open Access PDF */}
              {s2.is_open_access && s2.open_access_pdf_url && (
                <div>
                  <a
                    href={s2.open_access_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    Open Access PDF
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Venue & Date */}
              {(s2.venue || s2.publication_date) && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {s2.venue && <p>Venue: {s2.venue}</p>}
                  {s2.publication_date && (
                    <p>Published: {s2.publication_date}</p>
                  )}
                </div>
              )}

              {/* Fields of study */}
              {s2.fields_of_study && s2.fields_of_study.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {s2.fields_of_study.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Authors */}
              {s2.authors && s2.authors.length > 0 && (
                <AuthorsSection authors={s2.authors} />
              )}

              {/* BibTeX */}
              {s2.bibtex && <BibtexSection bibtex={s2.bibtex} />}

              {/* S2 link */}
              {s2.s2_paper_id && (
                <div className="pt-2 border-t">
                  <a
                    href={`https://www.semanticscholar.org/paper/${s2.s2_paper_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View on Semantic Scholar
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

// --- Sub-components ---

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-16 w-24" />
        <Skeleton className="h-16 w-24" />
        <Skeleton className="h-16 w-24" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function NoDataFallback({ doi }: { doi?: string }) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p>No Semantic Scholar data available.</p>
      {doi && (
        <a
          href={`https://doi.org/${doi}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800"
        >
          View via DOI <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function TldrSection({ tldr }: { tldr: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
        <Quote className="h-3 w-3" />
        TL;DR
      </div>
      <p className="text-sm leading-relaxed">{tldr}</p>
    </div>
  );
}

function CitationStats({
  citationCount,
  influentialCitationCount,
  referenceCount,
}: {
  citationCount: number | null;
  influentialCitationCount: number | null;
  referenceCount: number | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Citations" value={citationCount} />
      <StatCard label="Influential" value={influentialCitationCount} />
      <StatCard label="References" value={referenceCount} />
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-center">
      <p className="text-lg font-semibold">
        {value != null ? value.toLocaleString() : "—"}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AbstractSection({ abstract }: { abstract: string }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-1">
        Abstract
      </h4>
      <p className="text-sm leading-relaxed">{abstract}</p>
    </div>
  );
}

function AuthorsSection({ authors }: { authors: S2Author[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
        <Users className="h-3 w-3" />
        Authors ({authors.length})
      </div>
      <div className="space-y-1.5">
        {authors.map((author, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium">{author.name}</span>
            {author.hIndex != null && (
              <span className="text-xs text-muted-foreground ml-1.5">
                h-index: {author.hIndex}
              </span>
            )}
            {author.affiliations && author.affiliations.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1.5">
                — {author.affiliations.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BibtexSection({ bibtex }: { bibtex: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bibtex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-medium text-muted-foreground">BibTeX</h4>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
        {bibtex}
      </pre>
    </div>
  );
}
