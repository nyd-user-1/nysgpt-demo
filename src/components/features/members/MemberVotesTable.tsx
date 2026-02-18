import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { useMemberVotes, type MemberVoteRow } from "@/hooks/useMemberVotes";

type Member = Tables<"People">;

interface MemberVotesTableProps {
  member: Member;
}

type SortField = 'billNumber' | 'billTitle' | 'date' | 'vote';
type SortDirection = 'asc' | 'desc' | null;

export const MemberVotesTable = ({ member }: MemberVotesTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { votes, loading, error } = useMemberVotes(member.people_id);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = votes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = votes.filter(v =>
        v.billNumber?.toLowerCase().includes(query) ||
        v.billTitle?.toLowerCase().includes(query) ||
        v.vote?.toLowerCase().includes(query) ||
        v.date?.includes(query)
      );
    }

    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string = (a[sortField] || '').toLowerCase();
        let bVal: string = (b[sortField] || '').toLowerCase();

        if (sortField === 'date') {
          const aDate = new Date(aVal || 0).getTime();
          const bDate = new Date(bVal || 0).getTime();
          return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (sortDirection === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      });
    }

    return filtered;
  }, [votes, searchQuery, sortField, sortDirection]);

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const memberName = member.name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || "Member";

    doc.setFontSize(16);
    doc.text(`${memberName} - Voting Record`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${filteredAndSorted.length} votes${searchQuery ? ` (filtered: "${searchQuery}")` : ""}`, 14, 25);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["Bill", "Description", "Date", "Vote"]],
      body: filteredAndSorted.map((v) => [
        v.billNumber || "—",
        v.billTitle || "No title",
        v.date ? new Date(v.date + "T00:00:00").toLocaleDateString() : "—",
        v.vote || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 110 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
      },
    });

    const slug = memberName.toLowerCase().replace(/\s+/g, "-");
    doc.save(`${slug}-votes.pdf`);
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Member Votes ({filteredAndSorted.length} total)</CardTitle>
          {filteredAndSorted.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-1.5" />
              Export PDF
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search votes by bill number, description, vote type, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading votes...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive">{error}</div>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              {searchQuery ? "No votes found matching your search" : "No vote records found for this member"}
            </div>
          </div>
        ) : (
          <div className="relative border-t">
            {/* Fixed Header */}
            <Table className="table-fixed w-full">
              <TableHeader className="bg-background border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px] px-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('billNumber')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Bill {getSortIcon('billNumber')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[200px] px-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('billTitle')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Description {getSortIcon('billTitle')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[90px] px-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('date')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Date {getSortIcon('date')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[70px] px-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('vote')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Vote {getSortIcon('vote')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            {/* Scrollable Body */}
            <ScrollArea className="h-[500px] w-full">
              <Table className="table-fixed w-full">
                <TableBody>
                  {filteredAndSorted.map((vote, idx) => (
                    <TableRow
                      key={`${vote.billNumber}-${vote.date}-${idx}`}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="w-[60px] px-3 font-medium text-left">
                        {vote.billNumber || "—"}
                      </TableCell>
                      <TableCell className="w-[200px] px-3 text-left">
                        <div className="text-sm truncate" title={vote.billTitle || ""}>
                          {vote.billTitle || "No title"}
                        </div>
                      </TableCell>
                      <TableCell className="w-[90px] px-3 text-sm text-muted-foreground text-left whitespace-nowrap">
                        {vote.date ? new Date(vote.date + 'T00:00:00').toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="w-[70px] px-3 text-left">
                        <Badge
                          variant={
                            vote.vote === 'Yes' ? 'success'
                              : vote.vote === 'No' ? 'destructive'
                                : 'secondary'
                          }
                          className="whitespace-nowrap text-xs"
                        >
                          {vote.vote}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
