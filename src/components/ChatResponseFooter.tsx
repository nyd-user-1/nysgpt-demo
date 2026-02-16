/**
 * ChatResponseFooter Component
 * Displays action buttons, bill-specific actions, and citations accordion below AI responses
 */

import { useState, ReactNode, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown, Copy, Check, Mail, MoreHorizontal, Star, FileDown, ScrollText, TextQuote, Loader2, NotebookPen } from "lucide-react";
import { useExcerptPersistence } from "@/hooks/useExcerptPersistence";
import { useNotePersistence } from "@/hooks/useNotePersistence";
import { useBillText } from "@/hooks/useBillText";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PerplexityCitation } from "@/utils/citationParser";
import { BillPDFSheet } from "@/components/features/bills/BillPDFSheet";
import { EmailLetterSheet } from "@/components/features/bills/EmailLetterSheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Bill = Tables<"Bills">;

interface BillCitation {
  bill_number: string;
  title: string;
  status_desc: string;
  description?: string;
  committee?: string;
  session_id?: number;
}

interface ChatResponseFooterProps {
  messageContent: ReactNode;
  bills: BillCitation[];
  sources: PerplexityCitation[];
  relatedBills?: BillCitation[];
  onCitationClick?: (citationNumber: number) => void;
  isStreaming?: boolean;
  onSendMessage?: (message: string) => void;
  // Props for excerpt creation
  userMessage?: string;
  assistantMessageText?: string;
  parentSessionId?: string;
  hideCreateExcerpt?: boolean;
  onExcerptCreated?: () => void;
  // Props for thumbs up/down feedback
  messageId?: string;
  feedback?: 'good' | 'bad' | null;
  onFeedback?: (messageId: string, feedback: 'good' | 'bad' | null) => void;
}

export function ChatResponseFooter({
  messageContent,
  bills,
  sources,
  relatedBills = [],
  onCitationClick,
  isStreaming = false,
  onSendMessage,
  userMessage,
  assistantMessageText,
  parentSessionId,
  hideCreateExcerpt = false,
  onExcerptCreated,
  messageId,
  feedback,
  onFeedback
}: ChatResponseFooterProps) {
  const hasBills = bills && bills.length > 0;
  const hasSources = sources && sources.length > 0;
  const hasRelated = relatedBills && relatedBills.length > 0;
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createExcerpt, loading: excerptLoading } = useExcerptPersistence();
  const { createNote, loading: noteLoading } = useNotePersistence();
  const [excerptSaved, setExcerptSaved] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [selectedBillNumber, setSelectedBillNumber] = useState<string>("");
  const [selectedBillTitle, setSelectedBillTitle] = useState<string>("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillText, setShowBillText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'good' | 'bad' | null>(feedback ?? null);
  const billTextRef = useRef<HTMLDivElement>(null);

  // Lazy-fetch bill text only when accordion is toggled open
  const primaryBill = hasBills ? bills[0] : null;
  const { data: billFullText, isLoading: billTextLoading } = useBillText(
    primaryBill?.bill_number ?? null,
    primaryBill?.session_id ?? null,
    showBillText
  );

  const handlePDFView = async (billNumber: string, billTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBillNumber(billNumber);
    setSelectedBillTitle(billTitle);

    // Fetch the bill data BEFORE opening the sheet for Quick Review functionality
    try {
      const { data } = await supabase
        .from("Bills")
        .select("*")
        .ilike("bill_number", billNumber)
        .single();

      if (data) {
        setSelectedBill(data);
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
    }

    // Open the sheet after bill is fetched
    setPdfOpen(true);
  };

  const handleCopy = async () => {
    const extractText = (node: ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (node && typeof node === 'object' && 'props' in node) {
        return extractText(node.props.children);
      }
      return '';
    };

    const text = extractText(messageContent);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Copied to clipboard",
      description: "Response text has been copied",
    });
  };

  const handleExport = async () => {
    const extractText = (node: ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (node && typeof node === 'object' && 'props' in node) {
        return extractText(node.props.children);
      }
      return '';
    };

    const text = extractText(messageContent);

    // Create PDF
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add title
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("NYSgpt Response", margin, margin);

    // Add date
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(128, 128, 128);
    pdf.text(new Date().toLocaleDateString(), margin, margin + 8);
    pdf.setTextColor(0, 0, 0);

    let yPosition = margin + 20;

    // Helper to check/add new page
    const checkNewPage = (neededHeight: number) => {
      if (yPosition + neededHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Helper to render text with inline bold support
    const renderTextWithBold = (line: string, x: number, fontSize: number) => {
      pdf.setFontSize(fontSize);
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      let currentX = x;

      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          const boldText = part.slice(2, -2);
          pdf.setFont("helvetica", "bold");
          pdf.text(boldText, currentX, yPosition);
          currentX += pdf.getTextWidth(boldText);
        } else if (part) {
          // Normal text
          pdf.setFont("helvetica", "normal");
          pdf.text(part, currentX, yPosition);
          currentX += pdf.getTextWidth(part);
        }
      }
    };

    // Process content line by line
    const rawLines = text.split('\n');

    for (const rawLine of rawLines) {
      const trimmedLine = rawLine.trim();

      // Skip empty lines but add spacing
      if (!trimmedLine) {
        yPosition += 4;
        continue;
      }

      // Handle headers (### Header)
      if (trimmedLine.startsWith('### ')) {
        checkNewPage(12);
        yPosition += 6; // Extra space before header
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        const headerText = trimmedLine.replace(/^###\s*/, '').replace(/\*\*/g, '');
        pdf.text(headerText, margin, yPosition);
        yPosition += 8;
        continue;
      }

      // Handle H2 headers (## Header)
      if (trimmedLine.startsWith('## ')) {
        checkNewPage(14);
        yPosition += 8;
        pdf.setFontSize(15);
        pdf.setFont("helvetica", "bold");
        const headerText = trimmedLine.replace(/^##\s*/, '').replace(/\*\*/g, '');
        pdf.text(headerText, margin, yPosition);
        yPosition += 10;
        continue;
      }

      // Handle list items (- item)
      if (trimmedLine.startsWith('- ')) {
        const listContent = trimmedLine.slice(2);
        const listMaxWidth = maxWidth - 10;

        // Split for word wrap
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        const wrappedLines = pdf.splitTextToSize(listContent.replace(/\*\*/g, ''), listMaxWidth);

        for (let i = 0; i < wrappedLines.length; i++) {
          checkNewPage(6);
          if (i === 0) {
            pdf.text("•", margin, yPosition);
          }
          // Check if original line had bold markers and render accordingly
          if (listContent.includes('**')) {
            renderTextWithBold(wrappedLines[i], margin + 8, 11);
          } else {
            pdf.text(wrappedLines[i], margin + 8, yPosition);
          }
          yPosition += 6;
        }
        continue;
      }

      // Regular paragraph - handle word wrap and bold
      pdf.setFontSize(11);
      const cleanLine = trimmedLine.replace(/\*\*/g, '');
      const wrappedLines = pdf.splitTextToSize(cleanLine, maxWidth);

      for (const wrappedLine of wrappedLines) {
        checkNewPage(6);
        // If original has bold markers, render with bold support
        if (trimmedLine.includes('**')) {
          renderTextWithBold(wrappedLine, margin, 11);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.text(wrappedLine, margin, yPosition);
        }
        yPosition += 6;
      }
    }

    // Save PDF
    pdf.save(`nysgpt-response-${Date.now()}.pdf`);

    toast({
      title: "Exported successfully",
      description: "Response has been downloaded as a PDF",
    });
  };

  const handleFavorite = () => {
    toast({
      title: "Added to favorites",
      description: "This response has been saved to your favorites",
    });
    // TODO: Implement actual favorite functionality
  };

  const handleSupportLetter = () => {
    if (onSendMessage && hasBills) {
      const billNumber = bills[0].bill_number;
      onSendMessage(`Can you help me write a letter in support of ${billNumber}?`);
    }
  };

  const handleOppositionLetter = () => {
    if (onSendMessage && hasBills) {
      const billNumber = bills[0].bill_number;
      onSendMessage(`Can you help me write a letter opposing ${billNumber}?`);
    }
  };

  const handleCreateExcerpt = async () => {
    if (!userMessage || !assistantMessageText) {
      toast({
        title: "Cannot create excerpt",
        description: "Missing message content",
        variant: "destructive",
      });
      return;
    }

    // Generate title from user message (truncate to ~50 chars)
    const title = userMessage.length > 50
      ? userMessage.substring(0, 50) + '...'
      : userMessage;

    const excerpt = await createExcerpt({
      parentSessionId,
      title,
      userMessage,
      assistantMessage: assistantMessageText,
      // Note: bill_id is not available in citations, so we don't pass it
      // The excerpt will still work, just without the bill link
    });

    if (excerpt) {
      setExcerptSaved(true);
      toast({
        title: "Excerpt saved",
        description: "This Q&A has been saved to your excerpts",
      });
      // Refresh sidebar
      window.dispatchEvent(new CustomEvent('refresh-sidebar-excerpts'));
      onExcerptCreated?.();
      // Reset saved state after a delay
      setTimeout(() => setExcerptSaved(false), 3000);
    } else {
      toast({
        title: "Failed to save excerpt",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleOpenAsNote = async () => {
    if (!assistantMessageText) {
      toast({
        title: "Cannot create note",
        description: "Missing message content",
        variant: "destructive",
      });
      return;
    }

    // Generate title from user message or first line of content
    const title = userMessage
      ? (userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage)
      : (assistantMessageText.split('\n')[0].substring(0, 50) + '...');

    const note = await createNote({
      parentSessionId,
      title,
      content: assistantMessageText,
      userQuery: userMessage,
    });

    if (note) {
      toast({
        title: "Note created",
        description: "Opening your note...",
      });
      // Refresh sidebar
      window.dispatchEvent(new CustomEvent('refresh-sidebar-notes'));
      // Navigate to the note
      navigate(`/n/${note.id}`);
    } else {
      toast({
        title: "Failed to create note",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Auto-scroll to bill text when toggled on
  useEffect(() => {
    if (showBillText && billTextRef.current) {
      setTimeout(() => {
        billTextRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [showBillText]);

  return (
    <div className="space-y-6">
      {/* Message Content */}
      <div className="prose prose-sm max-w-none">
        {messageContent}
      </div>

      {/* Action Buttons - Only show when NOT streaming */}
      {!isStreaming && (
        <div className="flex items-center gap-3 pt-4 border-t animate-in fade-in duration-300">
          {/* View Bill Text Toggle */}
          {hasBills && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${showBillText
                    ? "text-foreground bg-muted hover:bg-muted/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setShowBillText(!showBillText)}
                >
                  <ScrollText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View bill text</TooltipContent>
            </Tooltip>
          )}

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="[&>*]:cursor-pointer">
              {/* Bill-specific actions - only show when bills present */}
              {hasBills && onSendMessage && (
                <DropdownMenuItem onClick={handleSupportLetter} className="focus:bg-muted focus:text-foreground">
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Write support letter
                </DropdownMenuItem>
              )}
              {hasBills && onSendMessage && (
                <DropdownMenuItem onClick={handleOppositionLetter} className="focus:bg-muted focus:text-foreground">
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Write opposition letter
                </DropdownMenuItem>
              )}
              {hasBills && (
                <DropdownMenuItem onClick={() => setEmailSheetOpen(true)} className="focus:bg-muted focus:text-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  Email to sponsor
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleCreateExcerpt} disabled={excerptLoading || excerptSaved} className="focus:bg-muted focus:text-foreground">
                {excerptLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : excerptSaved ? (
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <TextQuote className="h-4 w-4 mr-2" />
                )}
                {excerptSaved ? "Excerpt saved" : "Create Excerpt"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenAsNote} disabled={noteLoading} className="focus:bg-muted focus:text-foreground">
                {noteLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <NotebookPen className="h-4 w-4 mr-2" />
                )}
                Open as Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy} className="focus:bg-muted focus:text-foreground">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFavorite} className="focus:bg-muted focus:text-foreground">
                <Star className="h-4 w-4 mr-2" />
                Favorite
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="focus:bg-muted focus:text-foreground">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Thumbs Up/Down Feedback */}
          {onFeedback && messageId && (
            <div className="flex items-center gap-1 ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      feedbackState === 'good'
                        ? 'text-green-600 hover:text-green-600 hover:bg-green-50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      const next = feedbackState === 'good' ? null : 'good';
                      setFeedbackState(next);
                      onFeedback(messageId, next);
                    }}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Good response</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      feedbackState === 'bad'
                        ? 'text-red-500 hover:text-red-500 hover:bg-red-50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      const next = feedbackState === 'bad' ? null : 'bad';
                      setFeedbackState(next);
                      onFeedback(messageId, next);
                    }}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bad response</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Bill Text Accordion - toggled by ScrollText icon */}
      {!isStreaming && showBillText && hasBills && (
        <div ref={billTextRef} className="pt-4 animate-in fade-in duration-300">
          <Accordion type="single" collapsible defaultValue="bill-text">
            <AccordionItem value="bill-text" className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="text-sm font-medium">
                  View Bill — {primaryBill?.bill_number}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                {billTextLoading ? (
                  <div className="space-y-3 px-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : billFullText ? (
                  <div
                    className="bill-text-content prose prose-sm max-w-none text-foreground overflow-x-auto
                      [&_pre]:whitespace-pre-wrap [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed
                      [&_pre]:bg-white [&_pre]:text-black [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
                      [&_p]:leading-relaxed [&_p]:my-2
                      [&_u]:underline [&_b]:font-bold
                      [&_u]:!text-green-600 [&_s]:!text-red-600
                      [&_i]:!text-green-600 [&_i]:!bg-transparent"
                    dangerouslySetInnerHTML={{ __html: billFullText }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm italic px-2">
                    Bill text is not available for this legislation.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* PDF Viewer Sheet */}
      <BillPDFSheet
        isOpen={pdfOpen}
        onClose={() => {
          setPdfOpen(false);
          setSelectedBill(null);
        }}
        billNumber={selectedBillNumber}
        billTitle={selectedBillTitle}
        bill={selectedBill}
      />

      {/* Email Letter Sheet */}
      {hasBills && (
        <EmailLetterSheet
          isOpen={emailSheetOpen}
          onClose={() => setEmailSheetOpen(false)}
          billNumber={bills[0].bill_number}
          billTitle={bills[0].title}
          messageContent={messageContent}
        />
      )}
    </div>
  );
}
