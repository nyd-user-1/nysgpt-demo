import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getConstitutionalPrompt } from '../_shared/constitution.ts';
import { PLATFORM_FEATURES_PROMPT } from '../_shared/platformFeatures.ts';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const nysApiKey = Deno.env.get('NYS_LEGISLATION_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get current NY legislative session year (odd years)
function getCurrentSessionYear(): number {
  const currentYear = new Date().getFullYear();
  // NY legislative sessions run on odd years
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

// Search NYSgpt's Supabase database for relevant bills
async function searchNYSgptDatabase(query: string, sessionYear?: number) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract bill numbers from query (e.g., A00405, S256, K123)
    const billNumberPattern = /[ASK]\d{1,}/gi;
    const billNumbers = query.match(billNumberPattern) || [];

    console.log('Searching NYSgpt database with query:', query.substring(0, 100));
    console.log('Extracted bill numbers:', billNumbers);

    let results: any[] = [];

    // If specific bill numbers mentioned, fetch those
    if (billNumbers.length > 0) {
      const { data, error } = await supabase
        .from('Bills')
        .select('*')
        .in('bill_number', billNumbers.map(b => normalizeBillNumber(b)))
        .limit(10);

      if (!error && data) {
        results = data;
        console.log(`Found ${data.length} bills by number`);
      }
    }

    // If no results yet, do keyword search
    if (results.length === 0) {
      const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'but', 'bills', 'bill', 'legislation', 'about', 'tell', 'me', 'any', 'introduced', 'great', 'now', 'what', 'does', 'their', 'this', 'that', 'with', 'from', 'have', 'been', 'they', 'member', 'assembly', 'senate', 'senator', 'legislator', 'representative'];

      // Extract keywords (filter out stop words, take top 3)
      const keywordArray = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word))
        .slice(0, 3);

      console.log('Extracted keywords:', keywordArray);

      if (keywordArray.length > 0) {
        // Build OR conditions for each keyword
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

        if (!error && data) {
          results = data;
          console.log(`Found ${data.length} bills for keywords: ${keywordArray.join(', ')}`);
        } else if (error) {
          console.error('Keyword search error:', error);
        }
      }

      // If still no bills found, try member-based search (find bills by sponsor name)
      if (results.length === 0 && keywordArray.length > 0) {
        const nameConditions = keywordArray
          .filter(k => k.length > 3)
          .map(k => `name.ilike.%${k}%`)
          .join(',');

        if (nameConditions) {
          const { data: memberData } = await supabase
            .from('People')
            .select('people_id, name, party, chamber, district')
            .or(nameConditions)
            .limit(5);

          if (memberData && memberData.length > 0) {
            console.log(`Found ${memberData.length} members matching keywords, fetching their bills`);
            const peopleIds = memberData.map(m => m.people_id);

            const { data: sponsorData } = await supabase
              .from('Sponsors')
              .select('bill_id, people_id')
              .in('people_id', peopleIds)
              .eq('position', 1)
              .limit(30);

            if (sponsorData && sponsorData.length > 0) {
              const billIds = sponsorData.map(s => s.bill_id).filter(Boolean);
              const { data: memberBills } = await supabase
                .from('Bills')
                .select('*')
                .in('bill_id', billIds)
                .order('session_id', { ascending: false })
                .limit(10);

              if (memberBills && memberBills.length > 0) {
                results = memberBills;
                console.log(`Found ${results.length} bills sponsored by matched members`);
              }
            }
          }
        }
      }

      // If still no bills found, try committee-based search
      if (results.length === 0 && keywordArray.length > 0) {
        const committeeConditions = keywordArray
          .filter(k => k.length > 3)
          .map(k => `committee.ilike.%${k}%`)
          .join(',');

        if (committeeConditions) {
          const { data: committeeBills } = await supabase
            .from('Bills')
            .select('*')
            .or(committeeConditions)
            .order('session_id', { ascending: false })
            .limit(10);

          if (committeeBills && committeeBills.length > 0) {
            results = committeeBills;
            console.log(`Found ${results.length} bills by committee match`);
          }
        }
      }
    }

    // Fetch sponsors for found bills
    if (results.length > 0) {
      const billIds = results.map(b => b.bill_id);

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
        results = results.map(bill => {
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

    return results;
  } catch (error) {
    console.error('Error searching NYSgpt database:', error);
    return [];
  }
}

// Search NYS Legislature API for live data
async function searchNYSData(query: string) {
  if (!nysApiKey) {
    console.log('NYS API key not available, skipping live legislative data search');
    return null;
  }

  try {
    const sessionYear = getCurrentSessionYear();
    const searchTypes = ['bills'];
    const results: any = {};

    for (const searchType of searchTypes) {
      try {
        const apiUrl = `https://legislation.nysenate.gov/api/3/${searchType}/search?term=${encodeURIComponent(query)}&limit=10&key=${nysApiKey}`;

        const response = await fetch(apiUrl);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.result?.items?.length > 0) {
            results[searchType] = data.result.items.slice(0, 5);
            console.log(`Found ${results[searchType].length} ${searchType} from NYS API`);
          }
        }
      } catch (error) {
        console.error(`Error searching NYS API ${searchType}:`, error);
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  } catch (error) {
    console.error('Error in NYS data search:', error);
    return null;
  }
}

// Format NYS API data for context
function formatNYSDataForContext(nysData: any) {
  if (!nysData) return '';

  let contextText = '\n\nLIVE NYS LEGISLATURE API DATA:\n\n';

  if (nysData.bills) {
    contextText += 'CURRENT BILLS FROM NYS API:\n';
    nysData.bills.forEach((bill: any, index: number) => {
      const b = bill.result || bill;
      contextText += `${index + 1}. BILL ${b.printNo || b.basePrintNo}: ${b.title || 'No title'}\n`;
      contextText += `   Current Status: ${b.status?.statusDesc || 'Unknown'}\n`;
      contextText += `   Primary Sponsor: ${b.sponsor?.member?.shortName || 'Unknown'}\n`;
      if (b.status?.committeeName) {
        contextText += `   Committee: ${b.status.committeeName}\n`;
      }
      // Extract companion/same-as bills from amendments
      const amendments = b.amendments?.items;
      if (amendments) {
        const latestVersion = Object.keys(amendments).pop();
        const sameAs = latestVersion ? amendments[latestVersion]?.sameAs?.items : null;
        if (sameAs && sameAs.length > 0) {
          contextText += `   Companion Bill(s) (Same-As): ${sameAs.map((s: any) => s.printNo || s.basePrintNo).join(', ')}\n`;
        }
      }
      contextText += '\n';
    });
  }

  return contextText;
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

// Parse comma-formatted budget text values (e.g. "472,101,800") to numbers
function parseBudgetNum(val: any): number {
  if (val == null || val === '') return 0;
  const n = Number(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtBudget(val: any): string {
  return `$${parseBudgetNum(val).toLocaleString()}`;
}

// Search budget tables for agency/program data
async function searchBudgetData(query: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stopWords = ['tell', 'about', 'budget', 'appropriation', 'spending', 'what', 'this', 'funding', 'used', 'from', 'prior', 'year', 'recent', 'years', 'changed', 'trends', 'capital', 'project'];
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w))
      .slice(0, 3);

    if (keywords.length === 0) return '';

    const parts: string[] = [];
    const agencyConditions = keywords.map(k => `"Agency Name".ilike.%${k}%`).join(',');
    const spendConditions = keywords.map(k => `"Agency".ilike.%${k}%`).join(',');

    // Run all 3 budget table queries in parallel
    const [apropsResult, capResult, spendResult] = await Promise.all([
      supabase.from('budget_2027-aprops').select('*').or(agencyConditions).limit(25),
      supabase.from('budget_2027_capital_aprops').select('*').or(agencyConditions).limit(20),
      supabase.from('budget_2027_spending')
        .select('"Agency", "Function", "FP Category", "Fund", "Fund Type", "2016-17 Actuals", "2017-18 Actuals", "2018-19 Actuals", "2019-20 Actuals", "2020-21 Actuals", "2021-22 Actuals", "2022-23 Actuals", "2023-24 Actuals", "2024-25 Actuals", "2025-26 Estimates", "2026-27 Estimates"')
        .or(spendConditions)
        .limit(25),
    ]);

    const aprops = apropsResult.data;
    const capAprops = capResult.data;
    const spending = spendResult.data;

    if (aprops && aprops.length > 0) {
      parts.push(`\n\nBUDGET APPROPRIATIONS DATA (${aprops.length} records from NYSgpt database):`);
      for (const row of aprops) {
        const prog = row['Program Name'] ? ` — ${row['Program Name']}` : '';
        parts.push(`- ${row['Agency Name']}${prog} | ${row['Appropriation Category'] || ''} | Fund: ${row['Fund Name'] || ''} (${row['Fund Type'] || ''}) | Available 2025-26: ${fmtBudget(row['Appropriations Available 2025-26'])} | Recommended 2026-27: ${fmtBudget(row['Appropriations Recommended 2026-27'])} | Reappropriations: ${fmtBudget(row['Reappropriations Recommended 2026-27'])}`);
      }
    }

    if (capAprops && capAprops.length > 0) {
      parts.push(`\n\nCAPITAL BUDGET APPROPRIATIONS (${capAprops.length} records):`);
      for (const row of capAprops) {
        const desc = row['Description'] || 'No description';
        parts.push(`- ${row['Program Name'] || ''}: ${desc} | Recommended: ${fmtBudget(row['Appropriations Recommended 2026-27'])} | Reappropriations: ${fmtBudget(row['Reappropriations Recommended 2026-27'])} | Encumbrance: ${fmtBudget(row['Encumbrance as of 1/16/2026'])} | Source: ${row['Financing Source'] || ''}`);
      }
    }

    if (spending && spending.length > 0) {
      parts.push(`\n\nBUDGET SPENDING HISTORY (${spending.length} records, 10-year actuals + estimates):`);
      for (const row of spending) {
        parts.push(`- ${row['Agency']} | ${row['Function'] || ''} | ${row['FP Category'] || ''} | ${row['Fund'] || ''} | 2016-17: ${fmtBudget(row['2016-17 Actuals'])} | 2017-18: ${fmtBudget(row['2017-18 Actuals'])} | 2018-19: ${fmtBudget(row['2018-19 Actuals'])} | 2019-20: ${fmtBudget(row['2019-20 Actuals'])} | 2020-21: ${fmtBudget(row['2020-21 Actuals'])} | 2021-22: ${fmtBudget(row['2021-22 Actuals'])} | 2022-23: ${fmtBudget(row['2022-23 Actuals'])} | 2023-24: ${fmtBudget(row['2023-24 Actuals'])} | 2024-25: ${fmtBudget(row['2024-25 Actuals'])} | 2025-26 Est: ${fmtBudget(row['2025-26 Estimates'])} | 2026-27 Est: ${fmtBudget(row['2026-27 Estimates'])}`);
      }
    }

    console.log(`Budget search found ${aprops?.length || 0} appropriations, ${capAprops?.length || 0} capital, ${spending?.length || 0} spending records`);
    return parts.join('\n');
  } catch (error) {
    console.error('Error searching budget data:', error);
    return '';
  }
}

// Search contracts table for agency/vendor data
async function searchContractData(query: string, conversationContext?: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stopWords = ['tell', 'about', 'contract', 'contracts', 'vendor', 'what', 'this', 'does', 'have', 'grant', 'procurement', 'with', 'related', 'their', 'them', 'show'];

    // Combine current query with conversation context for keyword extraction
    const searchText = conversationContext ? `${query} ${conversationContext}` : query;
    const keywords = searchText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w))
      .slice(0, 4);

    if (keywords.length === 0) return '';

    const deptConditions = keywords.map(k => `department_facility.ilike.%${k}%`).join(',');
    const vendorConditions = keywords.map(k => `vendor_name.ilike.%${k}%`).join(',');

    // Search by department AND vendor in parallel
    const [deptResult, vendorResult] = await Promise.all([
      supabase.from('Contracts').select('contract_number, vendor_name, department_facility, contract_type, current_contract_amount, spending_to_date, contract_start_date, contract_end_date, contract_description').or(deptConditions).order('current_contract_amount', { ascending: false, nullsFirst: false }).limit(15),
      supabase.from('Contracts').select('contract_number, vendor_name, department_facility, contract_type, current_contract_amount, spending_to_date, contract_start_date, contract_end_date, contract_description').or(vendorConditions).order('current_contract_amount', { ascending: false, nullsFirst: false }).limit(10),
    ]);

    // Merge and deduplicate by contract_number
    const seen = new Set<string>();
    const allContracts: any[] = [];
    for (const row of [...(deptResult.data || []), ...(vendorResult.data || [])]) {
      if (row.contract_number && !seen.has(row.contract_number)) {
        seen.add(row.contract_number);
        allContracts.push(row);
      }
    }

    // Sort by amount descending
    allContracts.sort((a, b) => (b.current_contract_amount || 0) - (a.current_contract_amount || 0));
    const contracts = allContracts.slice(0, 20);

    if (contracts.length === 0) return '';

    const parts: string[] = [];
    parts.push(`\n\nSTATE CONTRACTS DATA (${contracts.length} contracts from NYSgpt database):`);

    let totalAmount = 0;
    let totalSpent = 0;
    for (const c of contracts) {
      const amt = c.current_contract_amount || 0;
      const spent = parseBudgetNum(c.spending_to_date);
      totalAmount += amt;
      totalSpent += spent;
      const pctSpent = amt > 0 ? ((spent / amt) * 100).toFixed(1) : '0.0';
      parts.push(`- ${c.contract_number}: ${c.vendor_name} | Dept: ${c.department_facility} | Type: ${c.contract_type || ''} | Amount: $${amt.toLocaleString()} | Spent: $${spent.toLocaleString()} (${pctSpent}%) | ${c.contract_start_date || ''} to ${c.contract_end_date || ''} | ${c.contract_description || ''}`);
    }
    parts.push(`\nTOTAL: ${contracts.length} contracts worth $${totalAmount.toLocaleString()}, $${totalSpent.toLocaleString()} spent to date`);

    console.log(`Contract search found ${contracts.length} contracts worth $${totalAmount.toLocaleString()}`);
    return parts.join('\n');
  } catch (error) {
    console.error('Error searching contract data:', error);
    return '';
  }
}

// Format conversation history for Claude messages array
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

// Claude-specific system prompt for NYSgpt
const CLAUDE_SYSTEM_PROMPT = `# System Prompt for NYSgpt NY State Legislative Analysis AI

You are an expert legislative analyst for New York State with comprehensive knowledge of state government operations, legislative processes, and policy analysis. You assist users of NYSgpt, a legislative policy platform, in understanding and analyzing NYS legislation.

## Your Core Identity

You are a knowledgeable, impartial policy analyst who combines deep expertise in New York State government with the ability to explain complex legislation in clear, accessible language. You provide evidence-based analysis while maintaining professional objectivity.

## Available Data & Context

You have DIRECT ACCESS to comprehensive, up-to-date legislative data through TWO sources:

1. **NYSgpt's Complete Database (Supabase)**:
   - Contains ALL New York State bills from multiple sessions including current and future sessions (2023, 2024, 2025, and beyond)
   - The system automatically searches this database for relevant bills based on user queries
   - Returns bill metadata: bill numbers, titles, descriptions, sponsors, status, committee assignments

2. **User-provided context**:
   - Bill texts, PDFs, or specific legislative documents
   - Context from their current view or research

**IMPORTANT**: When users ask about bills from 2025 or the current session, you have COMPLETE ACCESS to this data through the NYSgpt database. The database is searched automatically and relevant bills are provided to you. Always use the specific bill data provided to you in each conversation.

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

**Remember**: You're not just providing information; you're translating legislative complexity into actionable insight. Every response should leave the user more informed and confident about NYS legislation.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      model = 'claude-haiku-4-5-20251001',
      stream = true,
      context = null,
      domainFiltering = null,
      type = 'chat',
      fastMode = type === 'chat'
    } = await req.json();

    console.log('Generating with Claude:', { model, promptLength: prompt?.length, hasContext: !!context, stream, fastMode });

    if (!anthropicApiKey) {
      console.error('Anthropic API key not configured');
      throw new Error('Claude requires Anthropic API key to be configured in Supabase Edge Function Secrets');
    }

    // Search NYSgpt database AND conditionally search NYS API
    let nysgptBills: any[] = [];
    let nysData: any = null;
    let semanticResults: any[] | null = null;
    let billChunksResults: any[] | null = null;

    // Fast-path detection: skip NYS API for simple chat queries in fast mode
    // BUT always search NYSgpt database for legislative queries
    const shouldSkipNYSData = fastMode && !prompt.match(/[ASK]\d{1,}/gi) && type !== 'media' && context !== 'landing_page';

    // Start data searches in parallel (non-blocking)
    let nysDataPromise: Promise<any> | null = null;
    const nysgptDataPromise = searchNYSgptDatabase(prompt, getCurrentSessionYear());
    const semanticSearchPromise = searchSemanticBillChunks(prompt);
    const budgetKeywords = /budget|appropriat|spending|fiscal|funding|agency|department/i;
    const budgetDataPromise = budgetKeywords.test(prompt) ? searchBudgetData(prompt) : null;

    // Start contract data search for contract-related queries
    const contractKeywords = /contract|vendor|procurement|grant|awarded|bidder/i;
    const fullQueryContext = prompt + (context?.previousMessages?.length > 0
      ? ' ' + (context.previousMessages as any[]).slice(-3).map((m: any) => m.content || '').join(' ')
      : '');
    const conversationCtx = context?.previousMessages?.length > 0
      ? (context.previousMessages as any[]).slice(-3).filter((m: any) => m.role === 'user').map((m: any) => m.content || '').join(' ')
      : undefined;
    const contractDataPromise = contractKeywords.test(fullQueryContext) ? searchContractData(prompt, conversationCtx) : null;

    // Fetch full bill text: from current query OR from recent conversation history
    let billLookupQuery = prompt;
    if (!prompt.match(/[ASK]\d{1,}/gi) && context?.previousMessages?.length > 0) {
      const recentMessages = (context.previousMessages as any[]).slice(-3);
      const historyText = recentMessages.map((m: any) => m.content || '').join(' ');
      const historyBills = historyText.match(/[ASK]\d{1,}/gi);
      if (historyBills) {
        billLookupQuery = [...new Set(historyBills)].join(' ');
        console.log(`No bill in query, found bills in conversation history: ${billLookupQuery}`);
      }
    }
    const billChunksPromise = billLookupQuery.match(/[ASK]\d{1,}/gi) ? fetchBillChunksByNumber(billLookupQuery) : null;

    // Start NYS API search if appropriate
    if (nysApiKey && !shouldSkipNYSData) {
      nysDataPromise = searchNYSData(prompt);
    }

    // IMPORTANT: Always wait for NYSgpt database search before generating response
    // This ensures AI has context even for streaming responses
    nysgptBills = await nysgptDataPromise;
    console.log(`NYSgpt database search found ${nysgptBills?.length || 0} bills`);

    // Wait for semantic search results (runs in parallel with above)
    semanticResults = await semanticSearchPromise;
    console.log(`Semantic search found ${semanticResults?.length || 0} relevant chunks`);

    // Wait for direct bill chunks lookup (full text for specific bills)
    if (billChunksPromise) {
      billChunksResults = await billChunksPromise;
      console.log(`Direct bill chunks lookup found ${billChunksResults?.length || 0} chunks`);
    }

    // Wait for NYS API data when: non-streaming, OR bill-specific query (for companion bill info)
    const hasBillNumber = !!prompt.match(/[ASK]\d{1,}/gi);
    if (nysDataPromise && (!stream || hasBillNumber)) {
      nysData = await nysDataPromise;
      console.log(`NYS API search found ${nysData?.bills?.length || 0} bills`);
    } else if (shouldSkipNYSData) {
      console.log('Skipping NYS API search (fast mode enabled)');
    }

    // Build enhanced context with all available information
    let legislativeContext = '';

    // Add NYSgpt database results
    if (nysgptBills && nysgptBills.length > 0) {
      legislativeContext += formatNYSgptBillsForContext(nysgptBills);
    }

    // Add NYS API results
    if (nysData) {
      legislativeContext += formatNYSDataForContext(nysData);
    }

    // Add semantic search results (bill body text matched by meaning)
    if (semanticResults && semanticResults.length > 0) {
      legislativeContext += formatSemanticResultsForContext(semanticResults);
    }

    // Add full bill text when a specific bill number was queried
    if (billChunksResults && billChunksResults.length > 0) {
      legislativeContext += formatBillChunksForContext(billChunksResults);
    }

    // Add budget data when query is budget-related
    if (budgetDataPromise) {
      const budgetData = await budgetDataPromise;
      if (budgetData) {
        legislativeContext += budgetData;
        console.log('Budget data appended to legislative context');
      }
    }

    // Add contract data when query is contract-related
    if (contractDataPromise) {
      const contractData = await contractDataPromise;
      if (contractData) {
        legislativeContext += contractData;
        console.log('Contract data appended to legislative context');
      }
    }

    // Build the enhanced system prompt with constitutional principles and legislative data
    const constitutionalContext = getConstitutionalPrompt(type || 'chat');
    let enhancedSystemPrompt = `${constitutionalContext}\n\n${CLAUDE_SYSTEM_PROMPT}\n\n${PLATFORM_FEATURES_PROMPT}`;

    // When frontend provides a composed systemContext (via systemPromptComposer),
    // use it as the primary prompt — only prepend constitutional principles.
    // Internal CLAUDE_SYSTEM_PROMPT is kept as fallback for requests without systemContext.
    if (context?.systemContext) {
      enhancedSystemPrompt = `${constitutionalContext}\n\n${context.systemContext}\n\n${PLATFORM_FEATURES_PROMPT}`;
      console.log('Using frontend-composed systemContext (replaced internal prompt)');
    }

    if (legislativeContext) {
      enhancedSystemPrompt += `\n\nCURRENT LEGISLATIVE DATA:\n${legislativeContext}\n\nIMPORTANT DATA GROUNDING RULES:
- Use the specific data above to ground your response. Cite actual bill numbers, sponsors, amounts, and details rather than relying on general knowledge. These are real records from the NYSgpt database.
- If BUDGET data is present above (appropriations, capital, spending), present the actual dollar amounts and trends from this data. NYSgpt has 32 years of spending history and 2 years of appropriation recommendations.
- If CONTRACT data is present above, present the actual contracts with vendor names, amounts, and spend percentages. Do NOT redirect users to external sources like the State Comptroller's website — NYSgpt has this data.
- If a user asks about legislation related to a budget topic and no bills directly target that agency/program, do NOT say "the NYSgpt database does not list" or frame it as a limitation. Instead say: "There are no bills presently before the legislature directly targeting [topic]." Then highlight the budget and spending data that IS available and direct them to the [Budget Explorer](/budget) page.
- When bills ARE found that relate to the topic, present them with full details (bill number, title, sponsor, status, committee).`;
    }

    // Build user message
    const userMessage = legislativeContext
      ? `${prompt}\n\n[IMPORTANT: Use the comprehensive legislative database information provided in your system context to give specific, detailed answers with exact bill numbers, titles, and current information.]`
      : prompt;

    // Build conversation history from previous messages
    const conversationHistory = formatConversationHistory(context?.previousMessages || []);
    console.log(`Including ${conversationHistory.length} previous messages for context`);

    // Build the complete messages array with conversation history
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    // Call Claude API with correct authentication header
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,  // CORRECT: Use x-api-key, not Authorization Bearer
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        messages: messages,  // Full conversation history + current message
        system: enhancedSystemPrompt,  // Send enhanced system prompt with legislative data
        temperature: 0.7,
        stream: stream,  // Enable streaming
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    if (stream) {
      // Return streaming response
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Return complete response
      const data = await response.json();
      const generatedText = data.content[0].text;

      console.log('Claude response generated successfully');

      return new Response(JSON.stringify({
        generatedText,
        model: model
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-with-claude function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
