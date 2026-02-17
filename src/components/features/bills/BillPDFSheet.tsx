import { Download, FileText, Loader2, MessageSquare, ThumbsUp, ThumbsDown, Minus, StickyNote, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tables } from "@/integrations/supabase/types";
import { useBillReviews, ReviewStatus } from "@/hooks/useBillReviews";
import { useToast } from "@/hooks/use-toast";
import { QuickReviewNoteDialog } from "./QuickReviewNoteDialog";

type Bill = Tables<"Bills">;

interface BillPDFSheetProps {
  isOpen: boolean;
  onClose: () => void;
  billNumber: string;
  billTitle?: string;
  bill?: Bill | null;
}

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

export const BillPDFSheet = ({ isOpen, onClose, billNumber, billTitle, bill }: BillPDFSheetProps) => {
  // Clean bill number for URL (remove periods and lowercase)
  const cleanBillNumber = billNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sessionYear = bill?.session_id || 2025;
  const pdfUrl = `https://legislation.nysenate.gov/pdf/bills/${sessionYear}/${cleanBillNumber}`;
  const gviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const [error, setError] = useState<string>('');
  const [quickReviewOpen, setQuickReviewOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [sheetWidth, setSheetWidth] = useState(900);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Bill reviews hook
  const { getReviewForBill, setReviewStatus, saveReview } = useBillReviews();
  const currentReview = bill?.bill_id ? getReviewForBill(bill.bill_id) : undefined;

  // Debug: Log bill data when sheet opens
  useEffect(() => {
    if (isOpen) {
      console.log('BillPDFSheet opened with bill:', bill);
      console.log('Bill ID:', bill?.bill_id);
    }
  }, [isOpen, bill]);


  // Fetch PDF through CORS proxy when sheet opens, fall back to Google Docs Viewer
  useEffect(() => {
    if (!isOpen || !cleanBillNumber) return;

    const fetchPDF = async () => {
      setLoading(true);
      setError('');
      setUseGoogleViewer(false);

      // Try each CORS proxy
      for (const proxy of CORS_PROXIES) {
        try {
          const response = await fetch(proxy + encodeURIComponent(pdfUrl));
          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 0) {
              const blobUrl = URL.createObjectURL(blob);
              setPdfBlobUrl(blobUrl);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch with proxy ${proxy}:`, err);
        }
      }

      // If all proxies fail, use Google Docs Viewer as fallback
      console.log('CORS proxies failed, falling back to Google Docs Viewer');
      setUseGoogleViewer(true);
      setLoading(false);
    };

    fetchPDF();

    // Cleanup blob URL when component unmounts or bill changes
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, cleanBillNumber, pdfUrl]);

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleQuickReview = (action: 'support' | 'oppose' | 'neutral' | 'note') => {
    console.log('handleQuickReview called with action:', action, 'bill:', bill);

    if (action === 'note') {
      setQuickReviewOpen(false);
      setNoteDialogOpen(true);
      return;
    }

    if (!bill?.bill_id) {
      console.warn('Quick Review: bill_id not available');
      toast({
        title: "Unable to save review",
        description: "Bill data is still loading. Please try again.",
        variant: "destructive",
      });
      setQuickReviewOpen(false);
      return;
    }

    // Save the review
    setReviewStatus(bill.bill_id, action);
    setQuickReviewOpen(false);
  };

  const handleSaveNote = (status: ReviewStatus, note: string) => {
    if (bill?.bill_id) {
      saveReview(bill.bill_id, status, note);
    }
  };

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setSheetWidth(Math.max(400, Math.min(newWidth, window.innerWidth - 200)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col gap-0"
        style={{ width: `${sheetWidth}px`, maxWidth: '95vw' }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Resize Handle - positioned on the border */}
        <div
          ref={resizeRef}
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-20 cursor-col-resize group flex items-center justify-center z-50"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="w-1 h-full bg-border group-hover:bg-primary rounded-full transition-colors" />
        </div>

        <div className="pl-4 pr-12 sm:pl-6 sm:pr-14 py-3 sm:py-4 border-b flex-shrink-0 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold">
            {billNumber}
          </h2>
          <div className="flex items-center gap-2">
            <DropdownMenu open={quickReviewOpen} onOpenChange={setQuickReviewOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Quick Review
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleQuickReview('support')}
                >
                  <ThumbsUp className="h-4 w-4 mr-2 text-green-600" />
                  <span>Support</span>
                  {currentReview?.review_status === 'support' && (
                    <Check className="h-4 w-4 ml-auto text-green-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleQuickReview('oppose')}
                >
                  <ThumbsDown className="h-4 w-4 mr-2 text-red-600" />
                  <span>Oppose</span>
                  {currentReview?.review_status === 'oppose' && (
                    <Check className="h-4 w-4 ml-auto text-red-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleQuickReview('neutral')}
                >
                  <Minus className="h-4 w-4 mr-2 text-gray-600" />
                  <span>Neutral</span>
                  {currentReview?.review_status === 'neutral' && (
                    <Check className="h-4 w-4 ml-auto text-gray-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleQuickReview('note')}
                >
                  <StickyNote className="h-4 w-4 mr-2 text-yellow-600" />
                  <span>{currentReview?.note ? 'Edit Note' : 'Add Note'}</span>
                  {currentReview?.note && (
                    <Check className="h-4 w-4 ml-auto text-yellow-600" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-3">{error}</p>
                  <Button onClick={handleDownload} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          )}

          {useGoogleViewer && !loading && !error && (
            <div className="w-full h-full flex items-start justify-center">
              <iframe
                src={gviewUrl}
                className="w-full h-full max-w-full"
                title={`${billNumber} PDF`}
                style={{ border: 'none', minHeight: '100%' }}
              />
            </div>
          )}

          {pdfBlobUrl && !useGoogleViewer && !loading && !error && (
            <div className="w-full h-full flex items-start justify-center">
              <iframe
                id="pdf-iframe"
                src={pdfBlobUrl}
                className="w-full h-full max-w-full"
                title={`${billNumber} PDF`}
                style={{
                  border: 'none',
                  minHeight: '100%',
                }}
              />
            </div>
          )}
        </div>
      </SheetContent>

      {/* Quick Review Note Dialog - Draggable without overlay */}
      <QuickReviewNoteDialog
        isOpen={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        onSave={handleSaveNote}
        initialStatus={currentReview?.review_status}
        initialNote={currentReview?.note || ''}
        draggable
      />
    </Sheet>
  );
};
