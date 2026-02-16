import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const nysApiKey = Deno.env.get("NYS_LEGISLATION_API_KEY");
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const REQUEST_DELAY_MS = 100;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 256;
const MAX_TOKENS_PER_CHUNK = 500;
const OVERLAP_TOKENS = 50;
const TIMEOUT_MS = 45000; // 45s safety valve

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Utilities ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBillNumber(billNumber: string | null | undefined): string {
  if (!billNumber) return "";
  const match = billNumber
    .trim()
    .toUpperCase()
    .match(/^([A-Z])(\d+)([A-Z]?)$/);
  if (!match) return billNumber.toUpperCase();
  const [, prefix, digits, suffix] = match;
  return `${prefix}${digits.replace(/^0+/, "") || "0"}${suffix}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Rough token estimate (~4 chars per token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Extract full text HTML from NYS API bill response
function extractFullText(result: any): string | null {
  const items = result?.amendments?.items;
  if (!items || typeof items !== "object") return null;
  const ver = result.activeVersion ?? "";
  const keysToTry = [ver, ...Object.keys(items).filter((k) => k !== ver)];
  for (const key of keysToTry) {
    const amendment = items[key];
    if (!amendment) continue;
    if (amendment.fullTextHtml) return amendment.fullTextHtml;
    if (amendment.fullText) return amendment.fullText;
  }
  return null;
}

// --- Chunking ---

interface Chunk {
  chunk_index: number;
  chunk_type: string;
  content: string;
  token_count: number;
}

function chunkBillText(bill: any, bodyText: string): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;

  // Chunk 0: title + summary
  const titleParts: string[] = [];
  if (bill.title) titleParts.push(`Title: ${bill.title}`);
  if (bill.summary) titleParts.push(`Summary: ${bill.summary}`);
  if (titleParts.length > 0) {
    const content = titleParts.join("\n\n");
    chunks.push({
      chunk_index: index++,
      chunk_type: "title",
      content,
      token_count: estimateTokens(content),
    });
  }

  // Memo chunk (if present)
  const memo = bill.memo?.text || bill.memo;
  if (memo && typeof memo === "string" && memo.trim().length > 0) {
    const memoText = stripHtml(memo).trim();
    if (memoText.length > 20) {
      chunks.push({
        chunk_index: index++,
        chunk_type: "memo",
        content: memoText,
        token_count: estimateTokens(memoText),
      });
    }
  }

  // Body: split by section headers
  if (bodyText && bodyText.trim().length > 0) {
    const sections = splitBySections(bodyText);
    for (const section of sections) {
      // If a section is too large, split further by token count
      const subChunks = splitByTokenLimit(
        section,
        MAX_TOKENS_PER_CHUNK,
        OVERLAP_TOKENS
      );
      for (const sub of subChunks) {
        chunks.push({
          chunk_index: index++,
          chunk_type: "body",
          content: sub,
          token_count: estimateTokens(sub),
        });
      }
    }
  }

  return chunks;
}

function splitBySections(text: string): string[] {
  // Split on common NYS bill section patterns
  const sectionPattern =
    /\n\s*(?=Section\s+\d+[\.\:]|§\s*\d+|SECTION\s+\d+)/gi;
  const parts = text.split(sectionPattern).filter((p) => p.trim().length > 0);
  // If no sections found, return the whole text as one part
  if (parts.length <= 1) return [text.trim()];
  return parts.map((p) => p.trim());
}

function splitByTokenLimit(
  text: string,
  maxTokens: number,
  overlapTokens: number
): string[] {
  const tokens = estimateTokens(text);
  if (tokens <= maxTokens) return [text];

  const results: string[] = [];
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.floor((maxTokens * 4) / 5); // avg 5 chars/word with space
  const overlapWords = Math.floor((overlapTokens * 4) / 5);

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunk = words.slice(start, end).join(" ");
    if (chunk.trim().length > 0) {
      results.push(chunk.trim());
    }
    if (end >= words.length) break;
    start = end - overlapWords;
  }

  return results;
}

// --- OpenAI Embeddings ---

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  // Sort by index to match input order
  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => item.embedding);
}

// --- NYS API ---

async function fetchBillWithFullText(
  billNumber: string,
  sessionYear: number
): Promise<any> {
  const apiUrl = `https://legislation.nysenate.gov/api/3/bills/${sessionYear}/${billNumber}?key=${nysApiKey}&view=default&fullTextFormat=html`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`NYS API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.result) {
    throw new Error("Invalid bill data from NYS API");
  }

  return data.result;
}

// --- Actions ---

async function embedSingleBill(
  supabase: any,
  billNumber: string,
  sessionYear: number
): Promise<any> {
  const normalized = normalizeBillNumber(billNumber);
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;

  console.log(`Embedding bill ${normalized} (${sessionYear})...`);

  // Fetch bill with full text from NYS API
  const bill = await fetchBillWithFullText(normalized, sessionYear);

  // Extract full text HTML and convert to plain text
  const fullTextHtml = extractFullText(bill);
  const bodyText = fullTextHtml ? stripHtml(fullTextHtml) : "";

  if (!bodyText && !bill.title && !bill.summary) {
    return {
      success: true,
      billNumber: normalized,
      sessionYear,
      chunks: 0,
      message: "No text content found for this bill",
    };
  }

  // Generate bill_id same way as nys-legislation-search
  const billNumberMatch = normalized.match(/[A-Z]?(\d+)/);
  const billNumericPart = billNumberMatch
    ? parseInt(billNumberMatch[1], 10)
    : 0;
  const billId = sessionYear * 1000000 + billNumericPart;

  // Chunk the bill text
  const chunks = chunkBillText(bill, bodyText);

  if (chunks.length === 0) {
    return {
      success: true,
      billNumber: normalized,
      sessionYear,
      chunks: 0,
      message: "No chunks generated",
    };
  }

  // Generate embeddings for all chunks in one batch
  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts);

  // Delete existing chunks for this bill (idempotent re-embedding)
  await supabase.from("bill_chunks").delete().eq("bill_id", billId);

  // Insert new chunks with embeddings
  const records = chunks.map((chunk, i) => ({
    bill_id: billId,
    bill_number: normalized,
    session_id: sessionYear,
    chunk_index: chunk.chunk_index,
    chunk_type: chunk.chunk_type,
    content: chunk.content,
    token_count: chunk.token_count,
    embedding: JSON.stringify(embeddings[i]),
    metadata: {
      active_version: bill.activeVersion || "",
      bill_title: bill.title || "",
    },
  }));

  const { error: insertError } = await supabase
    .from("bill_chunks")
    .insert(records);

  if (insertError) {
    throw new Error(`Failed to insert chunks: ${insertError.message}`);
  }

  console.log(
    `Embedded ${normalized}: ${chunks.length} chunks`
  );

  return {
    success: true,
    billNumber: normalized,
    sessionYear,
    billId,
    chunks: chunks.length,
    totalTokens: chunks.reduce((sum, c) => sum + c.token_count, 0),
  };
}

async function embedBatch(
  supabase: any,
  sessionYear: number,
  batchSize: number,
  offset: number
): Promise<any> {
  const startTime = Date.now();
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;

  // Get bills from our database that need embedding
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
    return {
      success: true,
      message: "No bills to embed in this range",
      sessionYear,
      totalBills,
      offset,
      batchSize,
      processed: 0,
      hasMore: false,
    };
  }

  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let totalChunks = 0;
  const errors: { billNumber: string; error: string }[] = [];

  console.log(
    `Embed batch: processing ${bills.length} bills (offset ${offset} of ${totalBills} total)`
  );

  for (const dbBill of bills) {
    // Safety valve: stop before edge function timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.log("Approaching timeout, stopping early");
      break;
    }

    try {
      const result = await embedSingleBill(
        supabase,
        dbBill.bill_number,
        dbBill.session_id || sessionYear
      );
      totalChunks += result.chunks || 0;
      successCount++;
    } catch (error) {
      errorCount++;
      errors.push({ billNumber: dbBill.bill_number, error: error.message });
      console.warn(
        `Embed failed for ${dbBill.bill_number}: ${error.message}`
      );
    }

    processedCount++;

    // Rate limiting for NYS API
    await delay(REQUEST_DELAY_MS);
  }

  const duration = (Date.now() - startTime) / 1000;
  const nextOffset = offset + processedCount;
  const hasMore = nextOffset < totalBills;

  return {
    success: true,
    sessionYear,
    totalBills,
    offset,
    batchSize,
    processed: processedCount,
    succeeded: successCount,
    errors: errorCount,
    totalChunks,
    duration: `${duration.toFixed(1)}s`,
    nextOffset: hasMore ? nextOffset : null,
    hasMore,
    errorDetails: errors.slice(0, 10),
  };
}

async function getStatus(supabase: any, sessionYear: number): Promise<any> {
  sessionYear = sessionYear % 2 === 1 ? sessionYear : sessionYear - 1;

  // Total chunks
  const { count: chunkCount } = await supabase
    .from("bill_chunks")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionYear);

  // Distinct bills with embeddings — use RPC for accurate count
  // (default Supabase limit of 1000 rows truncates results)
  const { data: distinctCount } = await supabase.rpc("count_embedded_bills", {
    p_session_id: sessionYear,
  });

  const uniqueBills = distinctCount || 0;

  // Total bills in database
  const { count: totalBills } = await supabase
    .from("Bills")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionYear);

  return {
    success: true,
    sessionYear,
    totalChunks: chunkCount || 0,
    billsEmbedded: uniqueBills,
    totalBills: totalBills || 0,
    percentComplete:
      totalBills && totalBills > 0
        ? Math.round((uniqueBills / totalBills) * 100)
        : 0,
  };
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action, billNumber, sessionYear = 2025, batchSize = 10, offset = 0 } = requestBody;

    if (!nysApiKey) {
      throw new Error("NYS Legislation API key not configured");
    }
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result;

    switch (action) {
      case "embed-single":
        if (!billNumber) throw new Error("billNumber is required");
        result = await embedSingleBill(supabase, billNumber, sessionYear);
        break;

      case "embed-batch":
        result = await embedBatch(supabase, sessionYear, batchSize, offset);
        break;

      case "status":
        result = await getStatus(supabase, sessionYear);
        break;

      default:
        throw new Error(
          `Unknown action: ${action}. Use embed-single, embed-batch, or status.`
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in embed-bill-chunks function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
