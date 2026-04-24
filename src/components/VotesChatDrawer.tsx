import { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMarkdown } from '@/components/shared/ChatMarkdown';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, ArrowDown, Square, ChevronDown, FileText, X } from 'lucide-react';
import { Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChatResponseFooter } from '@/components/ChatResponseFooter';
import { useChatDrawer } from '@/hooks/useChatDrawer';
import { VOTES_SUGGESTED_QUESTIONS } from '@/lib/prompts/domainPrompts';

// Model provider icons
const OpenAIIcon = ({ className }: { className?: string }) => (
  <img
    src="/OAI LOGO.png"
    alt="OpenAI"
    className={`object-contain ${className}`}
    style={{ maxWidth: '14px', maxHeight: '14px', width: 'auto', height: 'auto' }}
  />
);

const ClaudeIcon = ({ className }: { className?: string }) => (
  <img
    src="/claude-ai-icon-65aa.png"
    alt="Claude"
    className={`object-contain ${className}`}
    style={{ maxWidth: '14px', maxHeight: '14px', width: 'auto', height: 'auto' }}
  />
);

const PerplexityIcon = ({ className }: { className?: string }) => (
  <img
    src="/PPLX LOGO.png"
    alt="Perplexity"
    className={`object-contain ${className}`}
    style={{ maxWidth: '14px', maxHeight: '14px', width: 'auto', height: 'auto' }}
  />
);

interface VotesChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string | null;
  memberParty?: string | null;
  memberVoteDetails?: string | null;
  billTitle?: string | null;
  billNumber?: string | null;
  billResult?: string | null;
  billVoteDetails?: string | null;
  dataContext?: string | null;
}

export function VotesChatDrawer({
  open,
  onOpenChange,
  memberName,
  memberParty,
  memberVoteDetails,
  billTitle,
  billNumber,
  billResult,
  billVoteDetails,
  dataContext,
}: VotesChatDrawerProps) {
  const [inputValue, setInputValue] = useState('');
  const [wordCountLimit, setWordCountLimit] = useState<number>(250);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Derive scope, entity name, and data from props
  const scope = memberName ? 'member' : billTitle ? 'bill' : undefined;
  const entityName = memberName || billTitle || undefined;
  const resolvedDataContext = memberVoteDetails || billVoteDetails || dataContext || undefined;

  // Session context for scope-specific prompt building (member party, bill number, etc.)
  const sessionContext = useMemo(() => {
    if (memberName) return { memberParty: memberParty || undefined };
    if (billTitle) return { billNumber: billNumber || undefined, billResult: billResult || undefined };
    return undefined;
  }, [memberName, memberParty, billTitle, billNumber, billResult]);

  const {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    stopStream,
    clearMessages,
    handleFeedback,
  } = useChatDrawer({
    entityType: 'votes',
    entityName: entityName || undefined,
    scope,
    dataContext: resolvedDataContext || undefined,
    sessionContext,
    wordCountLimit,
  });

  // Context label for the pill
  const contextLabel = memberName || billNumber || 'NYS Votes';

  const suggestions = VOTES_SUGGESTED_QUESTIONS[scope || 'default'] || VOTES_SUGGESTED_QUESTIONS.default;

  // Get the actual scrollable viewport inside Radix ScrollArea
  const getViewport = () =>
    scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        stopStream();
        clearMessages();
        setInputValue('');
        setShowScrollButton(false);
        userScrolledRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, stopStream, clearMessages]);

  // Handle scroll events to show/hide scroll-to-bottom button
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const handleScroll = () => {
      const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
      setShowScrollButton(!isAtBottom);

      if (!isAtBottom && isLoading) {
        userScrolledRef.current = true;
      }
      if (isAtBottom) {
        userScrolledRef.current = false;
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [isLoading]);

  // Auto-scroll to bottom (only if user hasn't scrolled up)
  useEffect(() => {
    if (userScrolledRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    userScrolledRef.current = false;
    setShowScrollButton(false);
  };

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const title = memberName
    ? `Ask about ${memberName}`
    : billTitle
      ? `Ask about ${billNumber || billTitle}`
      : 'Ask about NYS Votes';


  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

        {/* Messages area */}
        <div className="flex-1 relative overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full px-6 py-4">
          <div className="space-y-2">
            {/* Empty state with suggested questions */}
            {messages.length === 0 && !isLoading && (
              <div className="space-y-4 pt-8">
                <p className="text-sm text-muted-foreground">
                  Ask anything about New York State legislative voting records.
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={isLoading}
                      className="text-left text-sm px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, index) => {
              const displayContent =
                msg.isStreaming && msg.streamedContent !== undefined
                  ? msg.streamedContent
                  : msg.content;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'space-y-3',
                    index > 0 && msg.role === 'user' ? 'mt-[80px]' : index > 0 ? 'mt-6' : ''
                  )}
                >
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-muted/40 rounded-lg p-4 border-0 max-w-[70%]">
                        <p className="text-base leading-relaxed">{displayContent}</p>
                      </div>
                    </div>
                  ) : (
                    <ChatResponseFooter
                      messageContent={
                        <div className="dark:prose-invert">
                          <ChatMarkdown>{displayContent}</ChatMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1">|</span>
                          )}
                        </div>
                      }
                      bills={[]}
                      sources={[]}
                      isStreaming={msg.isStreaming}
                      userMessage={messages[index - 1]?.role === 'user' ? messages[index - 1]?.content : undefined}
                      assistantMessageText={displayContent}
                      onSendMessage={sendMessage}
                      hideCreateExcerpt={false}
                      messageId={msg.id}
                      feedback={msg.feedback}
                      onFeedback={handleFeedback}
                    />
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && messages.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute left-1/2 -translate-x-1/2 bottom-2 z-10 bg-background border border-border rounded-full p-2 shadow-lg hover:bg-muted transition-all duration-200"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        </div>

        {/* Enhanced Input area */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
          <div className="border rounded-t-lg rounded-b-lg bg-background overflow-hidden">
            {/* Context Pill */}
            <div className="px-3 py-2 border-b bg-muted/30 rounded-t-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {contextLabel}
                </span>
              </div>
            </div>

            {/* Textarea */}
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you researching?"
              className="min-h-[60px] max-h-[120px] resize-none border-0 border-x border-transparent focus-visible:ring-0 focus-visible:border-x focus-visible:border-transparent rounded-none bg-background"
              rows={2}
              disabled={isLoading}
            />

            {/* Toolbar: model selector + word count + send/stop */}
            <div className="px-2 py-2 flex items-center justify-between border-t bg-background">
              <div className="flex items-center gap-1">
                {/* Model Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs px-2">
                      {selectedModel.startsWith("gpt") ? (
                        <OpenAIIcon className="h-3.5 w-3.5" />
                      ) : selectedModel.startsWith("claude") ? (
                        <ClaudeIcon className="h-3.5 w-3.5" />
                      ) : (
                        <PerplexityIcon className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {selectedModel === "gpt-4o" ? "GPT-4o" :
                         selectedModel === "gpt-4o-mini" ? "GPT-4o Mini" :
                         selectedModel === "gpt-4-turbo" ? "GPT-4 Turbo" :
                         selectedModel === "claude-sonnet-4-5-20250929" ? "Claude Sonnet" :
                         selectedModel === "claude-haiku-4-5-20251001" ? "Claude Haiku" :
                         selectedModel === "claude-opus-4-5-20251101" ? "Claude Opus" :
                         "Model"}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">OpenAI</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setSelectedModel("gpt-4o")} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <OpenAIIcon className="h-4 w-4" />
                        <span>GPT-4o</span>
                      </div>
                      {selectedModel === "gpt-4o" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("gpt-4o-mini")} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <OpenAIIcon className="h-4 w-4" />
                        <span>GPT-4o Mini</span>
                      </div>
                      {selectedModel === "gpt-4o-mini" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("gpt-4-turbo")} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <OpenAIIcon className="h-4 w-4" />
                        <span>GPT-4 Turbo</span>
                      </div>
                      {selectedModel === "gpt-4-turbo" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Anthropic</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setSelectedModel("claude-sonnet-4-5-20250929")} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClaudeIcon className="h-4 w-4" />
                        <span>Claude Sonnet</span>
                      </div>
                      {selectedModel === "claude-sonnet-4-5-20250929" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("claude-haiku-4-5-20251001")} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClaudeIcon className="h-4 w-4" />
                        <span>Claude Haiku</span>
                      </div>
                      {selectedModel === "claude-haiku-4-5-20251001" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("claude-opus-4-5-20251101")} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClaudeIcon className="h-4 w-4" />
                        <span>Claude Opus</span>
                      </div>
                      {selectedModel === "claude-opus-4-5-20251101" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Word Count Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2">
                      <span>{wordCountLimit} words</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setWordCountLimit(100)}>
                      100 words
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWordCountLimit(250)}>
                      250 words
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWordCountLimit(500)}>
                      500 words
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Send/Stop Button */}
              {isLoading ? (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7 rounded-full"
                  onClick={stopStream}
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-full bg-foreground hover:bg-foreground/90 text-background"
                  disabled={!inputValue.trim()}
                  onClick={handleSend}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
