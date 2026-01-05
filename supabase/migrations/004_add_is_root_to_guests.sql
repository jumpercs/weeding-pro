-- Add is_root column to guests table
-- This allows manually marking guests as "roots" (direct invites from organizers)
-- Roots are the starting points of the social tree

ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS is_root BOOLEAN DEFAULT false NOT NULL;

-- Add index for faster filtering of roots
CREATE INDEX IF NOT EXISTS idx_guests_is_root ON guests(is_root) WHERE is_root = true;

-- Comment for documentation
COMMENT ON COLUMN guests.is_root IS 'Manually marked as a root guest (direct invite from organizers). Used for social tree analysis.';

