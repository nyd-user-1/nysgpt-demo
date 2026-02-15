import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helper functions (copied from nys-legislation-search; edge functions are isolated) ──

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeName(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+(jr|sr|iii|ii|iv)$/i, '')
    .replace(/\s+[a-z]\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function apiDistrictToDbFormat(districtCode: number | string | null, chamber: string | null): string | null {
  if (!districtCode || !chamber) return null;
  const num = typeof districtCode === 'string' ? parseInt(districtCode, 10) : districtCode;
  if (isNaN(num)) return null;
  const prefix = chamber.toUpperCase().includes('SENATE') ? 'SD' : 'HD';
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

function getCurrentSessionYear(): number {
  const currentYear = new Date().getFullYear();
  return currentYear % 2 === 1 ? currentYear : currentYear - 1;
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
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
      await delay(1000 * attempt);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Photo URL construction ──

function buildPhotoUrl(chamber: string, districtCode: number | string, imgName?: string | null): string | null {
  if (chamber.toUpperCase().includes('SENATE')) {
    // Senate: use API's imgName if available
    if (imgName) {
      return `https://www.nysenate.gov/sites/default/files/${imgName}`;
    }
    return null;
  }
  // Assembly: district-based URL
  const num = typeof districtCode === 'string' ? parseInt(districtCode, 10) : districtCode;
  if (isNaN(num)) return null;
  const padded = String(num).padStart(3, '0');
  return `https://nyassembly.gov/write/upload/member_files/${padded}/header_headshot/${padded}.png`;
}

// ── NYS Bio URL construction ──

function buildNysBioUrl(member: any, chamber: string): string | null {
  const firstName = (member.firstName || '').trim();
  const lastName = (member.lastName || '').trim();
  if (!firstName || !lastName) return null;

  if (chamber.toUpperCase().includes('SENATE')) {
    // Senate bio URLs use shortName slug
    const slug = (member.shortName || `${firstName}-${lastName}`)
      .replace(/\s+/g, '-')
      .replace(/\./g, '');
    return `https://www.nysenate.gov/senators/${slug.toLowerCase()}`;
  }

  // Assembly: construct slug from name parts
  const parts = [firstName];
  if (member.middleName) {
    parts.push(member.middleName.replace(/\./g, ''));
  }
  parts.push(lastName);
  if (member.suffix) {
    parts.push(member.suffix.replace(/\./g, ''));
  }
  return `https://nyassembly.gov/mem/${parts.join('-')}`;
}

// ── Main sync logic ──

async function syncMembers(sessionYear: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const nysApiKey = Deno.env.get("NYS_LEGISLATION_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }
  if (!nysApiKey) {
    throw new Error("Missing NYS API key");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  let insertedCount = 0;
  let updatedCount = 0;
  let archivedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const replacements: string[] = [];

  try {
    // 1. Fetch all members from NYS API
    console.log(`Fetching members for session year ${sessionYear}...`);
    // Fetch both chambers with full=true to get complete member data
    const senateUrl = `https://legislation.nysenate.gov/api/3/members/${sessionYear}/senate?key=${nysApiKey}&limit=1000&full=true`;
    const assemblyUrl = `https://legislation.nysenate.gov/api/3/members/${sessionYear}/assembly?key=${nysApiKey}&limit=1000&full=true`;

    console.log('Fetching Senate members...');
    const senateData = await fetchWithRetry(senateUrl);
    const senateMembers = senateData.result?.items || [];
    console.log(`Fetched ${senateMembers.length} Senate members`);

    console.log('Fetching Assembly members...');
    const assemblyData = await fetchWithRetry(assemblyUrl);
    const assemblyMembers = assemblyData.result?.items || [];
    console.log(`Fetched ${assemblyMembers.length} Assembly members`);

    const apiMembers = [...senateMembers, ...assemblyMembers];
    console.log(`Total: ${apiMembers.length} members from API`);

    if (apiMembers.length === 0) {
      throw new Error(`No members returned from API for session year ${sessionYear}`);
    }

    // 2. Load all existing People records
    const { data: existingPeople, error: loadError } = await supabase
      .from("People")
      .select("people_id, name, first_name, last_name, district, chamber, photo_url");

    if (loadError) {
      throw new Error(`Failed to load People: ${loadError.message}`);
    }

    console.log(`Loaded ${existingPeople?.length || 0} existing People records`);

    // 3. Build district → person map for O(1) lookup
    const districtMap = new Map<string, typeof existingPeople[0]>();
    for (const person of existingPeople || []) {
      if (person.district) {
        districtMap.set(person.district, person);
      }
    }

    // 4. Get MAX(people_id) for new record ID generation
    let nextId = 0;
    for (const person of existingPeople || []) {
      if (person.people_id > nextId) {
        nextId = person.people_id;
      }
    }
    nextId += 1;
    console.log(`Next available people_id: ${nextId}`);

    // 5. Deduplicate by district — keep only primary (non-alternate) members.
    //    When full=true, sessionShortNameMap may contain alternate entries.
    //    We also track seen districts to avoid processing the same district twice.
    const seenDistricts = new Set<string>();

    for (const item of apiMembers) {
      // full=true wraps: { memberId, chamber, fullName, person: { firstName, lastName, ... }, sessionShortNameMap: { year: [{ districtCode, alternate }] } }
      const member = item.memberId ? item : (item.result || item);
      const person = member.person || {};

      try {
        // Extract name fields — full response nests under person
        const firstName = (person.firstName || member.firstName || '').trim();
        const lastName = (person.lastName || member.lastName || '').trim();
        const middleName = (person.middleName || member.middleName || '').trim() || null;
        const suffix = (person.suffix || member.suffix || '').trim() || null;
        const fullName = member.fullName || person.fullName || `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim();
        const chamber = member.chamber || '';
        const imgName = person.imgName || member.imgName || null;
        const email = person.email || member.email || null;

        // districtCode may be at top level or in sessionShortNameMap
        let districtCode = member.districtCode;
        let isAlternate = member.alternate === true;
        if (!districtCode && member.sessionShortNameMap) {
          const sessionEntries = member.sessionShortNameMap[String(sessionYear)];
          if (Array.isArray(sessionEntries) && sessionEntries.length > 0) {
            // Prefer non-alternate entry
            const primary = sessionEntries.find((e: any) => !e.alternate) || sessionEntries[0];
            districtCode = primary.districtCode;
            isAlternate = primary.alternate === true;
          }
        }

        // Skip alternate members
        if (isAlternate) {
          console.log(`Skipping alternate member: ${fullName} (district ${districtCode})`);
          continue;
        }

        if (!firstName || !lastName || !districtCode || !chamber) {
          console.warn(`Skipping member with missing data: ${JSON.stringify({ firstName, lastName, districtCode, chamber })}`);
          errorCount++;
          errors.push(`Missing data: ${fullName || 'unknown'}`);
          continue;
        }

        const district = apiDistrictToDbFormat(districtCode, chamber);
        if (!district) {
          console.warn(`Could not format district for ${fullName}: districtCode=${districtCode}, chamber=${chamber}`);
          errorCount++;
          errors.push(`Bad district: ${fullName}`);
          continue;
        }

        // Skip if we already processed this district (duplicate in API response)
        if (seenDistricts.has(district)) {
          console.log(`Skipping duplicate district ${district}: ${fullName}`);
          continue;
        }
        seenDistricts.add(district);

        const chamberName = chamber.toUpperCase().includes('SENATE') ? 'Senate' : 'Assembly';
        const role = chamberName === 'Senate' ? 'Sen' : 'Rep';
        const photoUrl = buildPhotoUrl(chamber, districtCode, imgName);
        // Build bio URL using person fields + suffix
        const bioMember = { firstName, lastName, middleName, suffix, shortName: member.shortName };
        const nysBioUrl = buildNysBioUrl(bioMember, chamber);

        const existing = districtMap.get(district);

        if (existing) {
          const existingLastNorm = normalizeName(existing.last_name || '');
          const apiLastNorm = normalizeName(lastName);

          if (existingLastNorm === apiLastNorm) {
            // Same person in same district → UPDATE (refresh data)
            const updateFields: Record<string, any> = {
              name: fullName,
              first_name: firstName,
              last_name: lastName,
              middle_name: middleName,
            };

            // Only set photo_url if currently null (don't overwrite manually-set photos)
            if (!existing.photo_url && photoUrl) {
              updateFields.photo_url = photoUrl;
            }

            if (nysBioUrl) {
              updateFields.nys_bio_url = nysBioUrl;
            }

            const { error: updateError } = await supabase
              .from("People")
              .update(updateFields)
              .eq("people_id", existing.people_id);

            if (updateError) {
              console.error(`Failed to update ${fullName}: ${updateError.message}`);
              errorCount++;
              errors.push(`Update failed: ${fullName} - ${updateError.message}`);
            } else {
              updatedCount++;
            }
          } else {
            // Different person in same district → overwrite existing record
            console.log(`District ${district}: replacing "${existing.last_name}" (norm: "${existingLastNorm}") with "${lastName}" (norm: "${apiLastNorm}")`);

            const replaceFields: Record<string, any> = {
              name: fullName,
              first_name: firstName,
              last_name: lastName,
              middle_name: middleName,
              chamber: chamberName,
              role: role,
              email: email,
              nys_bio_url: nysBioUrl,
              photo_url: photoUrl,
            };

            const { error: replaceError } = await supabase
              .from("People")
              .update(replaceFields)
              .eq("people_id", existing.people_id);

            if (replaceError) {
              console.error(`Failed to replace ${existing.name} with ${fullName}: ${replaceError.message}`);
              errorCount++;
              errors.push(`Replace failed: ${existing.name} → ${fullName} - ${replaceError.message}`);
            } else {
              archivedCount++; // counts as a replacement
              updatedCount++;
              replacements.push(`${district}: "${existing.last_name}" → "${lastName}"`);
              districtMap.set(district, { ...existing, name: fullName, first_name: firstName, last_name: lastName, photo_url: photoUrl || existing.photo_url } as any);
            }
          }
        } else {
          // No existing record for this district → INSERT new
          const newRecord = {
            people_id: nextId++,
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            chamber: chamberName,
            district: district,
            role: role,
            email: email,
            photo_url: photoUrl,
            nys_bio_url: nysBioUrl,
          };

          const { error: insertError } = await supabase
            .from("People")
            .insert(newRecord);

          if (insertError) {
            console.error(`Failed to insert ${fullName}: ${insertError.message}`);
            errorCount++;
            errors.push(`Insert failed: ${fullName} - ${insertError.message}`);
          } else {
            insertedCount++;
            districtMap.set(district, { ...newRecord, photo_url: photoUrl } as any);
          }
        }
      } catch (memberError) {
        console.error(`Error processing member:`, memberError);
        errorCount++;
        errors.push(`Processing error: ${memberError.message}`);
      }
    }

    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    const result = {
      success: true,
      totalFetched: apiMembers.length,
      inserted: insertedCount,
      updated: updatedCount,
      archived: archivedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors.slice(0, 20) : undefined,
      replacementDetails: replacements.length > 0 ? replacements : undefined,
      duration,
    };

    console.log('Sync complete:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    console.error('Sync failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      inserted: insertedCount,
      updated: updatedCount,
      archived: archivedCount,
      errors: errorCount,
      duration,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ── Request handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, sessionYear } = body;

    if (action !== 'sync-members') {
      return new Response(JSON.stringify({
        error: `Unknown action: ${action}. Use "sync-members".`,
        success: false,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const year = sessionYear || getCurrentSessionYear();
    console.log(`Starting member sync for session year ${year}...`);

    return await syncMembers(year);
  } catch (error) {
    console.error('Error in sync-members function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
