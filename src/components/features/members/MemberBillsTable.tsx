import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, HelpCircle, Download } from "lucide-react";
import { useMemberBills } from "@/hooks/useMemberBills";
import { Tables } from "@/integrations/supabase/types";
import { formatDate } from "@/utils/dateUtils";

type Member = Tables<"People">;

interface MemberBillsTableProps {
  member: Member;
}

type SortField = 'bill_number' | 'title' | 'status_desc' | 'committee' | 'last_action' | 'last_action_date';
type SortDirection = 'asc' | 'desc' | null;

export const MemberBillsTable = ({ member }: MemberBillsTableProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { bills, loading, error } = useMemberBills(member.people_id);

  const handleBillClick = (bill: any) => {
    navigate(`/bills?selected=${bill.bill_id}`);
  };

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

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = bills.filter(bill =>
        bill.bill_number?.toLowerCase().includes(query) ||
        bill.title?.toLowerCase().includes(query) ||
        bill.description?.toLowerCase().includes(query) ||
        bill.last_action?.toLowerCase().includes(query) ||
        bill.committee?.toLowerCase().includes(query) ||
        bill.status_desc?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortField] || '';
        let bValue: any = b[sortField] || '';

        // Special handling for dates
        if (sortField === 'last_action_date') {
          const aDate = new Date(aValue || 0);
          const bDate = new Date(bValue || 0);
          if (sortDirection === 'asc') {
            return aDate.getTime() - bDate.getTime();
          } else {
            return bDate.getTime() - aDate.getTime();
          }
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
          if (sortDirection === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        }
      });
    }

    return filtered;
  }, [bills, searchQuery, sortField, sortDirection]);

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape" });
    const memberName = member.name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || "Member";

    doc.setFontSize(16);
    doc.text(`${memberName} - Sponsored Bills`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${filteredAndSortedBills.length} bills${searchQuery ? ` (filtered: "${searchQuery}")` : ""}`, 14, 25);
    doc.text(`Generated ${new Date().toLocaleDateString()} by NYSgpt`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["Bill", "Committee", "Description", "Status", "Last Action", "Action Date"]],
      body: filteredAndSortedBills.map((b) => [
        b.bill_number || "—",
        b.committee || "N/A",
        b.title || "No title",
        b.status_desc || "Unknown",
        b.last_action || "—",
        b.last_action_date ? formatDate(b.last_action_date) : "—",
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 100 },
        3: { cellWidth: 25 },
        4: { cellWidth: 55 },
        5: { cellWidth: 25 },
      },
    });

    const slug = memberName.toLowerCase().replace(/\s+/g, "-");
    doc.save(`${slug}-bills.pdf`);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Member Bills</CardTitle>
            {filteredAndSortedBills.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <Download className="h-4 w-4 mr-1.5" />
                Export PDF
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bills by number, title, description, or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading bills...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">{error}</div>
            </div>
          ) : filteredAndSortedBills.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                {searchQuery ? "No bills found matching your search" : "No bills found for this member"}
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
                        onClick={() => handleSort('bill_number')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Bill {getSortIcon('bill_number')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[110px] px-3 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('committee')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Committee {getSortIcon('committee')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[200px] px-3 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('title')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Description {getSortIcon('title')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[90px] px-3 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('status_desc')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Status {getSortIcon('status_desc')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px] px-3 text-left">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('last_action')}
                            className="h-auto p-0 font-semibold hover:bg-transparent flex items-center gap-1"
                          >
                            Last Action {getSortIcon('last_action')} <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ALL CAPS indicates Senate action, lowercase indicates Assembly action</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-[90px] px-3 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('last_action_date')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Action Date {getSortIcon('last_action_date')}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              {/* Scrollable Body */}
              <ScrollArea className="h-[500px] w-full">
                <Table className="table-fixed w-full">
                  <TableBody>
                    {filteredAndSortedBills.map((bill) => (
                      <TableRow
                        key={bill.bill_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleBillClick(bill)}
                      >
                        <TableCell className="w-[60px] px-3 font-medium text-left">
                          {bill.bill_number}
                        </TableCell>
                        <TableCell className="w-[110px] px-3 text-left">
                          <div className="text-sm truncate" title={bill.committee || ""}>
                            {bill.committee || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px] px-3 text-left">
                          <div className="text-sm truncate" title={bill.title || ""}>
                            {bill.title}
                          </div>
                        </TableCell>
                        <TableCell className="w-[90px] px-3 text-left">
                          <Badge
                            variant={bill.status_desc?.toLowerCase() === "passed" ? "success" : "secondary"}
                            className="whitespace-nowrap text-xs"
                          >
                            {bill.status_desc || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[120px] px-3 text-sm text-muted-foreground text-left">
                          <div className="truncate" title={bill.last_action || ""}>
                            {bill.last_action || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="w-[90px] px-3 text-sm text-muted-foreground text-left whitespace-nowrap">
                          {formatDate(bill.last_action_date)}
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
    </TooltipProvider>
  );
};
