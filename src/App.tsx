// New Branch version - deployed to Vercel
import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ModelProvider } from "@/contexts/ModelContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { SearchModal } from "@/components/SearchModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useHubSpot } from "@/hooks/useHubSpot";
import { LazyLoadErrorBoundary } from "@/components/LazyLoadErrorBoundary";

// Retry wrapper for lazy imports — guards against "Stale Chunk Blank Screen"
// When a deployment invalidates old chunk URLs, the first import fails.
// This retries once before letting the error boundary handle it.
function lazyRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return React.lazy(() =>
    importFn().catch(() => {
      // Brief pause then retry — handles transient network / stale chunk errors
      return new Promise<{ default: React.ComponentType<any> }>((resolve) =>
        setTimeout(() => resolve(importFn()), 1000)
      );
    })
  );
}

// Lazy-loaded page components (with retry for stale chunk protection)
const Auth = lazyRetry(() => import("./pages/Auth"));
const Auth4 = lazyRetry(() => import("./pages/Auth4"));
const Profile = lazyRetry(() => import("./pages/Profile"));
const Bills = lazyRetry(() => import("./pages/Bills"));
const Members = lazyRetry(() => import("./pages/Members"));
const Committees = lazyRetry(() => import("./pages/Committees"));
const NewChat = lazyRetry(() => import("./pages/NewChat"));
const Plans = lazyRetry(() => import("./pages/Plans"));
const About = lazyRetry(() => import("./pages/About"));
const History = lazyRetry(() => import("./pages/History"));
const Academy = lazyRetry(() => import("./pages/Academy"));
const Features = lazyRetry(() => import("./pages/Features"));
const AIFluency = lazyRetry(() => import("./pages/AIFluency"));
const UseCases = lazyRetry(() => import("./pages/UseCases"));
const Video = lazyRetry(() => import("./pages/Video"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
const UseCasesBills = lazyRetry(() => import("./pages/UseCasesBills"));
const UseCasesCommittees = lazyRetry(() => import("./pages/UseCasesCommittees"));
const UseCasesMembers = lazyRetry(() => import("./pages/UseCasesMembers"));
const UseCasesPolicy = lazyRetry(() => import("./pages/UseCasesPolicy"));
const UseCasesDepartments = lazyRetry(() => import("./pages/UseCasesDepartments"));
const Nonprofits = lazyRetry(() => import("./pages/Nonprofits"));
const NonprofitEconomicAdvocacy = lazyRetry(() => import("./pages/NonprofitEconomicAdvocacy"));
const NonprofitEnvironmentalAdvocacy = lazyRetry(() => import("./pages/NonprofitEnvironmentalAdvocacy"));
const NonprofitLegalAdvocacy = lazyRetry(() => import("./pages/NonprofitLegalAdvocacy"));
const NonprofitSocialAdvocacy = lazyRetry(() => import("./pages/NonprofitSocialAdvocacy"));
const NonprofitDirectory = lazyRetry(() => import("./pages/NonprofitDirectory"));
const ExcerptView = lazyRetry(() => import("./pages/ExcerptView"));
const NoteView = lazyRetry(() => import("./pages/NoteView"));
const NewNote = lazyRetry(() => import("./pages/NewNote"));
const Contracts = lazyRetry(() => import("./pages/Contracts"));
const ContractDetail = lazyRetry(() => import("./pages/ContractDetail"));
const Budget = lazyRetry(() => import("./pages/Budget"));
const BudgetDashboard = lazyRetry(() => import("./pages/BudgetDashboard"));
const Lobbying = lazyRetry(() => import("./pages/Lobbying"));
const LobbyingDashboard = lazyRetry(() => import("./pages/LobbyingDashboard"));
const ContractsDashboard = lazyRetry(() => import("./pages/ContractsDashboard"));
const VotesDashboard = lazyRetry(() => import("./pages/VotesDashboard"));
const LobbyingDetail = lazyRetry(() => import("./pages/LobbyingDetail"));
const Revenue = lazyRetry(() => import("./pages/Revenue"));
const RevenueDetail = lazyRetry(() => import("./pages/RevenueDetail"));
const SchoolFunding = lazyRetry(() => import("./pages/SchoolFunding"));
const SchoolFundingDetail = lazyRetry(() => import("./pages/SchoolFundingDetail"));
const Committees2 = lazyRetry(() => import("./pages/Committees2"));
const Members2 = lazyRetry(() => import("./pages/Members2"));
const Bills2 = lazyRetry(() => import("./pages/Bills2"));
const Chats2 = lazyRetry(() => import("./pages/Chats2"));
const Constitution = lazyRetry(() => import("./pages/Constitution"));
const DigitalBillOfRights = lazyRetry(() => import("./pages/DigitalBillOfRights"));
const LiveFeed = lazyRetry(() => import("./pages/LiveFeed"));
const Prompts = lazyRetry(() => import("./pages/Prompts"));
const PromptHub = lazyRetry(() => import("./pages/PromptHub"));
const Lists = lazyRetry(() => import("./pages/Lists"));
const Charts = lazyRetry(() => import("./pages/Charts"));
const DepartmentDetail = lazyRetry(() => import("./pages/DepartmentDetail"));
const FeedPage = lazyRetry(() => import("./pages/FeedPage"));
const SubmitPrompt = lazyRetry(() => import("./pages/SubmitPrompt"));
const NewExcerpt = lazyRetry(() => import("./pages/NewExcerpt"));
const Advertise = lazyRetry(() => import("./pages/Advertise"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const UserFeedback = lazyRetry(() => import("./pages/UserFeedback"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-muted-foreground">Loading...</div>
  </div>
);

// HubSpot tracker component - must be inside AuthProvider to access auth context
function HubSpotTracker() {
  useHubSpot();
  return null;
}

// Global keyboard shortcuts - must be inside BrowserRouter to use navigate
function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+Cmd+O (Mac) or Shift+Ctrl+O (Windows) - New Chat
      if (e.key.toLowerCase() === "o" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        navigate("/new-chat");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ModelProvider>
            <Toaster />
            <Sonner />
            <SpeedInsights />
            <Analytics />
            <BrowserRouter>
              <HubSpotTracker />
              <ScrollToTop />
              <KeyboardShortcuts />
              <SearchModal />
              <LazyLoadErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
              <PageTransition>
                <Routes>
                  <Route path="/" element={<NewChat />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth-4" element={<Auth4 />} />
                  <Route path="/live-feed" element={<LiveFeed />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/academy" element={<Academy />} />
                  <Route path="/constitution" element={<Constitution />} />
                  <Route path="/digital-bill-of-rights" element={<DigitalBillOfRights />} />
                  <Route path="/ai-fluency" element={<AIFluency />} />
                  <Route path="/prompts" element={<PromptHub />} />
                  <Route path="/lists" element={<Lists />} />
                  <Route path="/explore" element={<Charts />} />
                  <Route path="/submit-prompt" element={<SubmitPrompt />} />
                  <Route path="/new-excerpt" element={<NewExcerpt />} />
                  <Route path="/advertise" element={<Advertise />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/user-feedback" element={<UserFeedback />} />
                  <Route path="/use-cases" element={<UseCases />} />
                  <Route path="/use-cases/bills" element={<UseCasesBills />} />
                  <Route path="/use-cases/committees" element={<UseCasesCommittees />} />
                  <Route path="/use-cases/members" element={<UseCasesMembers />} />
                  <Route path="/use-cases/policy" element={<UseCasesPolicy />} />
                  <Route path="/use-cases/departments" element={<UseCasesDepartments />} />
                  <Route path="/video" element={<Video />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:postId" element={<BlogPost />} />
                  <Route path="/nonprofits" element={<Nonprofits />} />
                  <Route path="/nonprofits/economic-advocacy" element={<NonprofitEconomicAdvocacy />} />
                  <Route path="/nonprofits/environmental-advocacy" element={<NonprofitEnvironmentalAdvocacy />} />
                  <Route path="/nonprofits/legal-advocacy" element={<NonprofitLegalAdvocacy />} />
                  <Route path="/nonprofits/social-advocacy" element={<NonprofitSocialAdvocacy />} />
                  <Route path="/nonprofits/directory" element={<NonprofitDirectory />} />
                  <Route path="/new-note" element={<ProtectedRoute><NewNote /></ProtectedRoute>} />
                  <Route path="/n/:noteId" element={<ProtectedRoute><NoteView /></ProtectedRoute>} />
                  <Route path="/e/:excerptId" element={<ProtectedRoute><ExcerptView /></ProtectedRoute>} />
                  <Route path="/new-chat" element={<ProtectedRoute><NewChat /></ProtectedRoute>} />
                  <Route path="/c/:sessionId" element={<ProtectedRoute><NewChat /></ProtectedRoute>} />
                  <Route path="/bills" element={<ProtectedRoute><Bills2 /></ProtectedRoute>} />
                  <Route path="/bills/:billNumber" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
                  <Route path="/committees" element={<ProtectedRoute><Committees2 /></ProtectedRoute>} />
                  <Route path="/committees/:committeeSlug" element={<ProtectedRoute><Committees /></ProtectedRoute>} />
                  <Route path="/members" element={<ProtectedRoute><Members2 /></ProtectedRoute>} />
                  <Route path="/members/:memberSlug" element={<ProtectedRoute><Members /></ProtectedRoute>} />
                  <Route path="/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
                  <Route path="/revenue/:revenueId" element={<ProtectedRoute><RevenueDetail /></ProtectedRoute>} />
                  <Route path="/school-funding" element={<ProtectedRoute><SchoolFunding /></ProtectedRoute>} />
                  <Route path="/school-funding/:fundingId" element={<ProtectedRoute><SchoolFundingDetail /></ProtectedRoute>} />
                  <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
                  <Route path="/contracts/:contractNumber" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
                  <Route path="/lobbying" element={<ProtectedRoute><Lobbying /></ProtectedRoute>} />
                  <Route path="/lobbying/:id" element={<ProtectedRoute><LobbyingDetail /></ProtectedRoute>} />
                  <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
                  <Route path="/explore/budget" element={<ProtectedRoute><BudgetDashboard /></ProtectedRoute>} />
                  <Route path="/explore/lobbying" element={<ProtectedRoute><LobbyingDashboard /></ProtectedRoute>} />
                  <Route path="/explore/contracts" element={<ProtectedRoute><ContractsDashboard /></ProtectedRoute>} />
                  <Route path="/explore/contracts/:subChart" element={<ProtectedRoute><ContractsDashboard /></ProtectedRoute>} />
                  <Route path="/explore/votes" element={<ProtectedRoute><VotesDashboard /></ProtectedRoute>} />
                  <Route path="/explore/votes/:subChart" element={<ProtectedRoute><VotesDashboard /></ProtectedRoute>} />
                  {/* Redirects for old dashboard URLs */}
                  <Route path="/charts" element={<Navigate to="/explore" replace />} />
                  <Route path="/budget-dashboard" element={<Navigate to="/explore/budget" replace />} />
                  <Route path="/lobbying-dashboard" element={<Navigate to="/explore/lobbying" replace />} />
                  <Route path="/contracts-dashboard" element={<Navigate to="/explore/contracts" replace />} />
                  <Route path="/votes-dashboard" element={<Navigate to="/explore/votes" replace />} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/departments" element={<ProtectedRoute><Prompts /></ProtectedRoute>} />
                  <Route path="/departments/:slug" element={<ProtectedRoute><DepartmentDetail /></ProtectedRoute>} />
                  <Route path="/chats" element={<ProtectedRoute><Chats2 /></ProtectedRoute>} />
                  <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
                  <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
                </Routes>
              </PageTransition>
              </Suspense>
              </LazyLoadErrorBoundary>
            </BrowserRouter>
          </ModelProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
