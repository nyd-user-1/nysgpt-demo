import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { ArrowUp, ArrowDown, Square, Search as SearchIcon, FileText, Users, Building2, Wallet, Paperclip, X, PanelLeft, HandCoins, Lightbulb, Check, Plus, ChevronRight } from "lucide-react";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";
import { Contract } from "@/types/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics";
// Safe sidebar hook that doesn't throw on public pages without SidebarProvider
import { createContext, useContext } from "react";

// Try to get sidebar context safely
const useSidebarSafe = () => {
  try {
    // Dynamic import to avoid the throw
    const { useSidebar } = require("@/components/ui/sidebar");
    return useSidebar();
  } catch {
    return { setOpen: () => {} };
  }
};
import { supabase } from "@/integrations/supabase/client";
import { parseSSEStream, extractNonStreamingContent } from "@/utils/sseStreamParser";
import { getEdgeFunctionName } from "@/hooks/useChatDrawer";
import { composeSystemPrompt } from "@/lib/prompts/systemPromptComposer";
import { buildContractContext } from "@/lib/context/contractContext";
import {
  consumeSchoolFundingData,
  buildSchoolFundingContext,
  type SchoolFundingDetails,
} from "@/lib/context/schoolFundingContext";
import { ChatMarkdown } from '@/components/shared/ChatMarkdown';
import { useModel } from "@/contexts/ModelContext";
import { Textarea } from "@/components/ui/textarea";
import { ChatHeader } from "@/components/ChatHeader";
import { MobileMenuIcon, MobileNYSgpt } from '@/components/MobileMenuButton';
import { CitationText } from "@/components/CitationText";
import { ChatResponseFooter } from "@/components/ChatResponseFooter";
import { PerplexityCitation, extractCitationNumbers, stripCitations } from "@/utils/citationParser";
import { normalizeBillNumber } from "@/utils/billNumberUtils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EngineSelection } from "@/components/EngineSelection";
import { AskNYSgptSelectionPopup } from "@/components/AskNYSgptSelectionPopup";
import { useAIUsage, countWords } from "@/hooks/useAIUsage";
import { useToast } from "@/hooks/use-toast";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  extractReasoning,
} from "@/components/ai-elements/reasoning";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationSource,
  parseCitationMarkers,
  CitationSource,
} from "@/components/ai-elements/inline-citation";

// Thinking phrases that rotate per message instance
const thinkingPhrases = [
  "Thinking…",
  "Reflecting…",
  "Considering…",
  "Processing…",
  "Drafting a thought…",
  "Formulating a response…",
  "Gathering context…"
];

// Counter to track which phrase to use (increments with each message)
let thinkingPhraseIndex = 0;

const getNextThinkingPhrase = () => {
  const phrase = thinkingPhrases[thinkingPhraseIndex % thinkingPhrases.length];
  thinkingPhraseIndex++;
  return phrase;
};

// Convert PerplexityCitation to CitationSource format for inline citation rendering
const convertToCitationSources = (perplexityCitations: PerplexityCitation[]): CitationSource[] => {
  return perplexityCitations.map(c => ({
    url: c.url,
    title: c.title,
    description: c.excerpt,
  }));
};

// Helper to parse and separate clients section from message content
const parseClientsSection = (content: string): { mainContent: string; clients: string[] } => {
  const startMarker = '---CLIENTS_START---';
  const endMarker = '---CLIENTS_END---';

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return { mainContent: content, clients: [] };
  }

  const mainContent = content.substring(0, startIndex).trim();
  const clientsSection = content.substring(startIndex + startMarker.length, endIndex).trim();

  // Parse bullet points (handles both "- " and "* " formats)
  const clients = clientsSection
    .split('\n')
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(line => line.length > 0);

  return { mainContent, clients };
};

// Helper to strip clients section from streaming content and detect loading state
const stripClientsSection = (content: string): { cleanContent: string; isLoadingClients: boolean; partialClients: string[] } => {
  const startMarker = '---CLIENTS_START---';
  const endMarker = '---CLIENTS_END---';

  const startIndex = content.indexOf(startMarker);

  // No clients section started yet
  if (startIndex === -1) {
    return { cleanContent: content, isLoadingClients: false, partialClients: [] };
  }

  const cleanContent = content.substring(0, startIndex).trim();
  const endIndex = content.indexOf(endMarker);

  // Clients section started but not complete - parse partial clients
  if (endIndex === -1) {
    const partialSection = content.substring(startIndex + startMarker.length);
    const partialClients = partialSection
      .split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 0);

    return { cleanContent, isLoadingClients: true, partialClients };
  }

  // Section complete
  return { cleanContent, isLoadingClients: false, partialClients: [] };
};

// Streaming reasoning text component - simulates AI thinking process with shimmer
const StreamingReasoningText = ({
  steps,
  isStreaming
}: {
  steps: string[];
  isStreaming: boolean;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const fullText = steps.join("");

  useEffect(() => {
    if (!isStreaming) {
      // When streaming stops, show complete text without animation
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    // Reset when streaming starts
    setDisplayedText("");
    setCurrentCharIndex(0);
    setIsTyping(true);
  }, [isStreaming, fullText]);

  useEffect(() => {
    if (!isStreaming || !isTyping || currentCharIndex >= fullText.length) {
      if (currentCharIndex >= fullText.length) {
        setIsTyping(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(fullText.slice(0, currentCharIndex + 1));
      setCurrentCharIndex(prev => prev + 1);
    }, 25); // 25ms per character for smooth streaming effect

    return () => clearTimeout(timer);
  }, [isStreaming, isTyping, currentCharIndex, fullText]);

  if (!displayedText) return null;

  return (
    <div className="whitespace-pre-wrap">
      {isTyping ? (
        <Shimmer duration={2} spread={1}>
          {displayedText}
          <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
        </Shimmer>
      ) : (
        displayedText
      )}
    </div>
  );
};

// Context for the "What is NYSgpt?" prompt
const NYSGPT_CONTEXT = `You are answering "What is NYSgpt?" for a new user. NYSgpt is a civic engagement platform focused on New York State legislation. Describe it naturally and highlight these unique features:

- Research any bill and get AI-powered analysis with stakeholder impact, political context, and likelihood of passage
- Email legislators directly - send letters to bill sponsors and CC all co-sponsors with one click
- Generate support or opposition letters instantly using AI
- View official NYS Legislature bill PDFs right in the interface
- Track your position on bills (Support/Oppose/Neutral) and add personal notes via Quick Review
- Every response includes References, Related Bills, and Resources sections

Keep the tone helpful and practical, not preachy. Let the features speak for themselves. End with something like: "Every bill analysis includes tools to email sponsors, generate letters, view official documents, and track your positions."`;

interface BillCitation {
  bill_id?: number;
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

// SchoolFundingCategory and SchoolFundingDetails imported from @/lib/context/schoolFundingContext

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  streamedContent?: string;
  searchQueries?: string[];
  reviewedInfo?: string;
  citations?: BillCitation[];
  relatedBills?: BillCitation[];
  perplexityCitations?: PerplexityCitation[];
  isPerplexityResponse?: boolean;
  thinkingPhrase?: string;
  schoolFundingData?: SchoolFundingDetails;
  isContractChat?: boolean;
  reasoning?: string;
  reasoningDuration?: number;
  feedback?: 'good' | 'bad' | null;
  /** System prompt sent to LLM — for fine-tuning data export */
  promptLog?: string;
}

// Shared prompt builders — used by card triggers, popovers, and pill drawers
const buildBillPrompt = (bill: BillCitation): string => {
  const billNum = bill.bill_number || 'this bill';
  const title = bill.title ? ` "${bill.title}"` : '';
  const status = bill.status_desc ? ` (Status: ${bill.status_desc})` : '';
  const sponsor = bill.sponsor_name ? ` Sponsored by ${bill.sponsor_name}.` : '';
  if (bill.description) {
    const shortDesc = bill.description.length > 150
      ? bill.description.substring(0, 150) + '...'
      : bill.description;
    return `Tell me about bill ${billNum}${title}${status}.${sponsor} The bill's summary: "${shortDesc}". What are the key provisions and who would be affected?`;
  }
  return `Tell me about bill ${billNum}${title}${status}.${sponsor} What are the key provisions and who would be affected?`;
};

const buildMemberPrompt = (member: any): string => {
  const name = member.name || 'this member';
  const chamber = member.chamber ? `${member.chamber} ` : '';
  const party = member.party ? ` (${member.party})` : '';
  const district = member.district ? ` representing District ${member.district}` : '';
  return `Tell me about ${chamber}member ${name}${party}${district}. What legislation have they sponsored and what are their key policy positions?`;
};

const buildCommitteePrompt = (committee: any): string => {
  const chamberPrefix = committee.chamber === 'Senate' ? 'Senate ' : committee.chamber === 'Assembly' ? 'Assembly ' : '';
  const name = `${chamberPrefix}${committee.committee_name || 'Committee'}`;
  const chair = committee.chair_name ? ` chaired by ${committee.chair_name}` : '';
  return `Tell me about the ${name}${chair}. What legislation does this committee handle and what should I know about it?`;
};

/** Convert committee_members slug string to readable names for AI context */
const formatCommitteeMembers = (committee: any): string => {
  const slugs = committee.committee_members;
  if (!slugs) return '';
  const names = slugs.split(';').map((s: string) =>
    s.trim().split('-').map((w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ')
  ).filter(Boolean);
  if (names.length === 0) return '';
  const chamberPrefix = committee.chamber === 'Senate' ? 'Senate ' : committee.chamber === 'Assembly' ? 'Assembly ' : '';
  const committeeName = `${chamberPrefix}${committee.committee_name || 'Committee'}`;
  const chair = committee.chair_name ? `Chair: ${committee.chair_name}\n` : '';
  return `Current members of the ${committeeName}:\n${chair}Members (${names.length}): ${names.join(', ')}`;
};

const NewChat = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => {
    // Don't open sidebar by default on the public landing page
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      return localStorage.getItem('nysgpt_sidebar_open') === 'true';
    }
    return false;
  });
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [mobileDrawerCategory, setMobileDrawerCategory] = useState<string | null>(null);
  const [mobilePlusMenuOpen, setMobilePlusMenuOpen] = useState(false);
  const [isMobilePhone, setIsMobilePhone] = useState(false);

  // Detect phone viewport (< 640px)
  useEffect(() => {
    const check = () => setIsMobilePhone(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('nysgpt_sidebar_open', String(leftSidebarOpen));
  }, [leftSidebarOpen]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const { selectedModel } = useModel();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { setOpen: setSidebarOpen } = useSidebarSafe();
  const { addWordsUsed, isLimitExceeded } = useAIUsage();
  const { toast } = useToast();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    currentSessionId,
    isSaving,
    createSession,
    updateMessages,
    loadSession,
    clearSession,
    setCurrentSessionId,
  } = useChatPersistence();

  // Only show ChatHeader on root page (public), not on /new-chat (authenticated)
  const isPublicPage = location.pathname === "/";

  // Check if we should persist (authenticated users on /new-chat only)
  const shouldPersist = !isPublicPage && !!user;

  // Selected items state
  const [selectedBills, setSelectedBills] = useState<BillCitation[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [selectedCommittees, setSelectedCommittees] = useState<any[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [billsDialogOpen, setBillsDialogOpen] = useState(false);
  const [billsSearch, setBillsSearch] = useState("");
  const [availableBills, setAvailableBills] = useState<BillCitation[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [membersSearch, setMembersSearch] = useState("");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [committeesDialogOpen, setCommitteesDialogOpen] = useState(false);
  const [committeesSearch, setCommitteesSearch] = useState("");
  const [availableCommittees, setAvailableCommittees] = useState<any[]>([]);
  const [committeesLoading, setCommitteesLoading] = useState(false);

  const [contractsDialogOpen, setContractsDialogOpen] = useState(false);
  const [contractsSearch, setContractsSearch] = useState("");
  const [availableContracts, setAvailableContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);

  // Lazy-load: track whether more data is available per category
  const [membersHasMore, setMembersHasMore] = useState(true);
  const [committeesHasMore, setCommitteesHasMore] = useState(true);
  const [billsHasMore, setBillsHasMore] = useState(true);
  const [contractsHasMore, setContractsHasMore] = useState(true);

  // Sample prompts state (for lightbulb dropdown)
  const [promptsDropdownOpen, setPromptsDropdownOpen] = useState(false);

  // Close all popovers
  const closeAllPopovers = () => {
    setPromptsDropdownOpen(false);
    setMembersDialogOpen(false);
    setCommitteesDialogOpen(false);
    setBillsDialogOpen(false);
    setContractsDialogOpen(false);
  };

  // Mutual exclusion: only one popover open at a time
  const openPopover = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    closeAllPopovers();
    setter(true);
  };

  // Lazy-load scroll handler: fires loadMore when near the bottom
  const handlePopoverScroll = (
    e: React.UIEvent<HTMLDivElement>,
    loadMore: () => void,
    hasMore: boolean,
    isLoading: boolean,
  ) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && hasMore && !isLoading) {
      loadMore();
    }
  };

  // Policy sample prompts - hardcoded
  const samplePrompts = [
    { title: "How to Draft a Bill", prompt: "What are the essential components and best practices for drafting a legislative bill in New York State? Include guidance on formatting, required sections, and how to structure the findings, purpose, and operative provisions." },
    { title: "Policy Analysis Framework", prompt: "What framework should I use to analyze the potential impact of a proposed policy change?" },
    { title: "Stakeholder Mapping", prompt: "How do I identify and map stakeholders who would be affected by a new housing policy?" },
    { title: "Evidence-Based Policy", prompt: "What does evidence-based policymaking look like and how can I apply it to education reform?" },
    { title: "Policy Implementation", prompt: "What are the key factors that determine whether a policy will be successfully implemented?" },
    { title: "Regulatory Impact Assessment", prompt: "How do I conduct a regulatory impact assessment for a proposed environmental regulation?" },
    { title: "Cost-Benefit Analysis", prompt: "How do I perform a cost-benefit analysis for a proposed public health initiative?" },
    { title: "Unintended Consequences", prompt: "How can I anticipate and mitigate unintended consequences when designing new policies?" },
    { title: "Policy Memo Writing", prompt: "What's the best structure for writing a policy memo that will be read by busy decision-makers?" },
    { title: "Building Coalition Support", prompt: "How do I build a coalition of support for a policy initiative across different interest groups?" },
    { title: "Policy Window Timing", prompt: "How do I recognize when a policy window is opening and how to take advantage of it?" },
    { title: "Comparative Policy Analysis", prompt: "How can I learn from how other states have addressed similar policy challenges?" },
    { title: "Public Comment Strategy", prompt: "What's the most effective way to participate in a public comment period for proposed regulations?" },
    { title: "Fiscal Impact Analysis", prompt: "How do I estimate the fiscal impact of a proposed policy on state and local budgets?" },
    { title: "Equity Impact Assessment", prompt: "How do I assess whether a policy will have equitable outcomes across different communities?" },
    { title: "Policy Brief Development", prompt: "How do I write a compelling policy brief that translates research into actionable recommendations?" },
    { title: "Advocacy Campaign Planning", prompt: "What are the key elements of an effective policy advocacy campaign?" },
    { title: "Data-Driven Advocacy", prompt: "How can I use data effectively to support my policy arguments and recommendations?" },
    { title: "Policy Feedback Loops", prompt: "How do I design policies with built-in feedback mechanisms for continuous improvement?" },
  ];

  // Check if user is at the bottom of scroll container
  const checkIfAtBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const threshold = 100; // pixels from bottom to consider "at bottom"
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    return isAtBottom;
  };

  // Handle scroll events to show/hide scroll button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = checkIfAtBottom();
      setShowScrollButton(!isAtBottom);

      // Track if user manually scrolled up (not at bottom during streaming)
      if (!isAtBottom && isTyping) {
        userScrolledRef.current = true;
      }

      // Reset user scrolled flag when they reach bottom
      if (isAtBottom) {
        userScrolledRef.current = false;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isTyping]);

  // Auto-scroll to bottom (only if user hasn't scrolled up)
  useEffect(() => {
    // Don't auto-scroll if user has manually scrolled up
    if (userScrolledRef.current) return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom function for the button
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    userScrolledRef.current = false;
    setShowScrollButton(false);
  };


  // Handle "Ask NYSgpt" popup click - inject selected text into query
  const handleAskNYSgpt = (selectedText: string) => {
    if (selectedText) {
      // Inject as a quoted reference
      const newQuery = query
        ? `${query}\n\n"${selectedText}"`
        : `"${selectedText}"`;
      setQuery(newQuery);

      // Focus the textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  // Track if we've already auto-submitted the prompt
  const hasAutoSubmittedRef = useRef(false);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);

  // Track if the current message is a "What is NYSgpt?" prompt (for disclaimer)
  const isNYSgptPromptRef = useRef(false);

  // Track previous session ID to detect navigation to /new-chat
  const prevSessionIdRef = useRef<string | undefined>(routeSessionId);

  // Reset state when navigating from a chat to /new-chat
  useEffect(() => {
    const prevSessionId = prevSessionIdRef.current;
    prevSessionIdRef.current = routeSessionId;

    // If we had a session ID before and now we don't (navigated to /new-chat)
    // AND we have chat content to clear, reset the state
    if (prevSessionId && !routeSessionId && chatStarted) {
      console.log('[NewChat] Detected navigation to /new-chat, resetting state');
      // Stop any ongoing streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
      // Reset chat state
      setMessages([]);
      setQuery("");
      setChatStarted(false);
      setIsTyping(false);
      // Reset scroll state
      setShowScrollButton(false);
      userScrolledRef.current = false;
      // Reset selected items
      setSelectedBills([]);
      setSelectedMembers([]);
      setSelectedCommittees([]);
      setAttachedFiles([]);
      // Clear persisted session
      clearSession();
      // Reset auto-submit ref so new prompts can trigger
      hasAutoSubmittedRef.current = false;
    }
  }, [routeSessionId, chatStarted, clearSession]);

  // Load existing session from URL (e.g., /c/abc123 or /new-chat?session=abc123)
  useEffect(() => {
    // Prefer route param (/c/:sessionId), fallback to query param (?session=)
    const sessionId = routeSessionId || searchParams.get('session');
    console.log('[NewChat] Session load check - sessionId:', sessionId, 'shouldPersist:', shouldPersist, 'currentSessionId:', currentSessionId);
    if (sessionId && shouldPersist && sessionId !== currentSessionId) {
      // Reset state before loading new session
      setMessages([]);
      setChatStarted(false);
      setIsTyping(false);

      loadSession(sessionId).then((sessionData) => {
        if (sessionData && sessionData.messages.length > 0) {
          // Convert persisted messages to our Message format, including citations metadata
          const loadedMessages: Message[] = sessionData.messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            // Restore citations metadata for assistant messages
            ...(msg.citations && { citations: msg.citations }),
            ...(msg.relatedBills && { relatedBills: msg.relatedBills }),
            ...(msg.schoolFundingData && { schoolFundingData: msg.schoolFundingData }),
            ...(msg.feedback !== undefined && { feedback: msg.feedback }),
            ...(msg.promptLog && { promptLog: msg.promptLog }),
          }));
          setMessages(loadedMessages);
          setChatStarted(true);
          console.log('[NewChat] Loaded session with', loadedMessages.length, 'messages');
        }
      });
    }
  }, [routeSessionId, searchParams, shouldPersist, currentSessionId, loadSession]);

  // Auto-submit prompt from URL parameter
  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    const contextParam = searchParams.get('context'); // Hidden context for AI
    const sessionId = routeSessionId || searchParams.get('session');

    // Redirect authenticated users from public / to /new-chat so session persists
    if (promptParam && user && isPublicPage) {
      const params = new URLSearchParams();
      params.set('prompt', promptParam);
      if (contextParam) params.set('context', contextParam);
      navigate(`/new-chat?${params.toString()}`, { replace: true });
      return;
    }

    // Only auto-submit once, and only if we have a prompt and haven't started a chat yet
    if (promptParam && !hasAutoSubmittedRef.current && !chatStarted && !isTyping) {
      console.log('[NewChat] Auto-submitting prompt:', promptParam, 'with context:', contextParam ? 'yes' : 'no');
      hasAutoSubmittedRef.current = true;
      setAutoSubmitPending(true);

      // Collapse the sidebar when auto-submitting from AI Chat button
      setSidebarOpen(false);

      // If we have a session ID, set it first
      if (sessionId) {
        setCurrentSessionId(sessionId);
      }

      // Small delay to ensure everything is ready
      setTimeout(async () => {
        let finalContext = contextParam || undefined;

        // If context contains a fetchUrl: prefix, fetch the URL content server-side
        if (finalContext?.startsWith('fetchUrl:')) {
          const url = finalContext.slice('fetchUrl:'.length).trim();
          console.log('[NewChat] Fetching URL content for context:', url);
          try {
            const supabaseUrl = (supabase as any).supabaseUrl;
            const supabaseKey = (supabase as any).supabaseKey;
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const res = await fetch(`${supabaseUrl}/functions/v1/fetch-url-content`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authSession?.access_token || supabaseKey}`,
                apikey: supabaseKey,
              },
              body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (data.content) {
              const articleTitle = data.title || new URL(url).hostname.replace('www.', '');
              finalContext = `You are summarizing a news article. Provide a detailed, structured summary organized by topic sections (e.g. "NYC COUNCIL LEADERSHIP:", "POLITICAL STRATEGY:", "AFFORDABILITY & HOUSING:", etc.). For each section, include specific names, dollar amounts, and key details from the article. Bold all proper names of people (e.g. **Julie Menin**, **Governor Hochul**, **Rick Cotton**). End with: Source: [${articleTitle}](${url})\n\nArticle content:\n${data.content}`;
            }
          } catch (err) {
            console.error('[NewChat] Failed to fetch URL content:', err);
          }
        }

        setAutoSubmitPending(false);
        handleSubmit(null, promptParam, finalContext);
        // Clear the prompt from URL to prevent re-submission on refresh
        navigate(location.pathname, { replace: true });
      }, 200);
    }
  }, [searchParams, chatStarted, isTyping, routeSessionId, setSidebarOpen, user, isPublicPage, navigate]);

  // Handle new chat - reset all state
  const handleNewChat = () => {
    // Stop any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    // Reset chat state
    setMessages([]);
    setQuery("");
    setChatStarted(false);
    setIsTyping(false);
    // Reset scroll state
    setShowScrollButton(false);
    userScrolledRef.current = false;
    // Reset selected items
    setSelectedBills([]);
    setSelectedMembers([]);
    setSelectedCommittees([]);
    setAttachedFiles([]);
    // Clear persisted session so new messages create a new session
    clearSession();
  };

  // Handle "What is NYSgpt?" prompt from heart icon click
  const handleWhatIsNYSgpt = () => {
    // Reset state first (like starting a new chat)
    handleNewChat();
    // Mark this as a special NYSgpt prompt so we can append the disclaimer
    isNYSgptPromptRef.current = true;
    // Small delay to ensure state is reset, then submit the prompt with NYSgpt context
    setTimeout(() => {
      handleSubmit(null, "What is NYSgpt?", NYSGPT_CONTEXT);
    }, 100);
  };

  // Stop streaming function
  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    setIsTyping(false);
  };

  // Fetch bills for dialog (supports lazy-load via offset)
  const fetchBillsForSelection = async (offset = 0) => {
    setBillsLoading(true);
    try {
      const { data, error } = await supabase
        .from("Bills")
        .select("bill_id, bill_number, title, status_desc, description, committee, session_id")
        .order("bill_number", { ascending: true })
        .range(offset, offset + 29);

      if (error) throw error;
      const rows = (data || []) as BillCitation[];

      // Fetch primary sponsors for these bills
      if (rows.length > 0) {
        const billIds = rows.map(r => r.bill_id).filter(Boolean) as number[];
        if (billIds.length > 0) {
          const { data: sponsorsData } = await supabase
            .from('Sponsors')
            .select('bill_id, people_id, position')
            .in('bill_id', billIds)
            .eq('position', 1);

          if (sponsorsData && sponsorsData.length > 0) {
            const peopleIds = [...new Set(sponsorsData.map(s => s.people_id).filter(Boolean))];
            const { data: peopleData } = await supabase
              .from('People')
              .select('people_id, name')
              .in('people_id', peopleIds);

            const peopleMap = new Map((peopleData || []).map(p => [p.people_id, p.name]));
            const sponsorMap = new Map(sponsorsData.map(s => [s.bill_id, peopleMap.get(s.people_id) || null]));

            rows.forEach(row => {
              row.sponsor_name = sponsorMap.get(row.bill_id!) || undefined;
            });
          }
        }
      }

      if (offset === 0) {
        setAvailableBills(rows);
      } else {
        setAvailableBills(prev => [...prev, ...rows]);
      }
      setBillsHasMore(rows.length === 30);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setBillsLoading(false);
    }
  };

  // Pre-load bills, members, and committees on mount so pills open instantly
  useEffect(() => {
    fetchBillsForSelection();
    fetchMembersForSelection();
    fetchCommitteesForSelection();
  }, []);

  // Load bills when dialog opens (fallback if not already loaded)
  useEffect(() => {
    if (billsDialogOpen && availableBills.length === 0) {
      fetchBillsForSelection();
    }
  }, [billsDialogOpen]);

  // Fetch members for dialog (supports lazy-load via offset)
  const fetchMembersForSelection = async (offset = 0) => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from("People")
        .select("people_id, name, party, chamber, district")
        .order("name", { ascending: true })
        .range(offset, offset + 29);

      if (error) throw error;
      const rows = data || [];
      if (offset === 0) {
        setAvailableMembers(rows);
      } else {
        setAvailableMembers(prev => [...prev, ...rows]);
      }
      setMembersHasMore(rows.length === 30);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setMembersLoading(false);
    }
  };

  // Load members when dialog opens
  useEffect(() => {
    if (membersDialogOpen && availableMembers.length === 0) {
      fetchMembersForSelection();
    }
  }, [membersDialogOpen]);

  // Fetch committees for dialog (supports lazy-load via offset)
  const fetchCommitteesForSelection = async (offset = 0) => {
    setCommitteesLoading(true);
    try {
      const { data, error } = await supabase
        .from("Committees")
        .select("committee_id, committee_name, chamber, chair_name, committee_members")
        .order("committee_name", { ascending: true })
        .range(offset, offset + 29);

      if (error) throw error;
      const rows = data || [];
      if (offset === 0) {
        setAvailableCommittees(rows);
      } else {
        setAvailableCommittees(prev => [...prev, ...rows]);
      }
      setCommitteesHasMore(rows.length === 30);
    } catch (error) {
      console.error("Error fetching committees:", error);
    } finally {
      setCommitteesLoading(false);
    }
  };

  // Load committees when dialog opens
  useEffect(() => {
    if (committeesDialogOpen && availableCommittees.length === 0) {
      fetchCommitteesForSelection();
    }
  }, [committeesDialogOpen]);

  // Fetch contracts for dialog (supports lazy-load via offset)
  const fetchContractsForSelection = async (offset = 0) => {
    setContractsLoading(true);
    try {
      const { data, error } = await supabase
        .from("Contracts")
        .select("*")
        .order("current_contract_amount", { ascending: false, nullsFirst: false })
        .range(offset, offset + 29);

      if (error) {
        console.error("Error fetching contracts:", error);
        throw error;
      }
      const rows = (data as Contract[]) || [];
      if (offset === 0) {
        setAvailableContracts(rows);
      } else {
        setAvailableContracts(prev => [...prev, ...rows]);
      }
      setContractsHasMore(rows.length === 30);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setContractsLoading(false);
    }
  };

  // Load contracts when dialog opens
  useEffect(() => {
    if (contractsDialogOpen && availableContracts.length === 0) {
      fetchContractsForSelection();
    }
  }, [contractsDialogOpen]);

  // Lobbying data for mobile drawer
  const [mobileDrawerLobbyists, setMobileDrawerLobbyists] = useState<any[]>([]);
  const [mobileDrawerLoading, setMobileDrawerLoading] = useState(false);

  // Fetch data when mobile drawer category opens
  useEffect(() => {
    if (!mobileDrawerCategory) return;
    if (mobileDrawerCategory === 'bills' && availableBills.length === 0) fetchBillsForSelection();
    if (mobileDrawerCategory === 'members' && availableMembers.length === 0) fetchMembersForSelection();
    if (mobileDrawerCategory === 'committees' && availableCommittees.length === 0) fetchCommitteesForSelection();
    if (mobileDrawerCategory === 'contracts' && availableContracts.length === 0) fetchContractsForSelection();
    if (mobileDrawerCategory === 'lobbying' && mobileDrawerLobbyists.length === 0) {
      setMobileDrawerLoading(true);
      supabase
        .from('lobbyists')
        .select('id, name, type_of_lobbyist')
        .order('name', { ascending: true })
        .limit(50)
        .then(({ data }) => {
          setMobileDrawerLobbyists(data || []);
          setMobileDrawerLoading(false);
        });
    }
  }, [mobileDrawerCategory]);

  // Note: Real streaming is now handled by the edge functions
  // The fake client-side streaming has been removed for better performance

  // Fetch full bill data from NYS Legislature API
  const fetchFullBillData = async (billNumber: string, sessionYear: number = 2025) => {
    try {
      // Call NYS API edge function to get full bill details
      const { data, error } = await supabase.functions.invoke('nys-legislation-search', {
        body: {
          action: 'get-bill-detail',
          billNumber: billNumber,
          sessionYear: sessionYear
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching full bill data for ${billNumber}:`, error);
      return null;
    }
  };

  // Fetch relevant bills from database to use as citations
  const fetchRelevantBills = async (query: string): Promise<BillCitation[]> => {
    try {
      // Extract bill numbers (e.g., A00405, S256, K123, etc.)
      const billNumberPattern = /[ASK]\d{3,}/gi;
      const billNumbers = query.match(billNumberPattern) || [];

      // If specific bill numbers are mentioned, fetch those first
      if (billNumbers.length > 0) {
        const { data: exactBills, error } = await supabase
          .from("Bills")
          .select("bill_number, title, status_desc, description, committee, session_id")
          .in("bill_number", billNumbers.map(b => normalizeBillNumber(b)))
          .limit(5);

        if (error) throw error;

        // If we found the exact bills, return them
        if (exactBills && exactBills.length > 0) {
          return exactBills;
        }
      }

      // Otherwise, extract keywords and search by content
      // Remove common words and extract meaningful keywords
      const stopWords = ['how', 'would', 'does', 'what', 'the', 'is', 'in', 'to', 'for', 'by', 'and', 'or', 'of', 'a', 'an'];
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word))
        .slice(0, 5); // Take top 5 keywords

      if (keywords.length > 0) {
        // Build search conditions for keywords
        const keywordSearches = keywords.map(kw =>
          `title.ilike.%${kw}%,description.ilike.%${kw}%`
        ).join(',');

        const { data, error } = await supabase
          .from("Bills")
          .select("bill_number, title, status_desc, description, committee, session_id")
          .or(keywordSearches)
          .limit(5);

        if (error) throw error;
        return data || [];
      }

      return [];
    } catch (error) {
      console.error("Error fetching bills:", error);
      return [];
    }
  };

  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
    handleSubmit(null, prompt);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const readFileAsText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFeedback = useCallback(async (messageId: string, feedbackValue: 'good' | 'bad' | null) => {
    // Update local state
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: feedbackValue } : m
    ));

    // Persist to DB if we have an active session
    if (shouldPersist && currentSessionId) {
      const updatedMessages = messages.map(m =>
        m.id === messageId ? { ...m, feedback: feedbackValue } : m
      );
      const persistedMessages = updatedMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
        ...(m.role === 'assistant' && m.citations && {
          citations: m.citations,
          relatedBills: m.relatedBills,
        }),
        ...(m.schoolFundingData && { schoolFundingData: m.schoolFundingData }),
        ...(m.feedback !== undefined && { feedback: m.feedback }),
        ...(m.promptLog && { promptLog: m.promptLog }),
      }));
      // Apply the feedback update to the persisted copy too
      const finalMessages = persistedMessages.map(m =>
        m.id === messageId ? { ...m, feedback: feedbackValue } : m
      );
      await updateMessages(currentSessionId, finalMessages);
    }
  }, [messages, shouldPersist, currentSessionId, updateMessages]);

  const handleSubmit = async (e: React.FormEvent | null, promptText?: string, systemContext?: string) => {
    if (e) e.preventDefault();

    // Check if daily word limit is exceeded
    if (isLimitExceeded) {
      trackEvent('daily_limit_reached');
      toast({
        title: "Daily limit reached",
        description: "You've reached your daily AI word limit. Upgrade your plan for more words.",
        variant: "destructive"
      });
      return;
    }

    let userQuery = promptText || query.trim();

    // Process attached files
    let fileContext = '';
    if (attachedFiles.length > 0) {
      fileContext = '\n\n--- Attached Files ---\n';
      for (const file of attachedFiles) {
        try {
          // Only read text files, PDFs and images need special handling
          if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
            const content = await readFileAsText(file);
            fileContext += `\nFile: ${file.name}\nContent:\n${content}\n---\n`;
          } else {
            // For other file types, just mention them
            fileContext += `\nFile: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)} KB)\n`;
            fileContext += `Note: This file type requires processing. Please describe what you'd like to know about this file.\n---\n`;
          }
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error);
          fileContext += `\nFile: ${file.name} (Could not read file)\n---\n`;
        }
      }

      // Append file context to user query
      userQuery += fileContext;
    }

    // Auto-generate prompt if no text but items are selected
    // Uses shared prompt builders so all entry points produce identical prompts
    if (!userQuery && (selectedMembers.length > 0 || selectedBills.length > 0 || selectedCommittees.length > 0 || selectedContracts.length > 0)) {
      const promptParts: string[] = [];

      if (selectedMembers.length > 0) {
        if (selectedMembers.length === 1) {
          promptParts.push(buildMemberPrompt(selectedMembers[0]));
        } else {
          const memberNames = selectedMembers.map((m: any) => m.name).join(", ");
          promptParts.push(`Tell me about legislators ${memberNames}, including their legislative record, sponsored bills, and committee work`);
        }
      }

      if (selectedBills.length > 0) {
        if (selectedBills.length === 1) {
          promptParts.push(buildBillPrompt(selectedBills[0]));
        } else {
          const billNumbers = selectedBills.map(b => b.bill_number).join(", ");
          promptParts.push(`Tell me about bills ${billNumbers}, including their status, sponsors, and details`);
        }
      }

      if (selectedCommittees.length > 0) {
        if (selectedCommittees.length === 1) {
          promptParts.push(buildCommitteePrompt(selectedCommittees[0]));
        } else {
          const committeeNames = selectedCommittees.map((c: any) => c.committee_name).join(", ");
          promptParts.push(`Tell me about the ${committeeNames} committees, including focus areas and current bills`);
        }
      }

      if (selectedContracts.length > 0) {
        if (selectedContracts.length === 1) {
          const contract = selectedContracts[0];
          const vendor = contract.vendor_name || 'Unknown vendor';
          const dept = contract.department_facility ? ` (${contract.department_facility})` : '';
          const amount = contract.current_contract_amount
            ? ` valued at ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(contract.current_contract_amount)}`
            : '';
          const desc = contract.contract_description ? ` Description: "${contract.contract_description}".` : '';
          promptParts.push(`Tell me about the contract with ${vendor}${dept}${amount}.${desc} What are the contract details, spending status, and related contracts?`);
        } else {
          const vendorNames = selectedContracts.map(c => c.vendor_name || 'Unknown vendor').join(", ");
          promptParts.push(`Tell me about contracts with ${vendorNames}, including contract details, amounts, and department information`);
        }
      }

      userQuery = promptParts.join(". Also, ");
    }

    if (!userQuery) return;

    // Start chat interface
    setChatStarted(true);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userQuery,
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    // Reset textarea height after clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
    // Clear selected items after submission
    setSelectedMembers([]);
    setSelectedBills([]);
    setSelectedCommittees([]);
    setSelectedContracts([]);
    setAttachedFiles([]);
    setIsTyping(true);

    // Persistence: Create session on first message (authenticated only)
    let sessionId = currentSessionId;
    console.log('[NewChat] Persistence check - shouldPersist:', shouldPersist, 'currentSessionId:', currentSessionId, 'user:', !!user);
    if (shouldPersist && !sessionId) {
      // Generate title from first user message (truncate to ~50 chars)
      const title = userQuery.length > 50
        ? userQuery.substring(0, 50) + '...'
        : userQuery;

      // Check for billId, committeeId, or memberId in URL params to link chat
      const billIdParam = searchParams.get('billId');
      const committeeIdParam = searchParams.get('committeeId');
      const memberIdParam = searchParams.get('memberId');
      const context = (billIdParam || committeeIdParam || memberIdParam) ? {
        bill_id: billIdParam ? parseInt(billIdParam, 10) : undefined,
        committee_id: committeeIdParam ? parseInt(committeeIdParam, 10) : undefined,
        member_id: memberIdParam ? parseInt(memberIdParam, 10) : undefined,
      } : undefined;

      sessionId = await createSession(title, [{
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        timestamp: new Date().toISOString(),
      }], context);
      console.log('[NewChat] Created new session:', sessionId, 'with bill_id:', billIdParam, 'committee_id:', committeeIdParam, 'member_id:', memberIdParam);

      // Update URL to include session ID (like ChatGPT's /c/id pattern)
      if (sessionId) {
        // Refresh sidebar to show the new chat (dispatch event for sibling component)
        window.dispatchEvent(new CustomEvent('refresh-sidebar-chats'));
        navigate(`/c/${sessionId}`, { replace: true });
      }
    } else if (shouldPersist && sessionId) {
      // Update existing session with new user message
      const allMessages = [...messages, userMessage];
      const persistedMessages = allMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
        ...(m.schoolFundingData && { schoolFundingData: m.schoolFundingData }),
        ...(m.feedback !== undefined && { feedback: m.feedback }),
        ...(m.promptLog && { promptLog: m.promptLog }),
      }));
      await updateMessages(sessionId, persistedMessages);
    }

    // INSTANT FEEDBACK: Create and show assistant message immediately (0ms delay)
    const messageId = `assistant-${Date.now()}`;

    // Check for school funding data in sessionStorage
    const schoolFundingData = consumeSchoolFundingData();

    // Check if this is a contract-related chat (via URL prompt prefix or selected contracts)
    const isContractChat = selectedContracts.length > 0 || userQuery.startsWith('[Contract:');

    const streamingMessage: Message = {
      id: messageId,
      role: "assistant",
      content: "",
      isStreaming: true,
      streamedContent: "",
      searchQueries: isContractChat
        ? [
            `Analyzing "${userQuery.substring(0, 60)}${userQuery.length > 60 ? '...' : ''}"`,
            `Searching NYS Contracts`,
          ]
        : [
            `Analyzing "${userQuery.substring(0, 60)}${userQuery.length > 60 ? '...' : ''}" in NY State Legislature`,
            `Searching NY State Bills Database`,
          ],
      thinkingPhrase: getNextThinkingPhrase(),
      schoolFundingData,
      isContractChat,
    };
    setMessages(prev => [...prev, streamingMessage]);

    try {
      // Determine which edge function to call based on model
      const isPerplexityModel = selectedModel.includes('sonar');
      const edgeFunction = getEdgeFunctionName(selectedModel);

      // Get Supabase URL from the client (avoids env var issues)
      const supabaseUrl = supabase.supabaseUrl;
      const { data: { session } } = await supabase.auth.getSession();

      // Build composed system context for special chat modes
      let composedSystemContext = systemContext || composeSystemPrompt({ entityType: 'standalone' });

      if (isContractChat) {
        try {
          // Get contract number from selected contracts (icon picker) or from [Contract:] pattern (URL flow)
          const contractNumber =
            selectedContracts[0]?.contract_number ||
            userQuery.match(/\[Contract:([^\]]+)\]/)?.[1];
          if (contractNumber) {
            const dataContext = await buildContractContext(contractNumber);
            if (dataContext) {
              composedSystemContext = composeSystemPrompt({
                entityType: 'contract',
                entityName: selectedContracts[0]?.vendor_name,
                dataContext,
                scope: 'vendor',
              });
            }
          }
        } catch (err) {
          console.error('Error fetching contract context:', err);
        }
      } else if (schoolFundingData) {
        try {
          composedSystemContext = composeSystemPrompt({
            entityType: 'schoolFunding',
            entityName: schoolFundingData.district,
            dataContext: buildSchoolFundingContext(schoolFundingData),
          });
        } catch (err) {
          console.error('Error building school funding context:', err);
        }
      } else if (!systemContext) {
        // For pill/badge selections, compose entity-specific system context
        // (selectedX closures still hold pre-clear values since setState is async)
        if (selectedBills.length > 0) {
          composedSystemContext = composeSystemPrompt({
            entityType: 'bill',
            entityName: selectedBills[0].bill_number,
          });
        } else if (selectedMembers.length > 0) {
          composedSystemContext = composeSystemPrompt({
            entityType: 'member',
            entityName: selectedMembers[0].name,
          });
        } else if (selectedCommittees.length > 0) {
          const c = selectedCommittees[0];
          const prefix = c.chamber === 'Senate' ? 'Senate ' : c.chamber === 'Assembly' ? 'Assembly ' : '';
          composedSystemContext = composeSystemPrompt({
            entityType: 'committee',
            entityName: `${prefix}${c.committee_name || ''}`.trim(),
            dataContext: formatCommitteeMembers(c),
          });
        }
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Disable streaming for Perplexity models (their streaming has quality issues)
      const useStreaming = !isPerplexityModel;

      // Call edge function (edge function handles all data fetching)
      const response = await fetch(`${supabaseUrl}/functions/v1/${edgeFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify({
          prompt: userQuery,
          type: 'chat',
          stream: useStreaming,
          model: selectedModel,
          context: {
            previousMessages: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            })),
            systemContext: composedSystemContext
          }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Edge function error: ${response.status}`);
      }

      let aiResponse = '';

      if (useStreaming && response.body) {
        const reader = response.body.getReader();
        readerRef.current = reader;

        aiResponse = await parseSSEStream(reader, (_chunk, accumulated) => {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, streamedContent: accumulated }
              : msg
          ));
        });

        readerRef.current = null;
      } else {
        // Non-streaming response (Perplexity models)
        const data = await response.json();
        aiResponse = extractNonStreamingContent(data);

        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, streamedContent: aiResponse, isStreaming: false }
            : msg
        ));
      }

      if (!aiResponse) {
        aiResponse = 'I apologize, but I encountered an error. Please try again.';
      }

      // Append disclaimer for "What is NYSgpt?" prompt
      if (isNYSgptPromptRef.current && aiResponse) {
        aiResponse += '\n\nEvery bill analysis includes tools to email sponsors, generate letters, view official documents, and track your positions.\n\n*Answers will vary by user. 😉';
        isNYSgptPromptRef.current = false; // Reset for next message
      }

      // Extract Perplexity citations if this is a Perplexity response
      // Note: Perplexity returns citations in non-streaming responses, but for streaming
      // we only have the citation numbers [1], [2], etc. in the text
      let perplexityCitations: PerplexityCitation[] = [];
      if (isPerplexityModel && aiResponse) {
        const citationNumbers = extractCitationNumbers(aiResponse);
        perplexityCitations = citationNumbers.map(num => ({
          number: num,
          url: '',
          title: `Source ${num}`,
          excerpt: ''
        }));
        console.log('Extracted Perplexity citation numbers:', perplexityCitations);
      }

      // Extract bill numbers from user query AND AI response to fetch citations
      let responseCitations: BillCitation[] = [];
      const billPattern = /[ASJK]\d{3,}[A-Z]?/gi;
      const queryBillNumbers = userQuery.match(billPattern) || [];
      const responseBillNumbers = aiResponse ? (aiResponse.match(billPattern) || []) : [];
      const allBillNumbers = [...new Set([...queryBillNumbers, ...responseBillNumbers].map(b => normalizeBillNumber(b)))].filter(Boolean);

      if (allBillNumbers.length > 0) {
        try {
          const { data: mentionedBills, error } = await supabase
            .from("Bills")
            .select("bill_id, bill_number, title, status_desc, description, committee, session_id")
            .in("bill_number", allBillNumbers)
            .limit(10);

          if (!error && mentionedBills && mentionedBills.length > 0) {
            responseCitations = mentionedBills;
            console.log(`Found ${mentionedBills.length} bills mentioned in query/response`);

            // Fetch sponsor data for inline citation hover cards
            try {
              const billIds = mentionedBills.map(b => b.bill_id).filter(Boolean) as number[];
              if (billIds.length > 0) {
                const { data: sponsorsData } = await supabase
                  .from('Sponsors')
                  .select('bill_id, people_id, position')
                  .in('bill_id', billIds)
                  .eq('position', 1);

                if (sponsorsData && sponsorsData.length > 0) {
                  const peopleIds = [...new Set(sponsorsData.map(s => s.people_id).filter(Boolean))] as number[];
                  const { data: peopleData } = await supabase
                    .from('People')
                    .select('people_id, name, party, district, chamber')
                    .in('people_id', peopleIds);

                  if (peopleData) {
                    const peopleMap = new Map(peopleData.map(p => [p.people_id, p]));
                    const sponsorMap = new Map(sponsorsData.map(s => [s.bill_id, peopleMap.get(s.people_id!) || null]));

                    responseCitations = responseCitations.map(bill => {
                      const sponsor = sponsorMap.get(bill.bill_id!);
                      const committee = bill.committee;
                      // Generate committee slug from full committee name
                      // Committee names already include chamber prefix (e.g. "Senate Local Government")
                      const committeeSlug = committee
                        ? committee.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
                        : undefined;
                      return {
                        ...bill,
                        sponsor_name: sponsor?.name || undefined,
                        sponsor_party: sponsor?.party || undefined,
                        sponsor_district: sponsor?.district || undefined,
                        sponsor_chamber: sponsor?.chamber || undefined,
                        committee_slug: committeeSlug,
                      };
                    });
                  }
                }
              }
            } catch (sponsorError) {
              console.error("Error fetching sponsor data:", sponsorError);
              // Non-fatal: citations still work without sponsor data
            }
          }
        } catch (error) {
          console.error("Error fetching bills from query/response:", error);
        }
      }

      // Extract reasoning from Perplexity responses (if present in <think> tags)
      const { reasoning, mainContent } = isPerplexityModel
        ? extractReasoning(aiResponse)
        : { reasoning: null, mainContent: aiResponse };

      // Finalize the streaming message with all metadata
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              content: mainContent,
              isStreaming: false,
              streamedContent: mainContent,
              reviewedInfo: `Reviewed ${responseCitations.length} bills: ${
                responseCitations.length > 0
                  ? `Found relevant legislation including ${responseCitations[0]?.bill_number || 'pending bills'} related to your query.`
                  : 'No directly matching bills found, providing general legislative context.'
              }`,
              citations: responseCitations,
              perplexityCitations: isPerplexityModel ? perplexityCitations : undefined,
              isPerplexityResponse: isPerplexityModel,
              reasoning: reasoning || undefined,
              promptLog: composedSystemContext || undefined,
            }
          : msg
      ));

      // Track AI word usage
      if (aiResponse) {
        const wordCount = countWords(aiResponse);
        addWordsUsed(wordCount);
      }

      // Fetch related bills based on the first cited bill's committee (progressive loading)
      let relatedBillsResult: typeof responseCitations = [];
      if (responseCitations.length > 0) {
        const firstBill = responseCitations[0];
        if (firstBill.committee) {
          try {
            const { data: relatedBillsData, error: relatedError } = await supabase
              .from('Bills')
              .select('bill_number, title, status_desc, description, committee, session_id')
              .eq('committee', firstBill.committee)
              .neq('bill_number', firstBill.bill_number) // Exclude the cited bill itself
              .order('session_id', { ascending: false })
              .limit(5);

            if (!relatedError && relatedBillsData && relatedBillsData.length > 0) {
              console.log(`Found ${relatedBillsData.length} related bills from committee: ${firstBill.committee}`);
              relatedBillsResult = relatedBillsData;

              // Update message with related bills
              setMessages(prev => prev.map(msg =>
                msg.id === messageId
                  ? { ...msg, relatedBills: relatedBillsData }
                  : msg
              ));
            }
          } catch (err) {
            console.error('Error fetching related bills:', err);
          }
        }
      }

      setIsTyping(false);
      abortControllerRef.current = null;
      readerRef.current = null;

      // Persistence: Save assistant response with citations metadata (authenticated only)
      if (shouldPersist && sessionId && aiResponse) {
        // Get all messages including the new assistant response with metadata
        const allMessages = [...messages, userMessage, {
          id: messageId,
          role: "assistant" as const,
          content: aiResponse,
          citations: responseCitations,
          relatedBills: relatedBillsResult,
          schoolFundingData,
        }];
        const persistedMessages = allMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date().toISOString(),
          // Include citations metadata for assistant messages
          ...(m.role === 'assistant' && 'citations' in m && {
            citations: m.citations,
            relatedBills: m.relatedBills,
          }),
          ...('schoolFundingData' in m && m.schoolFundingData && { schoolFundingData: m.schoolFundingData }),
          ...('feedback' in m && m.feedback !== undefined && { feedback: m.feedback }),
          // Attach promptLog to assistant message for fine-tuning data
          ...(m.id === messageId && composedSystemContext && { promptLog: composedSystemContext }),
        }));
        await updateMessages(sessionId, persistedMessages);
        console.log('[NewChat] Saved assistant response to session:', sessionId);
      }

    } catch (error: any) {
      console.error('Error generating response:', error);

      // Don't show error message if it was an abort (user stopped the stream)
      if (error.name !== 'AbortError') {
        const errorMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I encountered an error generating a response. Please try again.",
        };

        setMessages(prev => [...prev, errorMessage]);
      }

      setIsTyping(false);
      abortControllerRef.current = null;
      readerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Left Sidebar - slides in from off-screen (authenticated pages + mobile public) */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-[60]",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {/* Backdrop overlay when sidebar is open (mobile only) */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 transition-opacity md:hidden"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Main Content Container - different structure for public vs authenticated */}
      <div className={cn("h-full", !isPublicPage && "md:p-2 bg-muted/30")}>
        {/* Inner container - rounded with border for authenticated pages */}
        <div className={cn(
          "h-full flex flex-col relative",
          !isPublicPage && "md:rounded-2xl md:border bg-background overflow-hidden"
        )}>
          {/* Header - ChatHeader for public, sidebar toggle + engine for authenticated */}
          {isPublicPage ? (
            <ChatHeader onNewChat={handleNewChat} onWhatIsNYSgpt={handleWhatIsNYSgpt} onOpenSidebar={() => setLeftSidebarOpen(true)} />
          ) : (
            <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
              {/* Left side: Logs button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLeftSidebarOpen(true)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors flex-shrink-0"
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
          )}

          {/* Scrollable Content Area */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "overflow-y-auto",
              isPublicPage
                ? "flex-1 pb-32 pt-14"
                : "absolute top-[57px] bottom-0 left-0 right-0 pb-40"
            )}
          >

        {!chatStarted ? (
          /* Initial State - show thinking shimmer during auto-submit, otherwise empty */
          autoSubmitPending ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground animate-pulse">NYSgpt is thinking.</p>
            </div>
          ) : (
            <div className="flex-1" />
          )
        ) : (
          /* Chat State - Messages */
          <div className="pt-8 pb-16 px-4">
            <div className="w-full max-w-[720px] mx-auto">
            {messages.map((message, index) => (
              <div key={message.id} className={`space-y-3 ${index > 0 && message.role === "user" ? "mt-[80px]" : index > 0 ? "mt-6" : ""}`}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-muted/40 rounded-lg p-4 border-0 max-w-[70%]">
                      <p className="text-base leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* School Aid Details Accordion - shown at top for school funding queries */}
                    {message.schoolFundingData && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem
                          value="school-aid-details"
                          className="border border-border rounded-lg"
                        >
                          <AccordionTrigger className="hover:no-underline px-4 py-3 text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span>School Aid Details</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                {message.schoolFundingData.district} • {message.schoolFundingData.budgetYear?.replace(' Enacted Budget', '')}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="overflow-x-auto overflow-y-auto max-h-[320px]">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-background">
                                  <tr className="border-b border-border/50">
                                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Aid Category</th>
                                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Base Year</th>
                                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">School Year</th>
                                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">% Change</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {message.schoolFundingData.categories.map((cat, idx) => {
                                    const pctNum = parseFloat(cat.percentChange?.replace('%', '') || '0');
                                    const isPositive = pctNum > 0;
                                    const isNegative = pctNum < 0;
                                    return (
                                      <tr key={idx} className="border-b border-border/30 last:border-0">
                                        <td className="py-2 pr-4">{cat.name}</td>
                                        <td className="py-2 px-4 text-right text-muted-foreground">${cat.baseYear}</td>
                                        <td className="py-2 px-4 text-right text-muted-foreground">${cat.schoolYear}</td>
                                        <td className={`py-2 pl-4 text-right font-medium ${
                                          isPositive ? 'text-green-600 dark:text-green-400' :
                                          isNegative ? 'text-red-600 dark:text-red-400' :
                                          'text-muted-foreground'
                                        }`}>
                                          {cat.percentChange}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Enhanced Searched and Reviewed Section with Process Content - hide for school funding */}
                    {(message.searchQueries || message.reviewedInfo) && !message.schoolFundingData && (() => {
                      // Check if this is a lobbying chat (has clients) - check both content sources
                      const contentToCheck = message.content || message.streamedContent || '';
                      const { clients } = parseClientsSection(contentToCheck);
                      const isLobbyingChat = clients.length > 0;

                      // Contract chats get Chain of Thought UI
                      if (message.isContractChat) {
                        return (
                          <ChainOfThought defaultOpen={false} className="border-2 border-dashed border-border/50 rounded-lg">
                            <ChainOfThoughtHeader />
                            <ChainOfThoughtContent>
                              {/* Analyzing Contract Step */}
                              <ChainOfThoughtStep
                                icon={Wallet}
                                label="Analyzing contract details"
                                status={message.isStreaming ? "active" : "complete"}
                              />

                              {/* Searching Step */}
                              {message.searchQueries && (
                                <ChainOfThoughtStep
                                  icon={SearchIcon}
                                  label="Searching databases"
                                  status={message.isStreaming ? "active" : "complete"}
                                >
                                  <ChainOfThoughtSearchResults>
                                    {message.searchQueries.map((query, idx) => (
                                      <ChainOfThoughtSearchResult key={idx}>
                                        {query.length > 40 ? query.substring(0, 40) + '...' : query}
                                      </ChainOfThoughtSearchResult>
                                    ))}
                                  </ChainOfThoughtSearchResults>
                                </ChainOfThoughtStep>
                              )}

                              {/* Reviewing Sources Step */}
                              {message.reviewedInfo && !message.isStreaming && (
                                <ChainOfThoughtStep
                                  icon={FileText}
                                  label={`Reviewed ${message.citations?.length || 0} sources`}
                                  status="complete"
                                />
                              )}
                            </ChainOfThoughtContent>
                          </ChainOfThought>
                        );
                      }

                      // Perplexity/Sonar responses: Show Reasoning ONLY during streaming, hide entirely when done
                      if (message.isPerplexityResponse) {
                        if (message.isStreaming) {
                          return (
                            <Reasoning
                              isStreaming={true}
                              defaultOpen={true}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>
                                <p className="text-sm text-muted-foreground">Searching the web...</p>
                              </ReasoningContent>
                            </Reasoning>
                          );
                        }
                        // When not streaming, show nothing for Perplexity
                        return null;
                      }

                      // Lobbying chats get special UI with clients list
                      if (isLobbyingChat) {
                        return (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem
                              value="sources"
                              className="border-0 relative before:absolute before:inset-0 before:rounded-lg before:border-2 before:border-dashed before:border-border/50 data-[state=open]:before:border-border/70 before:transition-colors before:duration-300"
                            >
                              <div className="relative p-0.5">
                                <AccordionTrigger className="hover:no-underline px-4 py-2.5 rounded-t-lg text-xs font-medium">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <HandCoins className="h-3.5 w-3.5" />
                                    <span>Clients · {clients.length}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-3 space-y-2">
                                  <ScrollArea className="h-[200px]">
                                    <div className="space-y-1.5 pr-4">
                                      {clients.map((client, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                                          <HandCoins className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/70" />
                                          <span className="leading-relaxed">{client}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </AccordionContent>
                              </div>
                            </AccordionItem>
                          </Accordion>
                        );
                      }

                      // All other chats get the Reasoning component with evergreen content
                      const reasoningSteps = [
                        "Let me analyze this question carefully.",
                        "\n\nSearching our legislative database for relevant information.",
                        "\n\nCross-referencing with official NY State sources.",
                        "\n\nFormulating a comprehensive response based on my findings."
                      ];

                      // Collapse reasoning when actual content starts streaming
                      const hasContent = (message.content?.length || 0) > 10 || (message.streamedContent?.length || 0) > 10;
                      const shouldBeOpen = message.isStreaming && !hasContent;

                      return (
                        <Reasoning
                          isStreaming={message.isStreaming}
                          open={shouldBeOpen}
                          defaultOpen={true}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>
                            <StreamingReasoningText
                              steps={reasoningSteps}
                              isStreaming={message.isStreaming && !hasContent}
                            />
                          </ReasoningContent>
                        </Reasoning>
                      );
                    })()}

                    {/* For streaming messages, show content directly */}
                    {message.isStreaming && (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {message.isPerplexityResponse ? (
                        <ChatMarkdown bills={message.citations}>{stripCitations(message.streamedContent || '')}</ChatMarkdown>
                      ) : (
                        (() => {
                          const streamContent = message.isStreaming ? message.streamedContent || '' : message.content;
                          const { cleanContent } = stripClientsSection(streamContent);
                          return <ChatMarkdown bills={message.citations}>{cleanContent}</ChatMarkdown>;
                        })()
                      )}
                        <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5">|</span>
                      </div>
                    )}

                    {/* Perplexity-style Tabbed Interface for all assistant messages */}
                    {message.role === 'assistant' && (
                      <ChatResponseFooter
                        isStreaming={message.isStreaming}
                        messageContent={
                          message.isPerplexityResponse ? (
                            <ChatMarkdown bills={message.citations}>{stripCitations(message.content)}</ChatMarkdown>
                          ) : (
                            (() => {
                              const { mainContent } = parseClientsSection(message.content);
                              return <ChatMarkdown bills={message.citations}>{mainContent}</ChatMarkdown>;
                            })()
                          )
                        }
                        bills={message.citations || []}
                        relatedBills={message.relatedBills || []}
                        sources={[
                          ...(message.perplexityCitations || []),
                          // Always include default sources
                          {
                            number: (message.perplexityCitations?.length || 0) + 1,
                            url: 'https://www.nysgpt.com',
                            title: 'NYSgpt - Legislative Policy Platform',
                            excerpt: 'AI-powered legislative research and policy analysis platform.'
                          },
                          {
                            number: (message.perplexityCitations?.length || 0) + 2,
                            url: 'https://nyassembly.gov/',
                            title: 'New York State Assembly',
                            excerpt: 'Official website of the New York State Assembly with bill tracking and legislative information.'
                          },
                          {
                            number: (message.perplexityCitations?.length || 0) + 3,
                            url: 'https://www.nysenate.gov/',
                            title: 'New York State Senate',
                            excerpt: 'Official website of the New York State Senate with comprehensive legislative data.'
                          },
                        ]}
                        onCitationClick={(num) => {
                          console.log('Citation clicked:', num);
                        }}
                        onSendMessage={(message) => handleSubmit(null, message)}
                        // Excerpt creation props
                        userMessage={
                          // Find the preceding user message for this assistant message
                          messages.slice(0, index).reverse().find(m => m.role === 'user')?.content
                        }
                        assistantMessageText={message.content}
                        parentSessionId={currentSessionId || undefined}
                        messageId={message.id}
                        feedback={message.feedback}
                        onFeedback={handleFeedback}
                        allMessages={messages.filter(m => !m.isStreaming).map(m => ({ role: m.role, content: m.content }))}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator - Only show before streaming starts */}
            {isTyping && !messages.some(msg => msg.isStreaming) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"></div>
                  <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full delay-75"></div>
                  <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full delay-150"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button - ChatGPT style */}
      {showScrollButton && chatStarted && (
        <button
          onClick={scrollToBottom}
          className={cn(
            "z-10 bg-background border border-border rounded-full p-2 shadow-lg hover:bg-muted transition-all duration-200 hover:shadow-xl",
            isPublicPage
              ? "fixed left-1/2 -translate-x-1/2 bottom-44"
              : "absolute left-1/2 -translate-x-1/2 bottom-28"
          )}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Bottom Input Area - centered when !chatStarted, bottom when chatStarted (all viewports) */}
      <div className={cn(
        // Centered when no chat started (all viewports), bottom when chatting
        !chatStarted && "fixed left-0 right-0 z-[5] top-[calc(50%+20px)] -translate-y-1/2",
        chatStarted && "fixed bottom-0 left-0 right-0 z-[5]",
        isPublicPage && chatStarted && "bg-background"
      )}>
        <div className={cn(
          "w-full px-4 py-4 pointer-events-auto",
          chatStarted && "max-w-[780px] mx-auto"
        )}>
          <div className={cn("max-w-[720px] mx-auto", chatStarted && !isPublicPage && "bg-background rounded-t-xl pt-3 px-3")}>
            <form onSubmit={handleSubmit} className="relative">
              {/* Larger input box - Fintool/Claude style */}
              <div className="rounded-2xl bg-[#fafafa] border-0 p-3 shadow-lg">
                {/* Selected Items Chips */}
                {(selectedBills.length > 0 || selectedMembers.length > 0 || selectedCommittees.length > 0 || selectedContracts.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedBills.map((bill) => (
                      <div
                        key={bill.bill_number}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{bill.bill_number}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBills(prev => prev.filter(b => b.bill_number !== bill.bill_number))}
                          className="hover:bg-primary/20 rounded-sm p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedMembers.map((member) => (
                      <div
                        key={member.people_id}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md text-xs font-medium"
                      >
                        <Users className="h-3 w-3" />
                        <span>{member.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMembers(prev => prev.filter(m => m.people_id !== member.people_id))}
                          className="hover:bg-green-500/20 rounded-sm p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedCommittees.map((committee) => (
                      <div
                        key={committee.committee_id}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-md text-xs font-medium"
                      >
                        <Building2 className="h-3 w-3" />
                        <span>{committee.committee_name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCommittees(prev => prev.filter(c => c.committee_id !== committee.committee_id))}
                          className="hover:bg-orange-500/20 rounded-sm p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedContracts.map((contract) => (
                      <div
                        key={contract.contract_number}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-md text-xs font-medium"
                      >
                        <Wallet className="h-3 w-3" />
                        <span>{contract.vendor_name || 'Contract'}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedContracts(prev => prev.filter(c => c.contract_number !== contract.contract_number))}
                          className="hover:bg-purple-500/20 rounded-sm p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attached Files Display */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground max-w-[200px] truncate">
                          {file.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="ml-1 hover:bg-muted-foreground/20 rounded p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Input */}
                <Textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    // Auto-resize: grow up to 6 lines (~144px), then scroll
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      const maxHeight = 144; // ~6 lines
                      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
                      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden';
                    }
                  }}
                  placeholder="What are you researching?"
                  className="flex-1 min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/60 text-base text-black dark:text-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (isMobilePhone) {
                        // On mobile: Enter adds newline, send via button only
                        return;
                      }
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }
                  }}
                />

                {/* Bottom Row with Buttons */}
                <div className="flex items-center justify-between">
                  {/* Left Side - Sample prompts icon + Filter Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Mobile-only "+" button with menu and drawer */}
                    <div className="relative sm:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          if (mobileDrawerCategory) {
                            setMobileDrawerCategory(null);
                          } else {
                            setMobilePlusMenuOpen(!mobilePlusMenuOpen);
                          }
                        }}
                        className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      >
                        <Plus className="h-5 w-5" />
                      </button>

                      {/* Click-outside backdrop for menu */}
                      {mobilePlusMenuOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setMobilePlusMenuOpen(false)} />
                      )}

                      {/* Click-outside backdrop for drawer */}
                      {mobileDrawerCategory && !mobilePlusMenuOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setMobileDrawerCategory(null)} />
                      )}

                      {/* Mobile plus menu */}
                      {mobilePlusMenuOpen && (
                        <div className="absolute bottom-full left-0 -mb-[22px] w-56 rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          {[
                            { key: 'prompts', label: 'Samples', icon: <Lightbulb className="h-4 w-4" /> },
                            { key: 'bills', label: 'Bills', icon: <FileText className="h-4 w-4" /> },
                            { key: 'committees', label: 'Committees', icon: <Building2 className="h-4 w-4" /> },
                            { key: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
                          ].map((item, idx) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                setMobilePlusMenuOpen(false);
                                setMobileDrawerCategory(item.key);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                                idx > 0 && "border-t border-border/40"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{item.icon}</span>
                                <span className="font-medium text-foreground">{item.label}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mobile drawer - shows after selecting from menu */}
                      {mobileDrawerCategory && !mobilePlusMenuOpen && (
                        <div className="absolute bottom-full left-0 -mb-[22px] w-80 max-h-[400px] rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                            <span className="text-sm font-medium">
                              {mobileDrawerCategory === 'prompts' ? 'Sample Prompts' : mobileDrawerCategory.charAt(0).toUpperCase() + mobileDrawerCategory.slice(1)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMobileDrawerCategory(null)}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Content */}
                          <div
                            className="max-h-[320px] overflow-y-auto"
                            onScroll={(e) => {
                              if (mobileDrawerCategory === 'bills') handlePopoverScroll(e, () => fetchBillsForSelection(availableBills.length), billsHasMore, billsLoading);
                              if (mobileDrawerCategory === 'members') handlePopoverScroll(e, () => fetchMembersForSelection(availableMembers.length), membersHasMore, membersLoading);
                              if (mobileDrawerCategory === 'committees') handlePopoverScroll(e, () => fetchCommitteesForSelection(availableCommittees.length), committeesHasMore, committeesLoading);
                            }}
                          >
                            {/* Sample Prompts */}
                            {mobileDrawerCategory === 'prompts' && (
                              samplePrompts.map((item, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setQuery(item.prompt);
                                    setMobileDrawerCategory(null);
                                    setTimeout(() => {
                                      if (textareaRef.current) {
                                        textareaRef.current.style.height = 'auto';
                                        const maxHeight = 144;
                                        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
                                        textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden';
                                        textareaRef.current.focus();
                                      }
                                    }, 0);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                                    idx > 0 && "border-t border-border/40"
                                  )}
                                >
                                  <span className="font-medium text-foreground">{item.title}</span>
                                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.prompt}</p>
                                </button>
                              ))
                            )}

                            {/* Bills */}
                            {mobileDrawerCategory === 'bills' && (
                              billsLoading && availableBills.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading bills...</div>
                              ) : (
                                <>
                                {availableBills.map((bill, idx) => (
                                  <button
                                    key={`${bill.bill_number}-${bill.session_id}`}
                                    type="button"
                                    onClick={() => {
                                      setMobileDrawerCategory(null);
                                      handleSubmit(null, buildBillPrompt(bill), composeSystemPrompt({ entityType: 'bill', entityName: bill.bill_number }));
                                    }}
                                    className={cn(
                                      "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                      idx > 0 && "border-t border-border/40"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium">{bill.bill_number}</span>
                                      {bill.session_id && <span className="text-muted-foreground text-[11px] shrink-0">{bill.session_id}</span>}
                                    </div>
                                    <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{bill.title}</p>
                                  </button>
                                ))}
                                {billsLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                                </>
                              )
                            )}

                            {/* Members */}
                            {mobileDrawerCategory === 'members' && (
                              membersLoading && availableMembers.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading members...</div>
                              ) : (
                                <>
                                {availableMembers.map((member, idx) => (
                                  <button
                                    key={member.people_id}
                                    type="button"
                                    onClick={() => {
                                      setMobileDrawerCategory(null);
                                      handleSubmit(null, buildMemberPrompt(member), composeSystemPrompt({ entityType: 'member', entityName: member.name }));
                                    }}
                                    className={cn(
                                      "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                      idx > 0 && "border-t border-border/40"
                                    )}
                                  >
                                    <span className="font-medium">{member.name}</span>
                                    <span className="text-muted-foreground ml-2">{member.party} - {member.chamber}</span>
                                  </button>
                                ))}
                                {membersLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                                </>
                              )
                            )}

                            {/* Committees */}
                            {mobileDrawerCategory === 'committees' && (
                              committeesLoading && availableCommittees.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading committees...</div>
                              ) : (
                                <>
                                {availableCommittees.map((committee, idx) => {
                                  const prefix = committee.chamber === 'Senate' ? 'Senate ' : committee.chamber === 'Assembly' ? 'Assembly ' : '';
                                  return (
                                  <button
                                    key={committee.committee_id}
                                    type="button"
                                    onClick={() => {
                                      setMobileDrawerCategory(null);
                                      handleSubmit(null, buildCommitteePrompt(committee), composeSystemPrompt({ entityType: 'committee', entityName: `${prefix}${committee.committee_name || ''}`.trim(), dataContext: formatCommitteeMembers(committee) }));
                                    }}
                                    className={cn(
                                      "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                      idx > 0 && "border-t border-border/40"
                                    )}
                                  >
                                    <span className="font-medium">{committee.committee_name}</span>
                                    <span className="text-muted-foreground ml-2">{committee.chamber}</span>
                                  </button>
                                  );
                                })}
                                {committeesLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                                </>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sample prompts selector (lightbulb) - hidden on mobile */}
                    <div className="relative hidden sm:block">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => promptsDropdownOpen ? setPromptsDropdownOpen(false) : openPopover(setPromptsDropdownOpen)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                          >
                            <Lightbulb className="h-5 w-5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Sample Prompts</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Click-outside backdrop for sample prompts */}
                      {promptsDropdownOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setPromptsDropdownOpen(false)} />
                      )}

                      {/* Sample prompts dropdown - extends upward */}
                      {promptsDropdownOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                            <span className="text-sm font-medium">Sample Prompts</span>
                            <button
                              type="button"
                              onClick={() => setPromptsDropdownOpen(false)}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Prompts list */}
                          <div className="max-h-[320px] overflow-y-auto">
                            {samplePrompts.map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setQuery(item.prompt);
                                  setPromptsDropdownOpen(false);
                                  // Trigger textarea resize after React updates the value
                                  setTimeout(() => {
                                    if (textareaRef.current) {
                                      textareaRef.current.style.height = 'auto';
                                      const maxHeight = 144; // ~6 lines
                                      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
                                      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden';
                                      textareaRef.current.focus();
                                    }
                                  }, 0);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                                  idx > 0 && "border-t border-border/40"
                                )}
                              >
                                <span className="font-medium text-foreground">{item.title}</span>
                                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.prompt}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Filter Buttons (only shown when chat has started) */}
                    {chatStarted && (
                    <>
                    {/* Click-outside backdrop for any open popover */}
                    {(membersDialogOpen || committeesDialogOpen || billsDialogOpen || contractsDialogOpen) && (
                      <div className="fixed inset-0 z-40" onClick={closeAllPopovers} />
                    )}

                    {/* Members popover - hidden on mobile */}
                    <div className="relative hidden sm:block">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => membersDialogOpen ? setMembersDialogOpen(false) : openPopover(setMembersDialogOpen)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent transition-colors"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Select Members</p>
                        </TooltipContent>
                      </Tooltip>

                      {membersDialogOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                            <span className="text-sm font-medium">Members</span>
                            <button type="button" onClick={() => setMembersDialogOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div
                            className="max-h-[320px] overflow-y-auto"
                            onScroll={(e) => handlePopoverScroll(e, () => fetchMembersForSelection(availableMembers.length), membersHasMore, membersLoading)}
                          >
                            {availableMembers.map((member, idx) => {
                              const isSelected = selectedMembers.some(m => m.people_id === member.people_id);
                              return (
                                <button
                                  key={member.people_id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedMembers(prev => prev.filter(m => m.people_id !== member.people_id));
                                    } else {
                                      setSelectedMembers(prev => [...prev, member]);
                                      setMembersDialogOpen(false);
                                      setTimeout(() => textareaRef.current?.focus(), 0);
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50 flex items-center justify-between gap-2",
                                    idx > 0 && "border-t border-border/40",
                                    isSelected && "bg-green-500/5"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <span className="font-medium text-foreground">{member.name}</span>
                                    <p className="text-muted-foreground text-xs mt-0.5">{member.party || 'N/A'} &middot; {member.chamber || 'N/A'}</p>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-green-600 shrink-0" />}
                                </button>
                              );
                            })}
                            {membersLoading && (
                              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">Loading...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Committees popover - hidden on mobile */}
                    <div className="relative hidden sm:block">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => committeesDialogOpen ? setCommitteesDialogOpen(false) : openPopover(setCommitteesDialogOpen)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent transition-colors"
                          >
                            <Building2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Select Committees</p>
                        </TooltipContent>
                      </Tooltip>

                      {committeesDialogOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                            <span className="text-sm font-medium">Committees</span>
                            <button type="button" onClick={() => setCommitteesDialogOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div
                            className="max-h-[320px] overflow-y-auto"
                            onScroll={(e) => handlePopoverScroll(e, () => fetchCommitteesForSelection(availableCommittees.length), committeesHasMore, committeesLoading)}
                          >
                            {availableCommittees.map((committee, idx) => {
                              const isSelected = selectedCommittees.some(c => c.committee_id === committee.committee_id);
                              return (
                                <button
                                  key={committee.committee_id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedCommittees(prev => prev.filter(c => c.committee_id !== committee.committee_id));
                                    } else {
                                      setSelectedCommittees(prev => [...prev, committee]);
                                      setCommitteesDialogOpen(false);
                                      setTimeout(() => textareaRef.current?.focus(), 0);
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50 flex items-center justify-between gap-2",
                                    idx > 0 && "border-t border-border/40",
                                    isSelected && "bg-orange-500/5"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <span className="font-medium text-foreground">{committee.committee_name}</span>
                                    <p className="text-muted-foreground text-xs mt-0.5">{committee.chamber || 'N/A'}</p>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-orange-600 shrink-0" />}
                                </button>
                              );
                            })}
                            {committeesLoading && (
                              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">Loading...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bills popover - hidden on mobile */}
                    <div className="relative hidden sm:block">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => billsDialogOpen ? setBillsDialogOpen(false) : openPopover(setBillsDialogOpen)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Select Bills</p>
                        </TooltipContent>
                      </Tooltip>

                      {billsDialogOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                            <span className="text-sm font-medium">Bills</span>
                            <button type="button" onClick={() => setBillsDialogOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div
                            className="max-h-[320px] overflow-y-auto"
                            onScroll={(e) => handlePopoverScroll(e, () => fetchBillsForSelection(availableBills.length), billsHasMore, billsLoading)}
                          >
                            {availableBills.map((bill, idx) => {
                              const isSelected = selectedBills.some(b => b.bill_number === bill.bill_number && b.session_id === bill.session_id);
                              return (
                                <button
                                  key={`${bill.bill_number}-${bill.session_id}`}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedBills(prev => prev.filter(b => !(b.bill_number === bill.bill_number && b.session_id === bill.session_id)));
                                    } else {
                                      setSelectedBills(prev => [...prev, bill]);
                                      setBillsDialogOpen(false);
                                      setTimeout(() => textareaRef.current?.focus(), 0);
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50 flex items-center justify-between gap-2",
                                    idx > 0 && "border-t border-border/40",
                                    isSelected && "bg-primary/5"
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-foreground">{bill.bill_number}</span>
                                      {bill.session_id && <span className="text-muted-foreground text-[11px] shrink-0">{bill.session_id}</span>}
                                    </div>
                                    <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{bill.title}</p>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                            {billsLoading && (
                              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">Loading...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contracts popover - hidden on mobile */}
                    <div className="relative hidden sm:block">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => contractsDialogOpen ? setContractsDialogOpen(false) : openPopover(setContractsDialogOpen)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent transition-colors"
                          >
                            <Wallet className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Select Contracts</p>
                        </TooltipContent>
                      </Tooltip>

                      {contractsDialogOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                            <span className="text-sm font-medium">Contracts</span>
                            <button type="button" onClick={() => setContractsDialogOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div
                            className="max-h-[320px] overflow-y-auto"
                            onScroll={(e) => handlePopoverScroll(e, () => fetchContractsForSelection(availableContracts.length), contractsHasMore, contractsLoading)}
                          >
                            {availableContracts.map((contract, idx) => {
                              const isSelected = selectedContracts.some(c => c.contract_number === contract.contract_number);
                              return (
                                <button
                                  key={contract.contract_number}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedContracts(prev => prev.filter(c => c.contract_number !== contract.contract_number));
                                    } else {
                                      setSelectedContracts(prev => [...prev, contract]);
                                      setContractsDialogOpen(false);
                                      setTimeout(() => textareaRef.current?.focus(), 0);
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50 flex items-center justify-between gap-2",
                                    idx > 0 && "border-t border-border/40",
                                    isSelected && "bg-purple-500/5"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <span className="font-medium text-foreground">{contract.vendor_name || 'N/A'}</span>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                      {contract.department_facility || 'N/A'} &middot; {contract.current_contract_amount
                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(contract.current_contract_amount)
                                        : 'N/A'}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
                                </button>
                              );
                            })}
                            {contractsLoading && (
                              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">Loading...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    </>
                    )}
                  </div>

                  {/* Right Side - Model selector + Submit/Stop Button */}
                  <div className="flex items-center gap-3">
                    <div className="[&_button>span]:text-sm [&_button>span]:font-medium [&_button]:px-1 [&_button]:py-1">
                      <EngineSelection />
                    </div>
                    <Button
                      type={isTyping ? "button" : "submit"}
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-lg",
                        isTyping
                          ? "bg-destructive hover:bg-destructive/90"
                          : "bg-foreground hover:bg-foreground/90"
                      )}
                      onClick={isTyping ? stopStream : undefined}
                    >
                      {isTyping ? (
                        <Square className="h-4 w-4" fill="currentColor" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Category Pills - shown when chat hasn't started and no text typed */}
            {!chatStarted && query.length === 0 && (
              <div className="relative">
                {/* Pills row - always visible */}
                <div className="flex flex-wrap gap-2 mt-6 justify-center px-2">
                  {/* Sign Up pill - show on public page, hide on mobile and /new-chat when authenticated */}
                  {(isPublicPage || !user) && (
                    <button
                      type="button"
                      onClick={() => navigate('/auth-4')}
                      className="shimmer-hover hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-foreground bg-foreground text-background text-sm transition-colors hover:bg-foreground/90"
                    >
                      Sign Up
                    </button>
                  )}
                  {[
                    { key: 'bills', label: 'Bills', icon: <FileText className="h-3.5 w-3.5" />, mobileVisible: false },
                    { key: 'committees', label: 'Committees', icon: <Building2 className="h-3.5 w-3.5" />, mobileVisible: false },
                    { key: 'members', label: 'Members', icon: <Users className="h-3.5 w-3.5" />, mobileVisible: false },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setMobileDrawerCategory(mobileDrawerCategory === cat.key ? null : cat.key)}
                      className={cn(
                        "items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm transition-colors",
                        cat.mobileVisible ? "inline-flex" : "hidden sm:inline-flex",
                        mobileDrawerCategory === cat.key
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Click-outside backdrop for drawer (desktop only — mobile uses its own in the + menu) */}
                {mobileDrawerCategory && (
                  <div className="fixed inset-0 z-40 hidden sm:block" onClick={() => setMobileDrawerCategory(null)} />
                )}

                {/* Drawer card - drops down below pills (desktop only — mobile uses drawer above input) */}
                {mobileDrawerCategory && (
                  <div className="absolute top-full left-0 right-0 mt-3 mx-1 rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden z-50 hidden sm:block">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {mobileDrawerCategory === 'prompts' ? 'Sample Prompts' : mobileDrawerCategory.charAt(0).toUpperCase() + mobileDrawerCategory.slice(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMobileDrawerCategory(null)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Items list */}
                    <div
                      className="max-h-[280px] overflow-y-auto"
                      onScroll={(e) => {
                        if (mobileDrawerCategory === 'bills') handlePopoverScroll(e, () => fetchBillsForSelection(availableBills.length), billsHasMore, billsLoading);
                        if (mobileDrawerCategory === 'members') handlePopoverScroll(e, () => fetchMembersForSelection(availableMembers.length), membersHasMore, membersLoading);
                        if (mobileDrawerCategory === 'committees') handlePopoverScroll(e, () => fetchCommitteesForSelection(availableCommittees.length), committeesHasMore, committeesLoading);
                        if (mobileDrawerCategory === 'contracts') handlePopoverScroll(e, () => fetchContractsForSelection(availableContracts.length), contractsHasMore, contractsLoading);
                      }}
                    >
                      {/* Sample Prompts */}
                      {mobileDrawerCategory === 'prompts' && (
                        samplePrompts.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setQuery(item.prompt);
                              setMobileDrawerCategory(null);
                              setTimeout(() => {
                                if (textareaRef.current) {
                                  textareaRef.current.style.height = 'auto';
                                  const maxHeight = 144;
                                  textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
                                  textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden';
                                  textareaRef.current.focus();
                                }
                              }, 0);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                              idx > 0 && "border-t border-border/40"
                            )}
                          >
                            <span className="font-medium text-foreground">{item.title}</span>
                            <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.prompt}</p>
                          </button>
                        ))
                      )}

                      {/* Bills */}
                      {mobileDrawerCategory === 'bills' && (
                        billsLoading && availableBills.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading bills...</div>
                        ) : (
                          <>
                          {availableBills.map((bill, idx) => (
                            <button
                              key={`${bill.bill_number}-${bill.session_id}`}
                              type="button"
                              onClick={() => {
                                setMobileDrawerCategory(null);
                                handleSubmit(null, buildBillPrompt(bill), composeSystemPrompt({ entityType: 'bill', entityName: bill.bill_number }));
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                idx > 0 && "border-t border-border/40"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{bill.bill_number}</span>
                                {bill.session_id && <span className="text-muted-foreground text-[11px] shrink-0">{bill.session_id}</span>}
                              </div>
                              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{bill.title}</p>
                            </button>
                          ))}
                          {billsLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                          </>
                        )
                      )}

                      {/* Members */}
                      {mobileDrawerCategory === 'members' && (
                        membersLoading && availableMembers.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading members...</div>
                        ) : (
                          <>
                          {availableMembers.map((member, idx) => (
                            <button
                              key={member.people_id}
                              type="button"
                              onClick={() => {
                                setMobileDrawerCategory(null);
                                handleSubmit(null, buildMemberPrompt(member), composeSystemPrompt({ entityType: 'member', entityName: member.name }));
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                idx > 0 && "border-t border-border/40"
                              )}
                            >
                              <span className="font-medium">{member.name}</span>
                              <span className="text-muted-foreground ml-2">{member.party} - {member.chamber}</span>
                            </button>
                          ))}
                          {membersLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                          </>
                        )
                      )}

                      {/* Committees */}
                      {mobileDrawerCategory === 'committees' && (
                        committeesLoading && availableCommittees.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading committees...</div>
                        ) : (
                          <>
                          {availableCommittees.map((committee, idx) => {
                            const prefix = committee.chamber === 'Senate' ? 'Senate ' : committee.chamber === 'Assembly' ? 'Assembly ' : '';
                            return (
                            <button
                              key={committee.committee_id}
                              type="button"
                              onClick={() => {
                                setMobileDrawerCategory(null);
                                handleSubmit(null, buildCommitteePrompt(committee), composeSystemPrompt({ entityType: 'committee', entityName: `${prefix}${committee.committee_name || ''}`.trim(), dataContext: formatCommitteeMembers(committee) }));
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                idx > 0 && "border-t border-border/40"
                              )}
                            >
                              <span className="font-medium">{committee.committee_name}</span>
                              <span className="text-muted-foreground ml-2">{committee.chamber}</span>
                            </button>
                            );
                          })}
                          {committeesLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                          </>
                        )
                      )}

                      {/* Contracts */}
                      {mobileDrawerCategory === 'contracts' && (
                        contractsLoading && availableContracts.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading contracts...</div>
                        ) : (
                          <>
                          {availableContracts.map((contract, idx) => {
                            const vendor = contract.vendor_name || 'Unknown vendor';
                            const dept = contract.department_facility ? ` (${contract.department_facility})` : '';
                            const amount = contract.current_contract_amount
                              ? ` valued at ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(contract.current_contract_amount)}`
                              : '';
                            const desc = contract.contract_description ? ` Description: "${contract.contract_description}".` : '';
                            const contractPrompt = `Tell me about the contract with ${vendor}${dept}${amount}.${desc} What are the contract details, spending status, and related contracts?`;
                            return (
                            <button
                              key={contract.contract_number}
                              type="button"
                              onClick={() => {
                                setMobileDrawerCategory(null);
                                // Set selectedContracts so handleSubmit can build contract context
                                setSelectedContracts([contract]);
                                handleSubmit(null, contractPrompt, composeSystemPrompt({ entityType: 'contract', entityName: vendor, scope: 'vendor' }));
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                idx > 0 && "border-t border-border/40"
                              )}
                            >
                              <span className="font-medium">{contract.vendor_name || 'N/A'}</span>
                              <span className="text-muted-foreground ml-2">
                                {contract.current_contract_amount
                                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(contract.current_contract_amount)
                                  : ''}
                              </span>
                            </button>
                            );
                          })}
                          {contractsLoading && <div className="px-4 py-3 text-center text-xs text-muted-foreground">Loading...</div>}
                          </>
                        )
                      )}

                      {/* Lobbying */}
                      {mobileDrawerCategory === 'lobbying' && (
                        mobileDrawerLoading ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading lobbyists...</div>
                        ) : (
                          mobileDrawerLobbyists.map((lobbyist, idx) => (
                            <button
                              key={lobbyist.id}
                              type="button"
                              onClick={() => {
                                setQuery(`Tell me about lobbyist ${lobbyist.name}`);
                                setMobileDrawerCategory(null);
                                textareaRef.current?.focus();
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors",
                                idx > 0 && "border-t border-border/40"
                              )}
                            >
                              <span className="font-medium">{lobbyist.name}</span>
                              {lobbyist.type_of_lobbyist && (
                                <span className="text-muted-foreground ml-2">{lobbyist.type_of_lobbyist}</span>
                              )}
                            </button>
                          ))
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Product Hunt Badge - only show on root, hide on mobile and /c/ session pages */}
      {!chatStarted && query.length === 0 && !routeSessionId && (
        <a
          href="https://www.producthunt.com/products/nysgpt-govtech?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-nysgpt-govtech"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:block fixed bottom-4 right-4 z-50"
        >
          <img
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1071469&theme=dark&t=1770014639842"
            alt="NYSgpt | GovTech - Ai for public policy | Product Hunt"
            width="250"
            height="54"
          />
        </a>
      )}

      {/* "Ask NYSgpt" Text Selection Popup - rendered via portal */}
      <AskNYSgptSelectionPopup onAsk={handleAskNYSgpt} />

    </div>
  );
};

export default NewChat;
