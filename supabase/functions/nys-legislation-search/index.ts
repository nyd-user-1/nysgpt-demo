
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const nysApiKey = Deno.env.get('NYS_LEGISLATION_API_KEY');
const REQUEST_DELAY_MS = 100; // Respectful rate limiting
const BATCH_SIZE = 100; // For batch inserts

// Normalize bill number by uppercasing and stripping leading zeros (e.g. "S00256" → "S256")
function normalizeBillNumber(billNumber: string | null | undefined): string {
  if (!billNumber) return '';
  const match = billNumber.trim().toUpperCase().match(/^([A-Z])(\d+)([A-Z]?)$/);
  if (!match) return billNumber.toUpperCase();
  const [, prefix, digits, suffix] = match;
  return `${prefix}${digits.replace(/^0+/, '') || '0'}${suffix}`;
}

// Get current NY legislative session year (odd years)
function getCurrentSessionYear(): number {
  const currentYear = new Date().getFullYear();
  return currentYear % 2 === 1 ? currentYear : currentYear - 1;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action, searchType, query, sessionYear, limit = 20, lawId, billNumber } = requestBody;

    if (!nysApiKey) {
      throw new Error('NYS Legislation API key not configured');
    }

    // Handle different actions
    if (action === 'sync-laws') {
      return await syncAllLaws();
    } else if (action === 'sync-law' && lawId) {
      return await syncSingleLaw(lawId);
    } else if (action === 'sync-bills') {
      return await syncRecentBills(sessionYear || getCurrentSessionYear());
    } else if (action === 'resync') {
      const batchSize = requestBody.batchSize || 50;
      const offset = requestBody.offset || 0;
      return await resyncExistingBills(sessionYear || getCurrentSessionYear(), batchSize, offset);
    } else if (action === 'diagnose-sync') {
      return await diagnoseSyncEndpoints(sessionYear || getCurrentSessionYear());
    } else if (action === 'add-bill' && billNumber) {
      return await addNewBill(billNumber, sessionYear || getCurrentSessionYear());
    } else if (action === 'resync-bill' && billNumber) {
      return await resyncSingleBill(billNumber, sessionYear || getCurrentSessionYear());
    } else if (action === 'get-progress') {
      return await getProgress();
    } else if (action === 'get-bill-detail' && billNumber) {
      return await getBillDetail(billNumber, sessionYear, requestBody.view, requestBody.fullTextFormat);
    } else {
      // Default to search functionality
      return await handleSearch(searchType, query, sessionYear, limit);
    }
  } catch (error) {
    console.error('Error in nys-legislation-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleSearch(searchType: string, query: string, sessionYear?: number, limit = 20) {
  console.warn('NYS API search request:', { searchType, query, sessionYear, limit });

  let apiUrl = '';
  
  switch (searchType) {
    case 'bills':
      apiUrl = `https://legislation.nysenate.gov/api/3/bills/search?term=${encodeURIComponent(query)}&limit=${limit}&key=${nysApiKey}`;
      if (sessionYear) {
        apiUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/search?term=${encodeURIComponent(query)}&limit=${limit}&key=${nysApiKey}`;
      }
      break;
    case 'members':
      apiUrl = `https://legislation.nysenate.gov/api/3/members/search?term=${encodeURIComponent(query)}&limit=${limit}&key=${nysApiKey}`;
      break;
    case 'laws':
      apiUrl = `https://legislation.nysenate.gov/api/3/laws/search?term=${encodeURIComponent(query)}&limit=${limit}&key=${nysApiKey}`;
      break;
    case 'agendas':
      apiUrl = `https://legislation.nysenate.gov/api/3/agendas/search?term=${encodeURIComponent(query)}&limit=${limit}&key=${nysApiKey}`;
      break;
    case 'calendars':
      apiUrl = `https://legislation.nysenate.gov/api/3/calendars/search?term=${encodeURIComponent(query)}&limit=${limit}&key=${nysApiKey}`;
      break;
    default:
      throw new Error('Invalid search type');
  }

  console.warn('Calling NYS API:', apiUrl.replace(nysApiKey, 'REDACTED'));

  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    console.error('NYS API error:', response.status, response.statusText);
    throw new Error(`NYS API error: ${response.status}`);
  }

  const data = await response.json();
  console.warn('NYS API response received, items:', data.result?.items?.length || 0);

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncAllLaws() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  console.log("Starting sync with URLs:", { supabaseUrl: supabaseUrl ? "SET" : "MISSING", apiKey: nysApiKey ? "SET" : "MISSING" });
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  if (!nysApiKey) {
    throw new Error("Missing NYS API key");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  try {
    console.log("Fetching laws list...");
    
    // Get list of all laws - SIMPLIFIED VERSION
    const apiUrl = `https://legislation.nysenate.gov/api/3/laws?key=${nysApiKey}`;
    console.log("Calling:", apiUrl.replace(nysApiKey, "REDACTED"));
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`NYS API error: ${response.status} ${response.statusText}`);
    }
    
    const lawsData = await response.json();
    
    if (!lawsData.success) {
      throw new Error(`API returned error: ${lawsData.message}`);
    }

    const laws = lawsData.result?.items || [];
    const consolidatedLaws = laws.filter((law: any) => law.lawType === "CONSOLIDATED");
    
    console.log(`Found ${consolidatedLaws.length} consolidated laws to process`);

    // Process each law - BASIC VERSION ONLY
    for (const law of consolidatedLaws) {
      try {
        await syncBasicLawData(supabase, law);
        processedCount++;
        
        // Log progress every 10 laws
        if (processedCount % 10 === 0) {
          console.log(`Progress: ${processedCount}/${consolidatedLaws.length} laws processed`);
        }
        
        // Very short delay
        await delay(50);
        
      } catch (error) {
        errorCount++;
        errors.push({ lawId: law.lawId, error: error.message });
        console.error(`Failed to process ${law.lawId}:`, error);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    
    return new Response(
      JSON.stringify({
        success: true,
        totalLaws: consolidatedLaws.length,
        processed: processedCount,
        errors: errorCount,
        duration: `${duration}s`,
        errorDetails: errors
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    throw error;
  }
}

async function syncSingleLaw(lawId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // First get basic law info
    const lawsResponse = await fetchWithRetry(
      `https://legislation.nysenate.gov/api/3/laws?key=${nysApiKey}`
    );
    
    const laws = lawsResponse.result?.items || [];
    const law = laws.find((l: any) => l.lawId === lawId);
    
    if (!law) {
      throw new Error(`Law ${lawId} not found`);
    }

    await syncSingleLawData(supabase, law);
    
    return new Response(
      JSON.stringify({ success: true, lawId, message: "Law synced successfully" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    throw error;
  }
}

async function syncBasicLawData(supabase: any, law: any) {
  // Just insert basic law metadata - NO full text fetching
  const lawRecord = {
    law_id: law.lawId,
    name: law.name,
    chapter: law.chapter,
    law_type: law.lawType,
    full_text: null, // We'll populate this later
    structure: null,
    total_sections: 0, // We'll count these later
    last_updated: new Date().toISOString().split('T')[0],
    api_last_modified: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert law record
  const { error: lawError } = await supabase
    .from("ny_laws")
    .upsert(lawRecord, { onConflict: "law_id" });

  if (lawError) throw new Error(`Failed to upsert law: ${lawError.message}`);

  console.log(`✓ Synced basic data for ${law.lawId}: ${law.name}`);
}

async function syncSingleLawData(supabase: any, law: any) {
  // Fetch full law text
  const fullLawResponse = await fetchWithRetry(
    `https://legislation.nysenate.gov/api/3/laws/${law.lawId}?full=true&key=${nysApiKey}`
  );
  
  if (!fullLawResponse.success) {
    throw new Error(`Failed to fetch full law: ${fullLawResponse.message}`);
  }

  const lawData = fullLawResponse.result;
  
  // Extract sections and full text
  const { sections, fullText } = extractLawContent(lawData.documents);
  
  // Prepare law record
  const lawRecord = {
    law_id: law.lawId,
    name: law.name,
    chapter: law.chapter,
    law_type: law.lawType,
    full_text: fullText,
    structure: lawData.documents,
    total_sections: sections.length,
    last_updated: new Date().toISOString().split('T')[0],
    api_last_modified: lawData.lastModified || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert law record
  const { error: lawError } = await supabase
    .from("ny_laws")
    .upsert(lawRecord, { onConflict: "law_id" });

  if (lawError) throw new Error(`Failed to upsert law: ${lawError.message}`);

  // Delete existing sections for this law
  const { error: deleteError } = await supabase
    .from("ny_law_sections")
    .delete()
    .eq("law_id", law.lawId);

  if (deleteError) console.warn(`Warning deleting sections: ${deleteError.message}`);

  // Insert sections in batches
  if (sections.length > 0) {
    const sectionsWithLawId = sections.map((section: any) => ({
      ...section,
      law_id: law.lawId
    }));

    for (let i = 0; i < sectionsWithLawId.length; i += BATCH_SIZE) {
      const batch = sectionsWithLawId.slice(i, i + BATCH_SIZE);
      const { error: sectionsError } = await supabase
        .from("ny_law_sections")
        .insert(batch);

      if (sectionsError) {
        console.warn(`Section batch insert warning: ${sectionsError.message}`);
      }
    }
  }

  console.log(`✓ Synced ${law.lawId}: ${sections.length} sections`);
}

function extractLawContent(documents: any, parentId: string | null = null, level: number = 1): { sections: any[], fullText: string } {
  const sections: any[] = [];
  let fullText = "";
  let sortOrder = 0;

  if (!documents?.items) return { sections, fullText };

  for (const doc of documents.items) {
    sortOrder++;
    
    // Extract section data
    const section = {
      location_id: doc.locationId,
      parent_location_id: parentId,
      section_number: extractSectionNumber(doc.locationId),
      title: doc.title || "",
      content: doc.text || "",
      level: level,
      sort_order: sortOrder
    };

    sections.push(section);
    
    // Accumulate full text
    if (doc.text) {
      fullText += doc.text + "\n\n";
    }

    // Recursively process nested documents
    if (doc.documents?.items) {
      const nested = extractLawContent(
        doc.documents, 
        doc.locationId, 
        level + 1
      );
      sections.push(...nested.sections);
      fullText += nested.fullText;
    }
  }

  return { sections, fullText };
}

function extractSectionNumber(locationId: string): string {
  // Extract section number from location ID (e.g., "A1-1" -> "1-1")
  const match = locationId?.match(/[A-Z]*(\d+.*)/);
  return match ? match[1] : locationId;
}

async function getProgress() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get counts
    const { count: lawCount } = await supabase
      .from("ny_laws")
      .select("*", { count: "exact", head: true });
    
    const { count: sectionCount } = await supabase
      .from("ny_law_sections")
      .select("*", { count: "exact", head: true });

    // Get recent updates
    const { data: recentLaws } = await supabase
      .from("ny_laws")
      .select("law_id, name, total_sections, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        totalLaws: lawCount || 0,
        totalSections: sectionCount || 0,
        recentUpdates: recentLaws || []
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    throw error;
  }
}

async function getBillDetail(billNumber: string, sessionYear: number = 2025, view: string = 'no_fulltext', fullTextFormat?: string) {
  // Normalize session year
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;
  console.log(`Fetching bill detail for ${billNumber} (${sessionYear}) view=${view} fullTextFormat=${fullTextFormat || 'none'}`);

  let apiUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${billNumber}?key=${nysApiKey}`;
  if (view && view !== 'default') {
    apiUrl += `&view=${view}`;
  }
  if (fullTextFormat) {
    apiUrl += `&fullTextFormat=${fullTextFormat}`;
  }

  console.log('Calling NYS API:', apiUrl.replace(nysApiKey, 'REDACTED'));

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('NYS API error:', response.status, response.statusText);
      throw new Error(`NYS API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Bill detail fetched successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching bill detail:', error);
    throw error;
  }
}

async function fetchWithRetry(url: string, retries: number = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API Error: ${data.message || "Unknown error"}`);
      }

      return data;
    } catch (error) {
      console.log(`Attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await delay(1000 * attempt); // Exponential backoff
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncRecentBills(sessionYear: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }

  if (!nysApiKey) {
    throw new Error("Missing NYS API key");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  let processedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  // Normalize session year
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;

  try {
    console.log(`Starting incremental bill sync for session year ${sessionYear}...`);

    // Calculate time range for recent updates (last 24 hours to ensure no bills are missed)
    const toDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, '');
    const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const fromDateTime = fromDate.toISOString().replace(/\.\d{3}Z$/, '');

    // Fetch recent bill updates from NYS API
    // Note: updates endpoint is NOT scoped by session year — it's /api/3/bills/updates/{from}/{to}
    const updatesUrl = `https://legislation.nysenate.gov/api/3/bills/updates/${fromDateTime}/${toDateTime}?key=${nysApiKey}&limit=1000`;
    console.log("Fetching recent bill updates from:", updatesUrl.replace(nysApiKey!, "REDACTED"));

    const updatesResponse = await fetch(updatesUrl);

    if (!updatesResponse.ok) {
      // Log the failure but do NOT fall back to syncing all 18K bills
      const statusText = updatesResponse.statusText;
      console.warn(`Updates endpoint returned ${updatesResponse.status} ${statusText}`);
      return new Response(
        JSON.stringify({
          success: true,
          sessionYear,
          method: "updates",
          message: `Updates endpoint returned HTTP ${updatesResponse.status}. Will retry next hour.`,
          processed: 0,
          duration: `${(Date.now() - startTime) / 1000}s`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatesData = await updatesResponse.json();

    if (!updatesData.success) {
      console.warn("Updates API returned error:", updatesData.message);
      return new Response(
        JSON.stringify({
          success: true,
          sessionYear,
          method: "updates",
          message: `Updates API error: ${updatesData.message}. Will retry next hour.`,
          processed: 0,
          duration: `${(Date.now() - startTime) / 1000}s`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updates = updatesData.result?.items || [];
    console.log(`Found ${updates.length} recent bill updates`);

    if (updates.length === 0) {
      // No recent updates — this is normal, just report it
      return new Response(
        JSON.stringify({
          success: true,
          sessionYear,
          method: "updates",
          message: "No bill updates in the last 24 hours.",
          processed: 0,
          duration: `${(Date.now() - startTime) / 1000}s`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract unique bill IDs from updates
    const billIds = [...new Set(updates.map((u: any) => u.id?.basePrintNo || u.basePrintNo).filter(Boolean))];
    console.log(`Processing ${billIds.length} unique bills from updates...`);

    // Fetch and sync each updated bill
    for (const billId of billIds) {
      try {
        const billUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${billId}?key=${nysApiKey}`;
        const billResponse = await fetch(billUrl);

        if (!billResponse.ok) {
          throw new Error(`HTTP ${billResponse.status}`);
        }

        const billData = await billResponse.json();

        if (!billData.success || !billData.result) {
          throw new Error("Invalid bill data");
        }

        const bill = billData.result;
        const result = await upsertBill(supabase, bill, sessionYear);

        if (result.inserted) insertedCount++;
        if (result.updated) updatedCount++;
        processedCount++;

        // Rate limiting
        await delay(REQUEST_DELAY_MS);

      } catch (error) {
        errorCount++;
        errors.push({ billId, error: error.message });
        console.error(`Failed to process bill ${billId}:`, error.message);
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    return new Response(
      JSON.stringify({
        success: true,
        sessionYear,
        method: "updates",
        totalUpdates: updates.length,
        uniqueBills: billIds.length,
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount,
        duration: `${duration}s`,
        errorDetails: errors.slice(0, 10)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Bill sync error:", error);
    throw error;
  }
}

async function syncAllBillsForSession(supabase: any, sessionYear: number) {
  const startTime = Date.now();
  let processedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  try {
    // Fetch bills from NYS API - paginated
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const billsUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}?key=${nysApiKey}&limit=${limit}&offset=${offset}`;
      console.log(`Fetching bills at offset ${offset}...`);

      const response = await fetch(billsUrl);

      if (!response.ok) {
        throw new Error(`NYS API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API returned error: ${data.message}`);
      }

      const bills = data.result?.items || [];
      console.log(`Got ${bills.length} bills at offset ${offset}`);

      if (bills.length === 0) {
        hasMore = false;
        break;
      }

      // Process each bill
      for (const billSummary of bills) {
        try {
          // Fetch full bill details
          const billUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${billSummary.basePrintNo}?key=${nysApiKey}`;
          const billResponse = await fetch(billUrl);

          if (!billResponse.ok) {
            throw new Error(`HTTP ${billResponse.status}`);
          }

          const billData = await billResponse.json();

          if (!billData.success || !billData.result) {
            throw new Error("Invalid bill data");
          }

          const bill = billData.result;
          const result = await upsertBill(supabase, bill, sessionYear);

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
          processedCount++;

          // Log progress every 50 bills
          if (processedCount % 50 === 0) {
            console.log(`Progress: ${processedCount} bills processed`);
          }

          // Rate limiting
          await delay(REQUEST_DELAY_MS);

        } catch (error) {
          errorCount++;
          errors.push({ billId: billSummary.basePrintNo, error: error.message });
          console.error(`Failed to process bill ${billSummary.basePrintNo}:`, error.message);
        }
      }

      // Check if we've processed enough for an hourly sync (avoid timeout)
      // Edge functions have a 60-second timeout, so limit to ~500 bills per run
      if (processedCount >= 500) {
        console.log("Reached batch limit, will continue in next run");
        hasMore = false;
        break;
      }

      offset += limit;
      hasMore = bills.length === limit;

      // Brief pause between pages
      await delay(200);
    }

    const duration = (Date.now() - startTime) / 1000;

    return new Response(
      JSON.stringify({
        success: true,
        sessionYear,
        method: "full",
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount,
        duration: `${duration}s`,
        errorDetails: errors.slice(0, 10)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Full bill sync error:", error);
    throw error;
  }
}

// Diagnose why sync endpoints might be failing
async function diagnoseSyncEndpoints(sessionYear: number) {
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;
  const results: any = {
    sessionYear,
    apiKeyPresent: !!nysApiKey,
    apiKeyPrefix: nysApiKey ? nysApiKey.substring(0, 4) + '...' : null,
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: API health check (no key, should return 401 if API is reachable)
  try {
    const res = await fetch('https://legislation.nysenate.gov/api/3/bills/2025/S1');
    results.tests.apiReachable = { status: res.status, reachable: true };
  } catch (e) { results.tests.apiReachable = { reachable: false, error: e.message }; }

  // Test 2: Direct bill lookup for S1 (session 2025)
  try {
    const url = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/S1?key=${nysApiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    results.tests.directLookup_S1 = { status: res.status, ok: res.ok };
    try {
      const data = JSON.parse(text);
      results.tests.directLookup_S1.success = data.success;
      results.tests.directLookup_S1.billTitle = data.result?.title?.substring(0, 80);
      results.tests.directLookup_S1.responseType = data.responseType;
      if (!data.success) results.tests.directLookup_S1.message = data.message;
    } catch { results.tests.directLookup_S1.rawBody = text.substring(0, 300); }
  } catch (e) { results.tests.directLookup_S1 = { error: e.message }; }

  // Test 3: Direct lookup for a high-numbered bill (S8616, recently added)
  try {
    const url = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/S8616?key=${nysApiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    results.tests.directLookup_S8616 = { status: res.status, ok: res.ok };
    try {
      const data = JSON.parse(text);
      results.tests.directLookup_S8616.success = data.success;
      results.tests.directLookup_S8616.billTitle = data.result?.title?.substring(0, 80);
      if (!data.success) results.tests.directLookup_S8616.message = data.message;
    } catch { results.tests.directLookup_S8616.rawBody = text.substring(0, 300); }
  } catch (e) { results.tests.directLookup_S8616 = { error: e.message }; }

  // Test 4: Bills listing
  try {
    const url = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}?key=${nysApiKey}&limit=3&offset=0`;
    const res = await fetch(url);
    const text = await res.text();
    results.tests.billsListing = { status: res.status, ok: res.ok };
    try {
      const data = JSON.parse(text);
      results.tests.billsListing.success = data.success;
      results.tests.billsListing.totalItems = data.result?.size || data.result?.total || 0;
      results.tests.billsListing.itemCount = data.result?.items?.length || 0;
      results.tests.billsListing.firstItem = data.result?.items?.[0]?.basePrintNo || null;
      if (!data.success) results.tests.billsListing.message = data.message;
    } catch { results.tests.billsListing.rawBody = text.substring(0, 300); }
  } catch (e) { results.tests.billsListing = { error: e.message }; }

  // Test 5: Updates endpoint (this is what the cron uses)
  // Correct URL: /api/3/bills/updates/{from}/{to} — NOT scoped by session year
  try {
    const to = new Date().toISOString().replace(/\.\d{3}Z$/, '');
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '');
    const url = `https://legislation.nysenate.gov/api/3/bills/updates/${from}/${to}?key=${nysApiKey}&limit=5`;
    const res = await fetch(url);
    const text = await res.text();
    results.tests.updatesEndpoint = { status: res.status, ok: res.ok, from, to };
    try {
      const data = JSON.parse(text);
      results.tests.updatesEndpoint.success = data.success;
      results.tests.updatesEndpoint.totalItems = data.result?.size || data.result?.total || 0;
      results.tests.updatesEndpoint.itemCount = data.result?.items?.length || 0;
      if (!data.success) results.tests.updatesEndpoint.message = data.message;
    } catch { results.tests.updatesEndpoint.rawBody = text.substring(0, 300); }
  } catch (e) { results.tests.updatesEndpoint = { error: e.message }; }

  // Test 6: Search endpoint (alternative way to find bills)
  try {
    const url = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/search?term=*&limit=3&key=${nysApiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    results.tests.searchEndpoint = { status: res.status, ok: res.ok };
    try {
      const data = JSON.parse(text);
      results.tests.searchEndpoint.success = data.success;
      results.tests.searchEndpoint.totalItems = data.total || data.result?.size || 0;
      results.tests.searchEndpoint.itemCount = data.result?.items?.length || 0;
      if (!data.success) results.tests.searchEndpoint.message = data.message;
    } catch { results.tests.searchEndpoint.rawBody = text.substring(0, 300); }
  } catch (e) { results.tests.searchEndpoint = { error: e.message }; }

  // Test 7: Try session 2023 to see if older data works
  try {
    const url = `https://legislation.nysenate.gov/api/3/bills/2023/S1?key=${nysApiKey}`;
    const res = await fetch(url);
    results.tests.directLookup_2023_S1 = { status: res.status, ok: res.ok };
    if (res.ok) {
      const data = await res.json();
      results.tests.directLookup_2023_S1.success = data.success;
      results.tests.directLookup_2023_S1.billTitle = data.result?.title?.substring(0, 80);
    }
  } catch (e) { results.tests.directLookup_2023_S1 = { error: e.message }; }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Add a brand-new bill by fetching it from the NYS API and upserting into the database
async function addNewBill(billNumber: string, sessionYear: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  _peopleCache = null;

  const normalized = normalizeBillNumber(billNumber);
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;

  // Fetch full bill from NYS API
  const billUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${normalized}?key=${nysApiKey}`;
  console.log(`Adding new bill: ${normalized} (${sessionYear})`);
  const billResponse = await fetch(billUrl);
  if (!billResponse.ok) throw new Error(`NYS API error: ${billResponse.status}`);
  const billData = await billResponse.json();
  if (!billData.success || !billData.result) throw new Error("Invalid bill data from API");

  const bill = billData.result;
  const result = await upsertBill(supabase, bill, sessionYear);

  return new Response(
    JSON.stringify({
      success: true,
      billNumber: normalized,
      sessionYear,
      title: bill.title,
      inserted: result.inserted,
      updated: result.updated,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Re-sync a single bill by bill number
async function resyncSingleBill(billNumber: string, sessionYear: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  _peopleCache = null; // fresh cache

  // Find the bill in our database
  const normalized = normalizeBillNumber(billNumber);
  const { data: dbBill } = await supabase
    .from("Bills")
    .select("bill_id, bill_number, session_id")
    .eq("bill_number", normalized)
    .eq("session_id", sessionYear)
    .single();

  if (!dbBill) {
    throw new Error(`Bill ${normalized} (${sessionYear}) not found in database`);
  }

  // Fetch full bill from NYS API
  const billUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${normalized}?key=${nysApiKey}`;
  const billResponse = await fetch(billUrl);
  if (!billResponse.ok) throw new Error(`NYS API error: ${billResponse.status}`);
  const billData = await billResponse.json();
  if (!billData.success || !billData.result) throw new Error("Invalid bill data from API");

  const bill = billData.result;

  // Log what we're working with for debugging
  const sponsor = bill.sponsor?.member;
  if (sponsor) {
    console.log(`Sponsor: ${sponsor.fullName}, districtCode=${sponsor.districtCode}, chamber=${sponsor.chamber}, keys=${Object.keys(sponsor).join(',')}`);
  }
  const coSponsors = bill.coSponsors?.items || [];
  for (const c of coSponsors) {
    const m = c.member || c;
    console.log(`CoSponsor: ${m.fullName}, districtCode=${m.districtCode}, chamber=${m.chamber}, keys=${Object.keys(m).join(',')}`);
  }
  const multiSponsors = bill.multiSponsors?.items || [];
  for (const ms of multiSponsors) {
    const m = ms.member || ms;
    console.log(`MultiSponsor: ${m.fullName}, districtCode=${m.districtCode}, chamber=${m.chamber}, keys=${Object.keys(m).join(',')}`);
  }

  // Re-sync
  await syncSponsors(supabase, bill, dbBill.bill_id);
  await syncHistory(supabase, bill, dbBill.bill_id);
  await syncVotes(supabase, bill, dbBill.bill_id);

  return new Response(
    JSON.stringify({ success: true, billNumber: normalized, sessionYear, billId: dbBill.bill_id, message: "Resynced" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Re-sync existing bills: fetch each bill from NYS API and re-run sponsor/vote matching
async function resyncExistingBills(sessionYear: number, batchSize: number, offset: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();

  // Clear People cache so it loads fresh
  _peopleCache = null;

  // Get all bills for this session, ordered by bill_id, paginated
  const { data: bills, error: fetchError, count } = await supabase
    .from("Bills")
    .select("bill_id, bill_number, session_id", { count: "exact" })
    .eq("session_id", sessionYear)
    .order("bill_id", { ascending: true })
    .range(offset, offset + batchSize - 1);

  if (fetchError) {
    throw new Error(`Failed to fetch bills: ${fetchError.message}`);
  }

  const totalBills = count || 0;

  if (!bills || bills.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "No bills to resync in this range",
        sessionYear,
        totalBills,
        offset,
        batchSize,
        processed: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let unmatchedSponsors = 0;
  const errors: { billNumber: string; error: string }[] = [];

  console.log(`Resync: processing ${bills.length} bills (offset ${offset} of ${totalBills} total)`);

  for (const dbBill of bills) {
    const billNumber = dbBill.bill_number;
    const session = dbBill.session_id || sessionYear;

    try {
      // Fetch full bill detail from NYS API
      const billUrl = `https://legislation.nysenate.gov/api/3/bills/${session}/${billNumber}?key=${nysApiKey}`;
      const billResponse = await fetch(billUrl);

      if (!billResponse.ok) {
        throw new Error(`HTTP ${billResponse.status}`);
      }

      const billData = await billResponse.json();

      if (!billData.success || !billData.result) {
        throw new Error("Invalid bill data from API");
      }

      const bill = billData.result;

      // Re-run sponsor, history, and vote syncing (uses name-matching)
      await syncSponsors(supabase, bill, dbBill.bill_id);
      await syncHistory(supabase, bill, dbBill.bill_id);
      await syncVotes(supabase, bill, dbBill.bill_id);

      successCount++;
      processedCount++;

      if (processedCount % 10 === 0) {
        console.log(`Resync progress: ${processedCount}/${bills.length}`);
      }

      // Rate limiting
      await delay(REQUEST_DELAY_MS);

      // Safety valve: stop before edge function timeout (50s to leave margin)
      if (Date.now() - startTime > 50000) {
        console.log("Approaching timeout, stopping early");
        break;
      }

    } catch (error) {
      errorCount++;
      errors.push({ billNumber, error: error.message });
      console.warn(`Resync failed for ${billNumber}: ${error.message}`);
      processedCount++;
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const nextOffset = offset + processedCount;
  const hasMore = nextOffset < totalBills;

  return new Response(
    JSON.stringify({
      success: true,
      sessionYear,
      totalBills,
      offset,
      batchSize,
      processed: processedCount,
      succeeded: successCount,
      errors: errorCount,
      duration: `${duration}s`,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      errorDetails: errors.slice(0, 10),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function upsertBill(supabase: any, bill: any, sessionYear: number): Promise<{inserted: boolean, updated: boolean}> {
  // Normalize session year to odd year (NY legislative sessions span 2 years: 2025-2026 → 2025)
  // Prefer the session field from the API response if available
  sessionYear = bill.session || (sessionYear % 2 === 1 ? sessionYear : sessionYear - 1);

  // Transform NYS API bill data to match Bills table schema
  const status = bill.status || {};
  const currentCommittee = status.committeeName || bill.currentCommittee?.name || null;

  const normalizedBillNumber = normalizeBillNumber(bill.basePrintNo || bill.printNo);

  // Look up existing bill by the REAL unique key: (bill_number, session_id)
  const { data: existing } = await supabase
    .from("Bills")
    .select("bill_id")
    .eq("bill_number", normalizedBillNumber)
    .eq("session_id", sessionYear)
    .single();

  // Use existing bill_id if the bill is already in the DB, otherwise generate one
  // Generation accounts for chamber: S bills use base, A bills add 500000 offset
  let billId: number;
  if (existing) {
    billId = existing.bill_id;
  } else {
    const billNumberMatch = bill.basePrintNo?.match(/^([A-Z])(\d+)/);
    const prefix = billNumberMatch ? billNumberMatch[1] : '';
    const numericPart = billNumberMatch ? parseInt(billNumberMatch[2], 10) : 0;
    const chamberOffset = prefix === 'A' ? 500000 : 0;
    billId = sessionYear * 1000000 + chamberOffset + numericPart;
  }

  const billRecord = {
    bill_id: billId,
    bill_number: normalizedBillNumber,
    title: bill.title || "Untitled Bill",
    description: bill.summary || bill.title || null,
    status: mapStatusToCode(status.statusType || status.statusDesc),
    status_desc: status.statusDesc || status.statusType || "Unknown",
    committee: currentCommittee,
    committee_id: currentCommittee ? currentCommittee.toLowerCase().replace(/\s+/g, '-') : null,
    session_id: sessionYear,
    url: `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${normalizedBillNumber}`,
    state_link: `https://www.nysenate.gov/legislation/bills/${sessionYear}/${normalizedBillNumber}`,
    last_action_date: status.actionDate || bill.publishedDateTime || new Date().toISOString().split('T')[0],
    last_action: status.statusDesc || status.statusType || "Introduced",
    status_date: status.actionDate || null
  };

  // Upsert using bill_id (which now matches the existing row if one exists)
  const { error } = await supabase
    .from("Bills")
    .upsert(billRecord, { onConflict: "bill_id" });

  if (error) {
    throw new Error(`Failed to upsert bill: ${error.message}`);
  }

  // Sync sponsors, history, and votes from the API response
  await syncSponsors(supabase, bill, billId);
  await syncHistory(supabase, bill, billId);
  await syncVotes(supabase, bill, billId);

  console.log(`✓ Synced bill ${bill.basePrintNo}: ${bill.title?.substring(0, 50)}...`);

  return {
    inserted: !existing,
    updated: !!existing
  };
}

// Cache of People records for matching (loaded once per invocation)
let _peopleCache: { people_id: number; name: string; first_name: string; last_name: string; district: string }[] | null = null;

async function loadPeopleCache(supabase: any) {
  if (_peopleCache) return _peopleCache;
  const { data } = await supabase
    .from("People")
    .select("people_id, name, first_name, last_name, district");
  _peopleCache = data || [];
  return _peopleCache;
}

// Strip accents/diacritics (José → Jose, Sepúlveda → Sepulveda)
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Normalize a name for flexible matching
function normalizeName(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+(jr|sr|iii|ii|iv)$/i, '')
    .replace(/\s+[a-z]\s+/g, ' ')  // single-letter middle initials
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert API districtCode + chamber to our format: SD-008, HD-075
function apiDistrictToDbFormat(districtCode: number | string | null, chamber: string | null): string | null {
  if (!districtCode || !chamber) return null;
  const num = typeof districtCode === 'string' ? parseInt(districtCode, 10) : districtCode;
  if (isNaN(num)) return null;
  const prefix = chamber.toUpperCase().includes('SENATE') ? 'SD' : 'HD';
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

// Match an NYS API member to a People record. Never creates rows.
async function upsertPerson(supabase: any, member: any): Promise<number | null> {
  if (!member || !member.memberId) return null;

  const cache = await loadPeopleCache(supabase);
  if (cache.length === 0) return null;

  const fullName = member.fullName || member.shortName || null;
  const firstName = (member.firstName || '').toLowerCase().trim();
  const lastName = (member.lastName || '').toLowerCase().trim();
  const lastNameNorm = stripAccents(lastName);

  // Strategy 1 (PRIMARY): Last name + district match
  // API gives districtCode (e.g. 8) + chamber (SENATE/ASSEMBLY) → we convert to SD-008 / HD-075
  const apiDistrict = apiDistrictToDbFormat(member.districtCode, member.chamber);
  if (lastNameNorm && apiDistrict) {
    const match = cache.find(p =>
      p.district === apiDistrict &&
      stripAccents(p.last_name || '').toLowerCase().trim() === lastNameNorm
    );
    if (match) return match.people_id;
  }

  // Strategy 2: Exact match on full name
  if (fullName) {
    const target = stripAccents(fullName).toLowerCase().trim();
    const match = cache.find(p => stripAccents(p.name || '').toLowerCase().trim() === target);
    if (match) return match.people_id;
  }

  // Strategy 3: Match by first_name + last_name fields (accent-insensitive)
  if (firstName && lastName) {
    const firstNorm = stripAccents(firstName);
    const match = cache.find(p =>
      stripAccents(p.first_name || '').toLowerCase().trim() === firstNorm &&
      stripAccents(p.last_name || '').toLowerCase().trim() === lastNameNorm
    );
    if (match) return match.people_id;
  }

  // Strategy 4: Normalized matching (handles middle initials, Jr/Sr, periods, accents)
  if (fullName) {
    const normalizedTarget = normalizeName(fullName);
    const match = cache.find(p => p.name && normalizeName(p.name) === normalizedTarget);
    if (match) return match.people_id;
  }

  // Strategy 5: Last name exact (accent-insensitive) + first name starts with same letter
  if (firstName && lastNameNorm) {
    const firstChar = stripAccents(firstName).charAt(0);
    const matches = cache.filter(p =>
      stripAccents(p.last_name || '').toLowerCase().trim() === lastNameNorm
    );
    if (matches.length === 1) return matches[0].people_id;
    if (matches.length > 1) {
      const refined = matches.find(p =>
        stripAccents(p.first_name || '').toLowerCase().trim().startsWith(firstChar)
      );
      if (refined) return refined.people_id;
    }
  }

  // No match — don't create a row, just log
  console.warn(`No People match for: ${fullName || `${firstName} ${lastName}`} (API memberId: ${member.memberId}, district: ${apiDistrict || 'unknown'})`);
  return null;
}

// Sync sponsor data from the NYS API bill response
async function syncSponsors(supabase: any, bill: any, billId: number) {
  try {
    // Delete existing sponsors for this bill
    await supabase.from("Sponsors").delete().eq("bill_id", billId);

    const sponsors: { bill_id: number; people_id: number; position: number }[] = [];

    // Primary sponsor (position 1)
    const primaryMember = bill.sponsor?.member;
    if (primaryMember) {
      const peopleId = await upsertPerson(supabase, primaryMember);
      if (peopleId) {
        sponsors.push({ bill_id: billId, people_id: peopleId, position: 1 });
      }
    }

    // Co-sponsors (position 2+)
    const coSponsors = bill.coSponsors?.items || [];
    for (let i = 0; i < coSponsors.length; i++) {
      const coSponsor = coSponsors[i];
      const member = coSponsor.member || coSponsor;
      if (member?.memberId) {
        const peopleId = await upsertPerson(supabase, member);
        if (peopleId) {
          sponsors.push({ bill_id: billId, people_id: peopleId, position: i + 2 });
        }
      }
    }

    // Multi-sponsors (some bills have this instead of coSponsors)
    const multiSponsors = bill.multiSponsors?.items || [];
    const startPos = sponsors.length + 1;
    for (let i = 0; i < multiSponsors.length; i++) {
      const member = multiSponsors[i].member || multiSponsors[i];
      if (member?.memberId) {
        const peopleId = await upsertPerson(supabase, member);
        if (peopleId) {
          sponsors.push({ bill_id: billId, people_id: peopleId, position: startPos + i });
        }
      }
    }

    if (sponsors.length > 0) {
      const { error } = await supabase.from("Sponsors").insert(sponsors);
      if (error) {
        console.warn(`Warning inserting sponsors for bill ${billId}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`Warning syncing sponsors for bill ${billId}: ${error.message}`);
  }
}

// Sync legislative actions/history from the NYS API bill response
async function syncHistory(supabase: any, bill: any, billId: number) {
  try {
    // Get actions from the latest amendment
    const amendments = bill.amendments?.items || {};
    const amendmentKeys = Object.keys(amendments).sort();
    const latestAmendment = amendmentKeys.length > 0 ? amendments[amendmentKeys[amendmentKeys.length - 1]] : null;

    // Actions can be on the bill directly or in the latest amendment
    const actions = bill.actions?.items || latestAmendment?.actions?.items || [];

    if (actions.length === 0) return;

    // Delete existing history for this bill
    await supabase.from("History Table").delete().eq("bill_id", billId);

    const historyRecords = actions.map((action: any) => ({
      bill_id: billId,
      date: action.date || new Date().toISOString().split('T')[0],
      sequence: action.sequenceNo || 0,
      action: action.text || action.description || null,
      chamber: action.chamber === 'SENATE' ? 'Senate' : action.chamber === 'ASSEMBLY' ? 'Assembly' : action.chamber || null
    }));

    // Insert in batches of 100
    for (let i = 0; i < historyRecords.length; i += BATCH_SIZE) {
      const batch = historyRecords.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("History Table").insert(batch);
      if (error) {
        console.warn(`Warning inserting history for bill ${billId}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`Warning syncing history for bill ${billId}: ${error.message}`);
  }
}

// Sync voting records from the NYS API bill response
async function syncVotes(supabase: any, bill: any, billId: number) {
  try {
    const votesData = bill.votes?.items || [];
    if (votesData.length === 0) return;

    // Delete existing roll calls and votes for this bill
    const { data: existingRollCalls } = await supabase
      .from("Roll Call")
      .select("roll_call_id")
      .eq("bill_id", billId);

    if (existingRollCalls && existingRollCalls.length > 0) {
      const rollCallIds = existingRollCalls.map((rc: any) => rc.roll_call_id);
      await supabase.from("Votes").delete().in("roll_call_id", rollCallIds);
      await supabase.from("Roll Call").delete().eq("bill_id", billId);
    }

    for (const voteEvent of votesData) {
      // Generate a roll_call_id: billId * 100 + index
      const voteDate = voteEvent.voteDate || '';
      const rollCallId = billId * 100 + (votesData.indexOf(voteEvent) + 1);

      // Count votes by type
      const memberVotes = voteEvent.memberVotes?.items || {};
      let yeaCount = 0;
      let nayCount = 0;
      let absentCount = 0;
      let nvCount = 0;

      const allIndividualVotes: { people_id: number; roll_call_id: number; vote: number; vote_desc: string }[] = [];

      for (const [voteType, voteGroup] of Object.entries(memberVotes)) {
        const members = (voteGroup as any)?.items || [];
        const normalizedType = voteType.toUpperCase();

        let voteCode = 0;
        let voteDesc = voteType;

        if (normalizedType === 'AYE' || normalizedType === 'AYEWR') {
          voteCode = 1;
          voteDesc = 'Yea';
          yeaCount += members.length;
        } else if (normalizedType === 'NAY') {
          voteCode = 2;
          voteDesc = 'Nay';
          nayCount += members.length;
        } else if (normalizedType === 'ABSENT' || normalizedType === 'ABD') {
          voteCode = 3;
          voteDesc = 'Absent';
          absentCount += members.length;
        } else if (normalizedType === 'EXC' || normalizedType === 'NV') {
          voteCode = 4;
          voteDesc = 'NV';
          nvCount += members.length;
        }

        for (const member of members) {
          if (member?.memberId) {
            const matchedPeopleId = await upsertPerson(supabase, member);
            if (matchedPeopleId) {
              allIndividualVotes.push({
                people_id: matchedPeopleId,
                roll_call_id: rollCallId,
                vote: voteCode,
                vote_desc: voteDesc
              });
            }
          }
        }
      }

      // Insert roll call record
      const rollCallRecord = {
        roll_call_id: rollCallId,
        bill_id: billId,
        date: voteDate,
        chamber: voteEvent.committee?.chamber === 'SENATE' ? 'Senate' : voteEvent.committee?.chamber === 'ASSEMBLY' ? 'Assembly' : null,
        description: voteEvent.description || voteEvent.voteType || null,
        yea: yeaCount,
        nay: nayCount.toString(),
        absent: absentCount.toString(),
        nv: nvCount.toString(),
        total: yeaCount + nayCount + absentCount + nvCount
      };

      const { error: rcError } = await supabase
        .from("Roll Call")
        .upsert(rollCallRecord, { onConflict: "roll_call_id" });

      if (rcError) {
        console.warn(`Warning inserting roll call ${rollCallId}: ${rcError.message}`);
        continue;
      }

      // Insert individual votes in batches
      if (allIndividualVotes.length > 0) {
        for (let i = 0; i < allIndividualVotes.length; i += BATCH_SIZE) {
          const batch = allIndividualVotes.slice(i, i + BATCH_SIZE);
          const { error: vError } = await supabase.from("Votes").upsert(batch, { onConflict: "people_id,roll_call_id" });
          if (vError) {
            console.warn(`Warning inserting votes for roll call ${rollCallId}: ${vError.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Warning syncing votes for bill ${billId}: ${error.message}`);
  }
}

function mapStatusToCode(statusType: string | undefined): number {
  // Map NYS status types to numeric codes for the status field
  const statusMap: Record<string, number> = {
    'INTRODUCED': 1,
    'IN_ASSEMBLY_COMM': 2,
    'IN_SENATE_COMM': 2,
    'ASSEMBLY_FLOOR': 3,
    'SENATE_FLOOR': 3,
    'PASSED_ASSEMBLY': 4,
    'PASSED_SENATE': 4,
    'DELIVERED_TO_GOV': 5,
    'SIGNED_BY_GOV': 6,
    'VETOED': 7,
    'ADOPTED': 6,
    'SUBSTITUTED': 8,
    'STRICKEN': 9
  };

  return statusMap[statusType || ''] || 0;
}
