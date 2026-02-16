-- ============================================================================
-- FIX: Brad Hoylman-Sigal / Erik Bottcher district succession
-- ============================================================================
-- Problem: The sync-members function overwrote Brad's People record with Erik's
-- data when Erik won the SD-047 special election. This means:
--   - Brad's people_id now shows Erik's name
--   - All of Brad's bills/votes/sponsors records point to Erik
--
-- Fix:
--   1. Find the current (overwritten) record for SD-047
--   2. Insert a NEW record for Brad with his original data, mark as archived
--   3. Reassign all Sponsors records from before Erik's start date back to Brad
--   4. Update the existing record to be clean Erik data
-- ============================================================================

-- Step 0: Check current state (run this first to see what we're working with)
SELECT people_id, name, first_name, last_name, district, chamber, archived
FROM "People"
WHERE district = 'SD-047'
   OR last_name ILIKE '%hoylman%'
   OR last_name ILIKE '%bottcher%'
ORDER BY people_id;

-- ============================================================================
-- Step 1: Get the next available people_id
-- ============================================================================
-- SELECT MAX(people_id) + 1 AS next_id FROM "People";

-- ============================================================================
-- Step 2: Insert Brad Hoylman-Sigal as an archived member
-- Replace NEXT_ID below with the value from Step 1
-- ============================================================================
-- INSERT INTO "People" (
--   people_id, name, first_name, last_name, middle_name,
--   chamber, district, role, party, archived,
--   nys_bio_url
-- ) VALUES (
--   NEXT_ID,
--   'Brad Hoylman-Sigal', 'Brad', 'Hoylman-Sigal', NULL,
--   'Senate', NULL, 'Sen', 'D', true,
--   'https://www.nysenate.gov/senators/brad-hoylman-sigal'
-- );

-- ============================================================================
-- Step 3: Reassign Brad's sponsor records to his new people_id
-- First check which bills are linked:
-- ============================================================================
-- SELECT s.bill_id, s.people_id, s.position, b.bill_number, b.description
-- FROM "Sponsors" s
-- JOIN "Bills" b ON b.bill_id = s.bill_id
-- WHERE s.people_id = ERIK_PEOPLE_ID  -- The current people_id for SD-047
--   AND s.position = 1
-- ORDER BY b.bill_number;

-- Reassign all primary sponsor records to Brad's new people_id
-- (Erik hasn't sponsored any bills yet — all these are Brad's)
-- UPDATE "Sponsors"
-- SET people_id = BRAD_NEW_ID
-- WHERE people_id = ERIK_PEOPLE_ID
--   AND position = 1;

-- ============================================================================
-- Step 4: Clean up Erik's record (clear Brad's bio etc.)
-- ============================================================================
-- UPDATE "People"
-- SET bio_long = NULL,
--     bio_short = NULL,
--     leadership_title = NULL
-- WHERE people_id = ERIK_PEOPLE_ID;

-- ============================================================================
-- Step 5: Verify the fix
-- ============================================================================
-- SELECT p.people_id, p.name, p.archived, p.district,
--        COUNT(s.bill_id) AS sponsored_bills
-- FROM "People" p
-- LEFT JOIN "Sponsors" s ON s.people_id = p.people_id AND s.position = 1
-- WHERE p.last_name ILIKE '%hoylman%' OR p.last_name ILIKE '%bottcher%'
-- GROUP BY p.people_id, p.name, p.archived, p.district;
