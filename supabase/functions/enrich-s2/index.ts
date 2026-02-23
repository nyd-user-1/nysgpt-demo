import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const S2_BATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/batch";
const S2_FIELDS = [
  "title",
  "abstract",
  "tldr",
  "citationCount",
  "influentialCitationCount",
  "referenceCount",
  "venue",
  "year",
  "publicationDate",
  "isOpenAccess",
  "openAccessPdf",
  "fieldsOfStudy",
  "authors",
  "authors.hIndex",
  "authors.affiliations",
  "citationStyles",
].join(",");

const TIMEOUT_MS = 45_000;
const INTER_BATCH_DELAY_MS = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- S2 Batch Lookup ---

interface S2Paper {
  paperId: string | null;
  title?: string;
  abstract?: string;
  tldr?: { text: string } | null;
  citationCount?: number;
  influentialCitationCount?: number;
  referenceCount?: number;
  venue?: string;
  year?: number;
  publicationDate?: string;
  isOpenAccess?: boolean;
  openAccessPdf?: { url: string } | null;
  fieldsOfStudy?: string[] | null;
  authors?: { name: string; hIndex?: number; affiliations?: string[] }[];
  citationStyles?: { bibtex?: string } | null;
}

async function lookupBatch(dois: string[]): Promise<(S2Paper | null)[]> {
  const ids = dois.map((d) => `DOI:${d}`);

  const response = await fetch(`${S2_BATCH_URL}?fields=${S2_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S2 batch API error ${response.status}: ${text}`);
  }

  return await response.json();
}

// --- Main enrichment logic ---

async function enrichBatch(
  supabase: ReturnType<typeof createClient>,
  batchSize: number
): Promise<{
  processed: number;
  found: number;
  not_found: number;
  errors: number;
}> {
  const startTime = Date.now();

  // Find NSR records with DOIs that haven't been looked up yet
  const { data: records, error: fetchError } = await supabase
    .from("nsr")
    .select("id, doi")
    .not("doi", "is", null)
    .not("doi", "eq", "")
    .order("id", { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    throw new Error(`Failed to fetch NSR records: ${fetchError.message}`);
  }

  if (!records || records.length === 0) {
    // Check if there are pending records that need re-processing
    return { processed: 0, found: 0, not_found: 0, errors: 0 };
  }

  // Filter out records that already have an nsr_s2 row
  const nsrIds = records.map((r: { id: number }) => r.id);
  const { data: existing } = await supabase
    .from("nsr_s2")
    .select("nsr_id")
    .in("nsr_id", nsrIds);

  const existingIds = new Set(
    (existing || []).map((e: { nsr_id: number }) => e.nsr_id)
  );
  const toProcess = records.filter(
    (r: { id: number }) => !existingIds.has(r.id)
  );

  if (toProcess.length === 0) {
    return { processed: 0, found: 0, not_found: 0, errors: 0 };
  }

  // Insert placeholder rows with status = 'pending'
  const placeholders = toProcess.map(
    (r: { id: number; doi: string }) => ({
      nsr_id: r.id,
      doi: r.doi,
      lookup_status: "pending",
    })
  );

  const { error: insertError } = await supabase
    .from("nsr_s2")
    .upsert(placeholders, { onConflict: "nsr_id", ignoreDuplicates: true });

  if (insertError) {
    throw new Error(`Failed to insert placeholders: ${insertError.message}`);
  }

  // Process in sub-batches of 500 (S2 batch limit)
  const SUB_BATCH = 500;
  let totalFound = 0;
  let totalNotFound = 0;
  let totalErrors = 0;

  for (let i = 0; i < toProcess.length; i += SUB_BATCH) {
    // Safety valve
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.log("Approaching timeout, stopping early");
      break;
    }

    const batch = toProcess.slice(i, i + SUB_BATCH);
    const dois = batch.map((r: { doi: string }) => r.doi);

    try {
      const results = await lookupBatch(dois);

      // Update each nsr_s2 row with the S2 response
      for (let j = 0; j < batch.length; j++) {
        const record = batch[j];
        const paper = results[j];

        if (paper && paper.paperId) {
          // Found on S2
          const { error: updateError } = await supabase
            .from("nsr_s2")
            .update({
              s2_paper_id: paper.paperId,
              citation_count: paper.citationCount ?? null,
              influential_citation_count:
                paper.influentialCitationCount ?? null,
              reference_count: paper.referenceCount ?? null,
              abstract: paper.abstract ?? null,
              tldr: paper.tldr?.text ?? null,
              venue: paper.venue ?? null,
              publication_date: paper.publicationDate ?? null,
              is_open_access: paper.isOpenAccess ?? false,
              open_access_pdf_url: paper.openAccessPdf?.url ?? null,
              fields_of_study: paper.fieldsOfStudy ?? null,
              authors: paper.authors
                ? paper.authors.map((a) => ({
                    name: a.name,
                    hIndex: a.hIndex ?? null,
                    affiliations: a.affiliations ?? [],
                  }))
                : null,
              bibtex: paper.citationStyles?.bibtex ?? null,
              lookup_status: "found",
              looked_up_at: new Date().toISOString(),
            })
            .eq("nsr_id", record.id);

          if (updateError) {
            console.warn(
              `Failed to update nsr_s2 for nsr_id ${record.id}: ${updateError.message}`
            );
            totalErrors++;
          } else {
            totalFound++;
          }
        } else {
          // Not found on S2
          const { error: updateError } = await supabase
            .from("nsr_s2")
            .update({
              lookup_status: "not_found",
              looked_up_at: new Date().toISOString(),
            })
            .eq("nsr_id", record.id);

          if (updateError) {
            console.warn(
              `Failed to mark not_found for nsr_id ${record.id}: ${updateError.message}`
            );
            totalErrors++;
          } else {
            totalNotFound++;
          }
        }
      }
    } catch (err) {
      console.error(`S2 batch lookup failed: ${err.message}`);
      // Mark entire sub-batch as error
      for (const record of batch) {
        await supabase
          .from("nsr_s2")
          .update({
            lookup_status: "error",
            looked_up_at: new Date().toISOString(),
          })
          .eq("nsr_id", record.id);
      }
      totalErrors += batch.length;
    }

    // Rate limiting between sub-batches
    if (i + SUB_BATCH < toProcess.length) {
      await delay(INTER_BATCH_DELAY_MS);
    }
  }

  return {
    processed: toProcess.length,
    found: totalFound,
    not_found: totalNotFound,
    errors: totalErrors,
  };
}

// --- Handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(body.batch_size || 100, 1), 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result = await enrichBatch(supabase, batchSize);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in enrich-s2 function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
