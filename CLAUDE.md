# CLAUDE.md

Guidance for Claude Code when working in this repository.

**Repo:** github.com/nyd-user-1/nysgpt-demo | **Deploy:** vercel.com/nyd-user-1s-projects/nysgpt-demo

## Commands

```bash
npm run dev          # Dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run typecheck    # Type checking (tsc --noEmit)
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Stack

React 18 + TypeScript + Vite. Tailwind CSS with shadcn/ui (Radix primitives). Supabase for auth, database, and edge functions. React Query for data fetching. React Router for navigation. Deployed on Vercel.

## Project Structure

```
src/
├── components/
│   ├── features/
│   │   ├── bills/         # Bill cards, grids, filters, detail views
│   │   ├── committees/    # Committee cards, tables, detail views
│   │   ├── dashboard/     # Dashboard tables (bills, members, committees)
│   │   ├── feed/          # Legislative feed, search, document upload
│   │   ├── home/          # Welcome message
│   │   └── members/       # Member cards, tables, detail views
│   ├── ai-elements/       # Inline citations, AI UI components
│   ├── blocks/            # Layout blocks
│   ├── magicui/           # MagicUI animated components
│   ├── marketing/         # Marketing page components
│   ├── shared/            # Cross-feature reusable components
│   └── ui/                # shadcn/ui base components
├── contexts/              # AuthContext, ModelContext
├── hooks/                 # ~38 custom hooks
├── integrations/supabase/ # Supabase client and generated types
├── pages/                 # Route page components
├── types/                 # TypeScript definitions
└── utils/                 # adminHelpers, analytics, billNumberUtils, citationParser, committeeSlug, dateUtils, markdownUtils, memberSlug
```

## Routes (src/App.tsx)

All pages are lazy-loaded. The root `/` renders `NewChat`.

### Public Routes
| Path | Page | Purpose |
|------|------|---------|
| `/` | NewChat | Main chat interface (landing page) |
| `/auth` | Auth | Login/signup |
| `/auth-4` | Auth4 | Alternate auth page |
| `/about` | About | About page |
| `/features` | Features | Feature showcase |
| `/history` | History | Platform history |
| `/academy` | Academy | Learning resources |
| `/ai-fluency` | AIFluency | AI literacy content |
| `/constitution` | Constitution | NY Constitution reference |
| `/digital-bill-of-rights` | DigitalBillOfRights | Digital rights reference |
| `/live-feed` | LiveFeed | Public legislative feed |
| `/charts` | Charts | Charts landing page (public, login gate for unauthed) |
| `/prompts` | PromptHub | Prompt discovery hub (Prompts/Lists tabs) |
| `/submit-prompt` | SubmitPrompt | Community prompt submission form |
| `/use-cases` | UseCases | Use case overview |
| `/use-cases/bills` | UseCasesBills | Bills use case |
| `/use-cases/committees` | UseCasesCommittees | Committees use case |
| `/use-cases/members` | UseCasesMembers | Members use case |
| `/use-cases/policy` | UseCasesPolicy | Policy use case |
| `/use-cases/departments` | UseCasesDepartments | Departments use case |
| `/nonprofits` | Nonprofits | Nonprofit overview |
| `/nonprofits/economic-advocacy` | NonprofitEconomicAdvocacy | Economic advocacy |
| `/nonprofits/environmental-advocacy` | NonprofitEnvironmentalAdvocacy | Environmental advocacy |
| `/nonprofits/legal-advocacy` | NonprofitLegalAdvocacy | Legal advocacy |
| `/nonprofits/social-advocacy` | NonprofitSocialAdvocacy | Social advocacy |
| `/nonprofits/directory` | NonprofitDirectory | Nonprofit directory |

### Protected Routes (require auth)
| Path | Page | Purpose |
|------|------|---------|
| `/new-chat` | NewChat | Start new chat |
| `/c/:sessionId` | NewChat | Resume chat session |
| `/bills` | Bills2 | Bills listing |
| `/bills/:billNumber` | Bills | Bill detail |
| `/committees` | Committees2 | Committees listing |
| `/committees/:committeeSlug` | Committees | Committee detail |
| `/members` | Members2 | Members listing |
| `/members/:memberSlug` | Members | Member detail |
| `/contracts` | Contracts | State contracts listing |
| `/contracts/:contractNumber` | ContractDetail | Contract detail |
| `/lobbying` | Lobbying | Lobbying data listing |
| `/lobbying/:id` | LobbyingDetail | Lobbying detail |
| `/school-funding` | SchoolFunding | School funding listing |
| `/school-funding/:fundingId` | SchoolFundingDetail | School funding detail |
| `/budget` | Budget | Budget overview (tabs: Appropriations, Capital, Spending, Revenue) |
| `/charts/budget` | BudgetDashboard | Budget visualizations |
| `/charts/lobbying` | LobbyingDashboard | Lobbying visualizations |
| `/charts/contracts` | ContractsDashboard | Contracts visualizations |
| `/charts/contracts/:subChart` | ContractsDashboard | Contract sub-charts (by-month, by-top-vendors, by-duration) |
| `/charts/votes` | VotesDashboard | Votes visualizations |
| `/charts/votes/:subChart` | VotesDashboard | Vote sub-charts (by-roll-call, by-pass-fail, by-party, by-closest) |
| `/departments` | Prompts | Departments listing |
| `/departments/:slug` | DepartmentDetail | Department detail |
| `/chats` | Chats2 | Chat history |
| `/plans` | Plans | Subscription plans |
| `/profile` | Profile | User profile/settings |
| `/new-note` | NewNote | Create note |
| `/n/:noteId` | NoteView | View/edit note |
| `/e/:excerptId` | ExcerptView | View excerpt |
| `/feed` | FeedPage | Activity feed |

## Key Features

### PromptHub (`/prompts`)

The central discovery hub with two tabs:

**Prompts Tab:**
- Trending section: Curated news articles with source logos (City & State, Siena, CNBC, Politico, etc.)
- Featured category cards: Bill Research, Policy, Advocacy, Departments (gradient colored)
- Community prompts in 3 columns: News / Featured / User Generated
- Resources sidebar: Submit a Prompt, Advertise, Use Cases, Advocacy links
- Press Releases section: Governor, Senate, Assembly releases
- Chat count tracking per prompt via `increment_prompt_chat_count` RPC

**Lists Tab:**
- Top Sponsors: Members ranked by bill count (Supabase join query)
- Recent Bills: Latest 7 bills with status
- Budget Explorer: 14 NYS budget categories with amounts and % of total

**Implementation:** `PromptHub.tsx` (57KB). Uses hardcoded `hubPrompts` array (66 prompts) combined with `submitted_prompts` table for community content.

### Submit a Prompt (`/submit-prompt`)

Community submission form with two modes:

**URL Mode:**
- Paste article/press release URL
- Auto-fetches title via allorigins API (og:title or <title> tag)
- Displays favicon from domain
- Live preview card

**Write Your Own Mode:**
- Custom prompt text input
- Avatar picker (6 preset + user's Google avatar)

**Admin Features:** Column assignment checkboxes (News/Featured/User Generated) visible only to admin.

**Implementation:** `SubmitPrompt.tsx` (28KB). Stores to `submitted_prompts` table.

## Database (Supabase)

### Key Tables
- `chat_sessions` - Chat history and messages
- `notes` - TipTap editor notes
- `excerpts` - Saved excerpts from chats
- `submitted_prompts` - Community prompt submissions

### submitted_prompts Schema
```
id, user_id, title, prompt, url, category,
user_generated (boolean), show_in_news (boolean), show_in_trending (boolean),
display_name, avatar_url, featured, created_at
```

### RPC Functions
- `increment_prompt_chat_count(p_prompt_id, p_seed_count)` - Track chat usage per prompt

### Storage Buckets
- `Favicons` - Custom domain favicons for prompt cards

## Key Patterns

**Authentication**: Supabase Auth via `AuthContext`. Protected routes use `<ProtectedRoute>` wrapper. Admin check via `isAdmin()` in `utils/adminHelpers.ts` (single admin: brendan.stanton@gmail.com).

**Data fetching**: React Query (`@tanstack/react-query`) for all server state. Supabase client at `integrations/supabase/client.ts`. Generated types at `integrations/supabase/types.ts`.

**AI chat**: Main chat is `NewChat.tsx` (the `/` route). Uses Supabase edge function `generate-with-openai`. Chat sessions persisted to `chat_sessions` table. Chat logic in `hooks/useChatLogic.tsx` and `hooks/useChatPersistence.ts`.

**Prompt-to-chat flow**: PromptHub passes context via URL params: `/?prompt=...&context=fetchUrl:...` which triggers chat with article context.

**Notes system**: `NoteView.tsx` uses TipTap editor. Notes persisted via `hooks/useNotePersistence.ts`. Excerpts via `hooks/useExcerptPersistence.ts`.

**Navigation**:
- Top nav (`ChatHeader.tsx`): Chat | Charts | Lists | Prompts
- Sidebar (`NoteViewSidebar.tsx`): Prompts, Chats, Notes, Bills, Committees, Departments, Members, Pro Plan, Features, Use Cases
- Global search (`SearchModal.tsx`): Ctrl+K

**Listing → Detail pattern**: Most data pages follow a listing/detail pattern with "v2" listing pages (`Bills2`, `Members2`, `Committees2`) and original detail pages (`Bills`, `Members`, `Committees`). Listings use slug-based routing to detail views.

**Fixed Header Scrollable Table**: Used for bills tables on detail pages. Key characteristics:
- `table-layout: fixed` with `w-full` for consistent column widths
- Header table outside `ScrollArea`, body table inside for sticky header effect
- Matching pixel widths on header and body cells for alignment
- Single-line truncation (`truncate` class) with `title` attribute for hover tooltips
- Sortable columns with cycling state (asc → desc → null)
- Reference implementations:
  - `src/components/features/committees/CommitteeBillsTableFull.tsx` (Committee Detail Bills tab)
  - `src/components/features/members/MemberBillsTable.tsx` (Member Detail Bills tab)

## TypeScript

Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. Path alias `@/*` maps to `./src/*`. Always run `npm run typecheck` after changes.

## Design Standards

- Radix design system with accent color `#3D63DD`
- shadcn/ui components with Tailwind
- Light mode primary, dark mode supported
- Mobile-first — changes must work on mobile
- Glass morphism header: `bg-background/80 backdrop-blur-md`
- Subtle animations, performance first
- No GPT Engineer scripts in production builds
- Category card gradients: Bill Research (blue), Policy (emerald), Advocacy (purple), Departments (yellow/amber)

## Operational Scripts

All scripts live in `scripts/` and call Supabase edge functions.

### Hourly Bill Sync (cron)
The `sync-bills` action on `nys-legislation-search` checks for new/updated bills from the NYS API (last 2 hours). Configured as a Supabase cron job. To trigger manually:
```bash
curl -X POST "https://kwyjohornlgujoqypyvu.supabase.co/functions/v1/nys-legislation-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -d '{"action":"sync-bills","sessionYear":2025}'
```

### Bill Resync (`scripts/resync-bills.sh`)
Re-syncs all existing bills to fix sponsor/vote linkage. Runs in batches of 50, resumable.
```bash
./scripts/resync-bills.sh           # Start from beginning
./scripts/resync-bills.sh 500       # Resume from offset 500
```

### Bill Embedding (`scripts/embed-bills.sh`)
Generates pgvector embeddings for semantic search over bill text. Fetches full text from NYS API, chunks it, embeds via OpenAI `text-embedding-3-small` (256 dims), and stores in `bill_chunks` table. Batches of 10, 3s pause, resumable.
```bash
./scripts/embed-bills.sh            # Start from beginning
./scripts/embed-bills.sh 290        # Resume from offset 290
```
Check progress:
```bash
curl -X POST "https://kwyjohornlgujoqypyvu.supabase.co/functions/v1/embed-bill-chunks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -d '{"action":"status","sessionYear":2025}'
```

### Member Sync (`scripts/sync-members.sh`)
Syncs all current NYS legislators into the People table from the NYS API.
```bash
./scripts/sync-members.sh           # Default session 2025
./scripts/sync-members.sh 2025      # Explicit session year
```

### Committee Sync (`scripts/sync-committees.sh`)
Syncs Senate committee data (chair, members, meeting schedule) from NYS API. Assembly data is not available via API.
```bash
./scripts/sync-committees.sh        # Default session 2025
./scripts/sync-committees.sh 2025   # Explicit session year
```

## Semantic Search (pgvector)

The `bill_chunks` table stores chunked bill text with 256-dimension vector embeddings for semantic search. Edge functions:
- `embed-bill-chunks` — actions: `embed-single`, `embed-batch`, `status`
- `semantic-search` — takes natural language query, returns matched bill chunks with similarity scores
- `match_bill_chunks` — Supabase RPC for cosine similarity search with session/bill filters

## Build Optimization

Vite `manualChunks` splits `vendor` (React) and `ui` (Radix) into preloaded chunks. Heavy libraries (TipTap, Recharts) are NOT in manualChunks — they bundle into their lazy-loaded page chunks to keep initial load small (~195 KB gzip).
