import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useBillText } from "@/hooks/useBillText";

interface BillTextProps {
  billNumber: string | null;
  sessionId: number | null;
}

export const BillText = ({ billNumber, sessionId }: BillTextProps) => {
  const [expanded, setExpanded] = useState(false);
  const { data: fullText, isLoading } = useBillText(billNumber, sessionId, expanded);

  return (
    <Card className="card bg-card rounded-xl shadow-sm border overflow-hidden">
      <CardHeader
        className="card-header px-6 py-4 border-b cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Bill Text</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1">
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : fullText ? (
            <div
              className="bill-text-content prose prose-sm max-w-3xl mx-auto text-foreground overflow-x-auto
                [&_pre]:whitespace-pre-wrap [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed
                [&_pre]:bg-white [&_pre]:text-black [&_pre]:p-6 [&_pre]:rounded-lg
                [&_p]:leading-relaxed [&_p]:my-2
                [&_u]:underline [&_b]:font-bold
                [&_u]:!text-green-600 [&_s]:!text-red-600
                [&_i]:!text-green-600 [&_i]:!bg-transparent"
              dangerouslySetInnerHTML={{ __html: fullText }}
            />
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Bill text is not available for this legislation.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
};
