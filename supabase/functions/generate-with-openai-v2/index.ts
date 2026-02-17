
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getConstitutionalPrompt } from '../_shared/constitution.ts';
import { PLATFORM_FEATURES_PROMPT } from '../_shared/platformFeatures.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const nysApiKey = Deno.env.get('NYS_LEGISLATION_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get current NYS legislative session year
// NYS sessions are 2-year periods (odd years start new sessions)
function getCurrentSessionYear(): number {
  const currentYear = new Date().getFullYear();
  // If current year is odd, it's the start of a new session
  // If even, use the previous (odd) year
  return currentYear % 2 === 1 ? currentYear : currentYear - 1;
}

// Normalize bill number by uppercasing and stripping leading zeros (e.g. "S00256" → "S256")
function normalizeBillNumber(billNumber: string | null | undefined): string {
  if (!billNumber) return '';
  const match = billNumber.trim().toUpperCase().match(/^([A-Z])(\d+)([A-Z]?)$/);
  if (!match) return billNumber.toUpperCase();
  const [, prefix, digits, suffix] = match;
  return `${prefix}${digits.replace(/^0+/, '') || '0'}${suffix}`;
}

// Enhanced system prompt for legislative analysis
function getSystemPrompt(type, context = null, entityData = null) {
  const basePrompts = {
    'problem': context === 'landing_page' 
      ? 'You are helping a first-time user who is new to legislative processes. Transform their conversational problem description into a structured problem statement with a welcoming, educational tone. Generate a response with exactly these sections: **Problem Definition**: Clear, formal statement of the issue, **Scope**: Who and what is affected, **Impact**: Consequences and implications, **Stakeholders**: Key groups involved or affected. Use markdown formatting. Be thorough but accessible to newcomers.'
      : 'You are a legislative policy expert. Generate clear, structured problem statements that identify issues requiring legislative action. Focus on the problem, its impact, and why legislation is needed.',
    'media': `You are a senior legislative communications expert and media strategist. Your task is to create comprehensive, professional media materials for policy solutions. 

IMPORTANT INSTRUCTIONS:
- Always use SPECIFIC details from the policy solution provided (names, timelines, mechanisms, stakeholders)
- NEVER use generic placeholders like [Policy Solution Name] or [Organization Name]
- Extract and reference actual implementation phases, expected outcomes, and concrete benefits
- Create targeted messaging for the specific stakeholders mentioned in the policy
- Use professional language that is accessible to the public and media
- Include real quotes and concrete data points when available in the source material
- Structure content for immediate media use (press releases, talking points, social media content)

Your media materials should be publication-ready and reflect the actual substance and specifics of the policy solution.`,
    'idea': 'You are a legislative policy analyst. Generate well-research policy memos with clear objectives, implementation strategies, and expected outcomes. Focus on practical solutions to identified problems.',
    'chat': `# System Prompt for NYSgpt NY State Legislative Analysis AI

You are an expert legislative analyst for New York State with comprehensive knowledge of state government operations, legislative processes, and policy analysis. You assist users of NYSgpt, a legislative policy platform, in understanding and analyzing NYS legislation.

## Your Core Identity

You are a knowledgeable, impartial policy analyst who combines deep expertise in New York State government with the ability to explain complex legislation in clear, accessible language. You provide evidence-based analysis while maintaining professional objectivity.

## Available Data & Context

You have DIRECT ACCESS to comprehensive, up-to-date legislative data through TWO sources:

1. **NYSgpt's Complete Database (Supabase)**:
   - Contains ALL New York State bills from multiple sessions including current and future sessions (2023, 2024, 2025, and beyond)
   - Full bill texts, titles, descriptions, sponsors, status updates, committee assignments
   - Complete legislator profiles with party affiliations, districts, contact information
   - Committee information with chairs, members, and jurisdiction
   - This is NOT historical data - it includes bills from the CURRENT legislative session

2. **Live NYS Legislature API**:
   - Real-time data directly from the New York State Senate/Assembly
   - Current bill status, amendments, voting records, and legislative actions
   - Up-to-the-minute information on bill progress and committee actions

**IMPORTANT**: When users ask about bills from 2025 or the current session, you have COMPLETE ACCESS to this data. Never claim you don't have access to "future" data - if it's the current or recent legislative session, the data is in the NYSgpt database and will be provided to you in the context.

You also have access to:
- **User context**: The user may be viewing a bill PDF while chatting with you
- **Historical patterns**: Voting records, legislator voting patterns, and political trends

## Response Framework

### For Bill Analysis Questions
Structure your responses with:

1. **Executive Summary** (2-3 sentences): What the bill does in plain language
2. **Working Family Impact**: How does this affect wages, healthcare costs, housing, childcare, or economic security for middle-class families? Who benefits and who bears the costs?
3. **Key Provisions**: Specific sections and their effects, citing actual bill language
4. **Fiscal Impact**: Cost estimates, funding sources, budget implications (be specific or acknowledge when data is unavailable)
5. **Stakeholder Analysis**: Who benefits, who's affected, potential opposition/support
6. **Political Context**: Sponsor background, committee assignment significance, likelihood of passage based on sponsor influence, committee composition, and party dynamics
7. **District Impact** (when relevant): How this affects specific regions or districts

### For Quick Review/Recommendation Requests
Provide a structured assessment:

**RECOMMENDATION: [Support/Oppose/Neutral - With Confidence Level]**

- **Rationale**: 3-4 key reasons for your assessment
- **Fiscal Impact**: Budget effect in concrete terms
- **Primary Beneficiaries**: Who this helps
- **Potential Concerns**: Risks, opposition arguments, implementation challenges
- **Political Viability**: Realistic passage outlook based on sponsorship, committee, and political climate

### For Legislator/Committee Questions
Include:
- Full names, titles, party (D/R/Other), district numbers
- Committee memberships and leadership positions
- Relevant voting patterns or policy priorities
- Relationship to the bill in question

## Response Principles

**BE SPECIFIC**:
- Use actual bill numbers (e.g., "Senate Bill S1234A")
- Name specific legislators (e.g., "Senator Jane Smith (D-SD12)")
- Cite exact committee names (e.g., "Assembly Standing Committee on Education")
- Reference specific bill sections (e.g., "Section 3(b) amends Education Law §212")

**BE CLEAR**:
- Avoid jargon; when technical terms are necessary, explain them
- Use bullet points and structured formatting for readability
- Highlight key takeaways

**BE ACTIONABLE**:
- Provide concrete insights users can act on
- Connect legislative details to real-world impacts
- Explain "so what?" - why this matters

**BE CONTEXTUAL**:
- If a user is viewing a bill PDF, reference specific sections they might be reading
- Connect related bills, amendments, or prior legislative history
- Link legislators to their committee roles and influence

**BE HONEST ABOUT LIMITATIONS**:
- If fiscal data isn't available, say so and explain what analysis is possible
- Acknowledge when passage likelihood is uncertain
- Distinguish between facts and informed speculation

## Special Capabilities

- **Cross-referencing**: Connect bills to related legislation, amendments, and legislative history
- **Pattern recognition**: Identify trends in legislator voting, committee actions, or policy areas
- **Impact projection**: Analyze how bills affect different stakeholder groups, regions, or industries
- **Process guidance**: Explain where a bill is in the legislative process and what comes next

## Tone & Style

- **Conversational yet authoritative**: Speak like a knowledgeable colleague, not a textbook
- **Impartial but not bland**: Present clear analysis without partisan bias
- **Empowering**: Help users feel confident in understanding and engaging with legislation
- **Efficient**: Respect user time - be comprehensive but concise

## Example Response Patterns

**User: "What does Bill S1234 actually do?"**
→ Lead with plain-language summary, then break down key provisions with specific section references, conclude with significance and stakeholders.

**User: "Should I support this bill?"**
→ Provide structured recommendation with clear reasoning, fiscal impact, beneficiaries, concerns, and political context.

**User: "How does this affect my district?"**
→ Ask for district if not specified, then analyze geographic/demographic impacts with specifics.

**User: "What's the likelihood of passage?"**
→ Assess based on sponsor influence, committee composition, party control, similar bill history, and current political climate.

## Your Mission

Enable every NYSgpt user - whether citizen, staffer, researcher, or professional - to deeply understand New York State legislation and make informed decisions about policy. You make the complex accessible and empower democratic engagement through knowledge.

---

**Remember**: You're not just providing information; you're translating legislative complexity into actionable insight. Every response should leave the user more informed and confident about NYS legislation.`,
    'default': `You are a legislative analysis expert with direct access to comprehensive New York State legislative data through the NYSgpt database and live NYS Legislature API.

IMPORTANT: You have complete access to:
- NYSgpt's Supabase database containing ALL NYS bills from current and recent sessions (2023, 2024, 2025, etc.)
- Live NYS Legislature API for real-time bill status and legislative actions
- Full legislator profiles, committee information, and voting records

When users ask about bills from 2025 or the current legislative session, you HAVE this data. Never claim you don't have access to "future" data - if it's from a recent or current session, the information is in your context.

Provide specific, detailed analysis using actual bill numbers, titles, sponsors, and current status. Always cite relevant bills with their actual bill numbers (e.g., A00405, S1234).`
  };

  // Prepend constitutional principles to the system prompt
  const constitutionalContext = getConstitutionalPrompt(type);
  let systemPrompt = `${constitutionalContext}\n\n${basePrompts[type] || basePrompts['default']}`;

  // Add entity-specific context
  if (entityData) {
    systemPrompt += `\n\nSPECIFIC ENTITY INFORMATION:\n${entityData}\n\nUse this information to provide detailed, specific answers about this entity.`;
  }

  if (context && typeof context === 'object' && context.nysData) {
    systemPrompt += `\n\nCURRENT NYS LEGISLATIVE DATA:\n${context.nysData}\n\nUse this information to provide accurate, up-to-date legislative analysis with specific details.`;
  }

  return systemPrompt;
}

// Enhanced function to search NYS legislation data with detailed information
async function searchNYSData(query, entityType = null, entityId = null) {
  if (!nysApiKey) {
    console.log('NYS API key not available, skipping legislative data search');
    return null;
  }

  try {
    const sessionYear = getCurrentSessionYear();
    const searchTypes = entityType ? [entityType] : ['bills', 'members', 'laws'];
    const results = {};

    for (const searchType of searchTypes) {
      try {
        let apiUrl;

        // If we have a specific entity ID, get detailed information
        if (entityId && entityType === searchType) {
          switch (searchType) {
            case 'bills':
              apiUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${entityId}?key=${nysApiKey}`;
              break;
            case 'members':
              apiUrl = `https://legislation.nysenate.gov/api/3/members/${sessionYear}/${entityId}?key=${nysApiKey}`;
              break;
            default:
              // Fall back to search
              apiUrl = `https://legislation.nysenate.gov/api/3/${searchType}/search?term=${encodeURIComponent(query)}&limit=10&key=${nysApiKey}`;
          }
        } else {
          // Enhanced search with more results for better context
          apiUrl = `https://legislation.nysenate.gov/api/3/${searchType}/search?term=${encodeURIComponent(query)}&limit=10&key=${nysApiKey}`;
        }
        
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.result?.items?.length > 0) {
              results[searchType] = data.result.items.slice(0, 5); // Increased to 5 for more context
            } else if (data.result && !data.result.items) {
              // Single entity response
              results[searchType] = [data.result];
            }
          }
        }
      } catch (error) {
        console.error(`Error searching ${searchType}:`, error);
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  } catch (error) {
    console.error('Error in NYS data search:', error);
    return null;
  }
}

// Enhanced function to format NYS data for comprehensive context
function formatNYSDataForContext(nysData) {
  if (!nysData) return '';

  let contextText = 'COMPREHENSIVE NYS LEGISLATIVE DATABASE INFORMATION:\n\n';

  if (nysData.bills) {
    contextText += 'CURRENT BILLS:\n';
    nysData.bills.forEach((bill, index) => {
      contextText += `${index + 1}. BILL ${bill.printNo || bill.basePrintNo}: ${bill.title || 'No title'}\n`;
      contextText += `   Current Status: ${bill.status?.statusDesc || 'Unknown'}\n`;
      contextText += `   Primary Sponsor: ${bill.sponsor?.member?.shortName || 'Unknown'} (${bill.sponsor?.member?.chamber || 'Unknown Chamber'})\n`;
      if (bill.status?.committeeName) {
        contextText += `   Committee: ${bill.status.committeeName}\n`;
      }
      if (bill.status?.actionDate) {
        contextText += `   Last Action Date: ${bill.status.actionDate}\n`;
      }
      if (bill.amendments?.items && Object.keys(bill.amendments.items).length > 0) {
        contextText += `   Amendments: ${Object.keys(bill.amendments.items).join(', ')}\n`;
      }
      contextText += '\n';
    });
  }

  if (nysData.members) {
    contextText += 'CURRENT MEMBERS:\n';
    nysData.members.forEach((member, index) => {
      contextText += `${index + 1}. ${member.shortName || member.fullName} (${member.chamber || 'Unknown Chamber'})\n`;
      contextText += `   District: ${member.districtCode || 'N/A'}\n`;
      if (member.imgName) {
        contextText += `   Party: Available in full profile\n`;
      }
      contextText += '\n';
    });
  }

  if (nysData.laws) {
    contextText += 'RELEVANT NEW YORK STATE LAWS:\n';
    nysData.laws.forEach((law, index) => {
      contextText += `${index + 1}. ${law.lawId}: ${law.name || law.title || 'No name available'}\n`;
      if (law.lawType) {
        contextText += `   Type: ${law.lawType}\n`;
      }
      contextText += '\n';
    });
  }

  return contextText;
}

// Search NYSgpt's Supabase database for bills
async function searchNYSgptDatabase(query: string, sessionYear?: number) {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Supabase credentials not available, skipping database search');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract bill numbers if present (e.g., A00405, S256, K123)
    const billNumberPattern = /[ASK]\d{1,}/gi;
    const billNumbers = query.match(billNumberPattern);

    // Extract year from query if not provided
    const yearPattern = /20\d{2}/g;
    const yearMatches = query.match(yearPattern);
    const extractedYear = yearMatches ? parseInt(yearMatches[yearMatches.length - 1]) : null;
    const targetYear = sessionYear || extractedYear || new Date().getFullYear();

    let billsData = [];

    // If specific bill numbers are mentioned, search for those first
    if (billNumbers && billNumbers.length > 0) {
      const { data, error } = await supabase
        .from('Bills')
        .select('*')
        .in('bill_number', billNumbers.map(bn => normalizeBillNumber(bn)))
        .limit(10);

      if (data && !error) {
        billsData = data;
      }
    }

    // If no specific bills found or no bill numbers mentioned, do keyword search
    if (billsData.length === 0) {
      // Extract keywords from query (remove common words and split into array)
      const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'but', 'bills', 'bill', 'legislation', 'about', 'tell', 'me', 'any', 'introduced', 'great', 'now'];
      const keywordArray = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word))
        .slice(0, 3); // Take top 3 keywords

      if (keywordArray.length > 0) {
        // Build OR conditions for each keyword searching both title and description
        const orConditions = keywordArray.flatMap(keyword => [
          `title.ilike.%${keyword}%`,
          `description.ilike.%${keyword}%`
        ]).join(',');

        const { data, error } = await supabase
          .from('Bills')
          .select('*')
          .or(orConditions)
          .order('session_id', { ascending: false })
          .limit(10);

        if (data && !error) {
          billsData = data;
          console.log(`Found ${billsData.length} bills for keywords: ${keywordArray.join(', ')}`);
        }
      }
    }

    // Fetch sponsors for found bills
    if (billsData.length > 0) {
      const billIds = billsData.map(b => b.bill_id);

      // Get sponsors with people info
      const { data: sponsorsData } = await supabase
        .from('Sponsors')
        .select('bill_id, position, people_id')
        .in('bill_id', billIds)
        .order('position');

      if (sponsorsData && sponsorsData.length > 0) {
        // Get people info for sponsors
        const peopleIds = [...new Set(sponsorsData.map(s => s.people_id).filter(Boolean))];
        const { data: peopleData } = await supabase
          .from('People')
          .select('people_id, name, party, chamber')
          .in('people_id', peopleIds);

        // Create lookup map for people
        const peopleMap = new Map();
        if (peopleData) {
          peopleData.forEach(p => peopleMap.set(p.people_id, p));
        }

        // Attach sponsor info to bills
        billsData = billsData.map(bill => {
          const billSponsors = sponsorsData.filter(s => s.bill_id === bill.bill_id);
          const primarySponsor = billSponsors.find(s => s.position === 1);
          const coSponsors = billSponsors.filter(s => s.position > 1);

          return {
            ...bill,
            primarySponsor: primarySponsor ? peopleMap.get(primarySponsor.people_id) : null,
            coSponsorCount: coSponsors.length
          };
        });
      }
    }

    return billsData.length > 0 ? billsData : null;
  } catch (error) {
    console.error('Error searching NYSgpt database:', error);
    return null;
  }
}

// Format NYSgpt database results for context
function formatNYSgptBillsForContext(bills: any[]) {
  if (!bills || bills.length === 0) return '';

  let contextText = '\n\nNYSGPT DATABASE - BILLS FROM SUPABASE:\n\n';

  bills.forEach((bill, index) => {
    contextText += `${index + 1}. BILL ${bill.bill_number}: ${bill.title || 'No title'}\n`;
    contextText += `   Session: ${bill.session_id || 'Unknown'}\n`;
    contextText += `   Status: ${bill.status_desc || 'Unknown'}\n`;
    // Primary Sponsor (position 1) - this is THE sponsor who introduced the bill
    if (bill.primarySponsor) {
      contextText += `   Primary Sponsor: ${bill.primarySponsor.name} (${bill.primarySponsor.party || 'Unknown Party'}, ${bill.primarySponsor.chamber || 'Unknown Chamber'})\n`;
    }
    // Co-Sponsors (position 2+) - legislators who added their support
    if (bill.coSponsorCount > 0) {
      contextText += `   Co-Sponsors: ${bill.coSponsorCount} additional legislator${bill.coSponsorCount > 1 ? 's' : ''}\n`;
    }
    if (bill.committee) {
      contextText += `   Committee: ${bill.committee}\n`;
    }
    if (bill.description) {
      contextText += `   Description: ${bill.description.substring(0, 200)}${bill.description.length > 200 ? '...' : ''}\n`;
    }
    if (bill.state_link) {
      contextText += `   Link: ${bill.state_link}\n`;
    }
    contextText += '\n';
  });

  return contextText;
}

// Search bill chunks using semantic (vector) similarity
async function searchSemanticBillChunks(query: string): Promise<any[] | null> {
  if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
    console.log('Missing credentials for semantic search, skipping');
    return null;
  }

  try {
    // Generate embedding for the query using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 256,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('Failed to generate query embedding:', embeddingResponse.status);
      return null;
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Call match_bill_chunks RPC
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const currentYear = new Date().getFullYear();
    const sessionYear = currentYear % 2 === 1 ? currentYear : currentYear - 1;

    const { data: matches, error } = await supabase.rpc('match_bill_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.55,
      match_count: 15,
      filter_session_id: sessionYear,
      filter_bill_number: null,
    });

    if (error) {
      console.error('Semantic search RPC error:', error.message);
      return null;
    }

    // Deduplicate: keep max 2 chunks per bill for diverse coverage
    const billChunkCounts = new Map<string, number>();
    const deduped = (matches || []).filter((chunk: any) => {
      const count = billChunkCounts.get(chunk.bill_number) || 0;
      if (count >= 2) return false;
      billChunkCounts.set(chunk.bill_number, count + 1);
      return true;
    });

    console.log(`Semantic search found ${matches?.length || 0} chunks, deduped to ${deduped.length} across ${billChunkCounts.size} bills`);
    return deduped.length > 0 ? deduped : null;
  } catch (error) {
    console.error('Error in semantic search:', error);
    return null;
  }
}

// Direct lookup of bill chunks by bill number (for specific bill queries)
async function fetchBillChunksByNumber(query: string): Promise<any[] | null> {
  if (!supabaseUrl || !supabaseServiceKey) return null;

  try {
    // Extract bill numbers from query
    const billNumberPattern = /[ASK]\d{1,}/gi;
    const billNumbers = query.match(billNumberPattern);
    if (!billNumbers || billNumbers.length === 0) return null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const normalized = billNumbers.map(bn => normalizeBillNumber(bn));

    const { data, error } = await supabase
      .from('bill_chunks')
      .select('bill_number, chunk_type, chunk_index, content')
      .in('bill_number', normalized)
      .order('bill_number')
      .order('chunk_index');

    if (error) {
      console.error('Bill chunks lookup error:', error.message);
      return null;
    }

    console.log(`Direct bill chunks lookup found ${data?.length || 0} chunks for ${normalized.join(', ')}`);
    return data && data.length > 0 ? data : null;
  } catch (error) {
    console.error('Error in bill chunks lookup:', error);
    return null;
  }
}

// Format direct bill chunks as full text context
function formatBillChunksForContext(chunks: any[]): string {
  if (!chunks || chunks.length === 0) return '';

  let contextText = '\n\nFULL BILL TEXT FROM NYSGPT DATABASE:\n\n';

  const byBill = new Map<string, any[]>();
  for (const chunk of chunks) {
    if (!byBill.has(chunk.bill_number)) byBill.set(chunk.bill_number, []);
    byBill.get(chunk.bill_number)!.push(chunk);
  }

  for (const [billNumber, billChunks] of byBill) {
    contextText += `=== BILL ${billNumber} - VERBATIM TEXT ===\n`;
    for (const chunk of billChunks) {
      contextText += chunk.content + '\n';
    }
    contextText += '\n';
  }

  return contextText;
}

// Format semantic search results for LLM context
function formatSemanticResultsForContext(chunks: any[]): string {
  if (!chunks || chunks.length === 0) return '';

  let contextText = '\n\nSEMANTIC SEARCH - RELEVANT BILL TEXT FROM NYSGPT DATABASE:\n\n';

  // Group chunks by bill_number
  const byBill = new Map<string, any[]>();
  for (const chunk of chunks) {
    const key = chunk.bill_number;
    if (!byBill.has(key)) byBill.set(key, []);
    byBill.get(key)!.push(chunk);
  }

  let billIndex = 1;
  for (const [billNumber, billChunks] of byBill) {
    contextText += `${billIndex}. BILL ${billNumber} (semantic match):\n`;
    for (const chunk of billChunks) {
      const label = chunk.chunk_type.toUpperCase();
      const similarity = (chunk.similarity * 100).toFixed(0);
      const excerpt = chunk.content.length > 500
        ? chunk.content.substring(0, 500) + '...'
        : chunk.content;
      contextText += `   [${label}] (${similarity}% relevance): ${excerpt}\n`;
    }
    contextText += '\n';
    billIndex++;
  }

  return contextText;
}

// Format conversation history for OpenAI messages array
// This helper can be reused across OpenAI, Claude, and Perplexity edge functions
function formatConversationHistory(previousMessages: any[]): { role: string; content: string }[] {
  if (!previousMessages || !Array.isArray(previousMessages) || previousMessages.length === 0) {
    return [];
  }

  return previousMessages
    .filter(msg => msg && msg.role && msg.content)
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      type = 'default',
      stream = true,
      model = 'gpt-4o-mini',
      context = null,
      entityContext = null,
      enhanceWithNYSData = true,
      fastMode = type === 'chat'
    } = await req.json();

    console.log('Generating content with OpenAI:', { type, model, promptLength: prompt?.length, stream, enhanceWithNYSData, context });

    // Validate OpenAI API key
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key must be configured in Supabase Edge Function Secrets');
    }

    // Enhanced search for relevant NYS legislative data and NYSgpt database
    let nysData = null;
    let nysgptBills = null;
    let semanticResults: any[] | null = null;
    let billChunksResults: any[] | null = null;
    let entityData = '';

    // Fast-path detection: skip NYS API for simple chat queries in fast mode
    // BUT always search NYSgpt database for legislative queries
    const shouldSkipNYSData = fastMode && !prompt.match(/[ASK]\d{1,}/gi) && type !== 'media' && context !== 'landing_page';

    // Start data searches in parallel (non-blocking)
    let nysDataPromise: Promise<any> | null = null;
    let nysgptDataPromise: Promise<any> | null = null;
    let semanticSearchPromise: Promise<any[] | null> | null = null;
    let billChunksPromise: Promise<any[] | null> | null = null;

    // Build comprehensive search query based on entity context
    let searchQuery = prompt;
    let entityId = null;

    if (entityContext?.bill) {
      searchQuery = entityContext.bill.bill_number || entityContext.bill.title || prompt;
      entityId = entityContext.bill.bill_number;
      entityData = `BILL INFORMATION:
Bill Number: ${entityContext.bill.bill_number || 'Unknown'}
Title: ${entityContext.bill.title || 'No title'}
Status: ${entityContext.bill.status_desc || 'Unknown'}
Committee: ${entityContext.bill.committee || 'No committee assigned'}
Last Action: ${entityContext.bill.last_action || 'No recent action'}
Description: ${entityContext.bill.description || 'No description'}`;
    } else if (entityContext?.member) {
      searchQuery = entityContext.member.name || prompt;
      entityId = entityContext.member.people_id;
      entityData = `MEMBER INFORMATION:
Name: ${entityContext.member.name || 'Unknown'}
Party: ${entityContext.member.party || 'Unknown'}
District: ${entityContext.member.district || 'Unknown'}
Chamber: ${entityContext.member.chamber || 'Unknown'}
Role: ${entityContext.member.role || 'Unknown'}
Email: ${entityContext.member.email || 'Not available'}
Phone: ${entityContext.member.phone_capitol || 'Not available'}`;
    } else if (entityContext?.committee) {
      searchQuery = entityContext.committee.committee_name || prompt;
      entityData = `COMMITTEE INFORMATION:
Name: ${entityContext.committee.committee_name || 'Unknown'}
Chamber: ${entityContext.committee.chamber || 'Unknown'}
Chair: ${entityContext.committee.chair_name || 'Unknown'}
Description: ${entityContext.committee.description || 'No description'}
Member Count: ${entityContext.committee.member_count || 'Unknown'}`;
    }

    // Always search NYSgpt database for chat queries (critical for answering questions about bills)
    if (type === 'chat' || type === 'default' || !shouldSkipNYSData) {
      nysgptDataPromise = searchNYSgptDatabase(searchQuery);
    }

    // Start semantic search in parallel (searches bill body text via pgvector embeddings)
    if (type === 'chat' || type === 'default') {
      semanticSearchPromise = searchSemanticBillChunks(searchQuery);

      // Fetch full bill text: from current query OR from recent conversation history
      let billLookupQuery = searchQuery;
      if (!searchQuery.match(/[ASK]\d{1,}/gi) && context?.previousMessages?.length > 0) {
        // No bill number in current query — check last 3 messages for bill numbers
        const recentMessages = (context.previousMessages as any[]).slice(-3);
        const historyText = recentMessages.map((m: any) => m.content || '').join(' ');
        const historyBills = historyText.match(/[ASK]\d{1,}/gi);
        if (historyBills) {
          billLookupQuery = [...new Set(historyBills)].join(' ');
          console.log(`No bill in query, found bills in conversation history: ${billLookupQuery}`);
        }
      }
      if (billLookupQuery.match(/[ASK]\d{1,}/gi)) {
        billChunksPromise = fetchBillChunksByNumber(billLookupQuery);
      }
    }

    // Start NYS API search if appropriate
    if (enhanceWithNYSData && nysApiKey && !shouldSkipNYSData && type !== 'media' && context !== 'landing_page') {
      nysDataPromise = searchNYSData(searchQuery, entityContext?.type, entityId);
    }

    // IMPORTANT: Always wait for NYSgpt database search before generating response
    // This ensures AI has context even for streaming responses
    if (nysgptDataPromise) {
      nysgptBills = await nysgptDataPromise;
      console.log(`NYSgpt database search found ${nysgptBills?.length || 0} bills`);
    }

    // Wait for semantic search results (runs in parallel with above)
    if (semanticSearchPromise) {
      semanticResults = await semanticSearchPromise;
      console.log(`Semantic search found ${semanticResults?.length || 0} relevant chunks`);
    }

    // Wait for direct bill chunks lookup (full text for specific bills)
    if (billChunksPromise) {
      billChunksResults = await billChunksPromise;
      console.log(`Direct bill chunks lookup found ${billChunksResults?.length || 0} chunks`);
    }

    // For non-streaming, also wait for NYS API data
    if (!stream && nysDataPromise) {
      nysData = await nysDataPromise;
      console.log(`NYS API search completed`);
    }

    // Build enhanced context with all available information
    const contextObj = {
      nysData: nysData ? formatNYSDataForContext(nysData) : null,
      nysgptData: nysgptBills ? formatNYSgptBillsForContext(nysgptBills) : null
    };

    // Combine all context data
    let combinedContext = entityData;
    if (contextObj.nysData) {
      combinedContext += `\n\n${contextObj.nysData}`;
    }
    if (contextObj.nysgptData) {
      combinedContext += `\n\n${contextObj.nysgptData}`;
    }
    if (semanticResults && semanticResults.length > 0) {
      combinedContext += formatSemanticResultsForContext(semanticResults);
    }
    // Add full bill text when a specific bill number was queried
    if (billChunksResults && billChunksResults.length > 0) {
      combinedContext += formatBillChunksForContext(billChunksResults);
    }

    let systemPrompt = getSystemPrompt(type, combinedContext ? { nysData: combinedContext } : context, entityData);

    // Append platform features awareness for chat-type queries
    if (type === 'chat' || type === 'default') {
      systemPrompt += `\n\n${PLATFORM_FEATURES_PROMPT}`;
    }

    // When frontend provides a composed systemContext (via systemPromptComposer),
    // use it as the primary prompt — only prepend constitutional principles.
    // Internal prompt building is kept as fallback for requests without systemContext.
    if (context?.systemContext) {
      const constitutionalContext = getConstitutionalPrompt(type);
      systemPrompt = `${constitutionalContext}\n\n${context.systemContext}\n\n${PLATFORM_FEATURES_PROMPT}`;
      // Append backend-enriched data (keyword + semantic search results) so it's not lost
      if (combinedContext) {
        systemPrompt += `\n\nCURRENT NYS LEGISLATIVE DATA:\n${combinedContext}\n\nIMPORTANT: Use the specific bill data above to ground your response. Cite actual bill numbers, sponsors, and details from this data rather than relying on general knowledge.`;
      }
      console.log('Using frontend-composed systemContext with backend data appended');
    }

    const enhancedPrompt = combinedContext ?
      `${prompt}\n\n[IMPORTANT: Use the comprehensive legislative database information provided in your system context to give specific, detailed answers with exact bill numbers, names, and current information. You have access to the complete NYSgpt database containing all NYS bills, plus live NYS API data.]` :
      prompt;

    // Build conversation history from previous messages
    // The frontend sends previousMessages in context.previousMessages
    const conversationHistory = formatConversationHistory(context?.previousMessages || []);
    console.log(`Including ${conversationHistory.length} previous messages for context`);

    // Build the complete messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Include previous conversation for context (if any)
      ...conversationHistory,
      // Current user message
      { role: 'user', content: enhancedPrompt }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: stream,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    if (stream) {
      // Return streaming response
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked'
        },
      });
    } else {
      // Return complete response
      const data = await response.json();
      const generatedText = data.choices[0].message.content;

      console.log('OpenAI content generated successfully with NYS data enhancement:', !!nysData);

      return new Response(JSON.stringify({
        generatedText,
        nysDataUsed: !!nysData,
        searchResults: nysData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-with-openai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
