-- Migration: Fix guest group reference
-- Changes group_name (TEXT) to group_id (UUID FK) for proper relational integrity
-- Run this in Supabase SQL Editor

-- Step 1: Add the new group_id column
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES guest_groups(id) ON DELETE SET NULL;

-- Step 2: Create index for the new column
CREATE INDEX IF NOT EXISTS idx_guests_group_id ON guests(group_id);

-- Step 3: Migrate existing data - match group_name to guest_groups.name within same event
UPDATE guests g
SET group_id = gg.id
FROM guest_groups gg
WHERE g.event_id = gg.event_id 
  AND g.group_name = gg.name
  AND g.group_id IS NULL;

-- Step 4: For guests with group_name that doesn't exist in guest_groups,
-- create the missing groups
INSERT INTO guest_groups (event_id, name, color)
SELECT DISTINCT g.event_id, g.group_name, '#64748b'
FROM guests g
WHERE g.group_id IS NULL
  AND g.group_name IS NOT NULL
  AND g.group_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM guest_groups gg 
    WHERE gg.event_id = g.event_id AND gg.name = g.group_name
  );

-- Step 5: Re-run the update to catch newly created groups
UPDATE guests g
SET group_id = gg.id
FROM guest_groups gg
WHERE g.event_id = gg.event_id 
  AND g.group_name = gg.name
  AND g.group_id IS NULL;

-- Step 6: Drop the old column (optional - run after confirming migration worked)
-- Uncomment the line below after verifying data is correct
-- ALTER TABLE guests DROP COLUMN group_name;

-- For now, keep group_name as nullable for backwards compatibility
ALTER TABLE guests ALTER COLUMN group_name DROP NOT NULL;

-- Verification query (run to check migration status):
-- SELECT 
--   COUNT(*) as total_guests,
--   COUNT(group_id) as with_group_id,
--   COUNT(group_name) as with_group_name,
--   COUNT(*) FILTER (WHERE group_id IS NULL AND group_name IS NOT NULL) as needs_migration
-- FROM guests;

