-- Migration: Add source and source_id fields to books table
-- This allows supporting multiple book sources (Gutenberg, Wikibooks, custom, etc.)

-- Add source and source_id columns
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'gutenberg',
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Update existing books to have source_id = gutenberg_id
UPDATE books 
SET source_id = gutenberg_id::TEXT 
WHERE source_id IS NULL AND gutenberg_id IS NOT NULL;

-- Make gutenberg_id nullable (since not all sources have gutenberg IDs)
ALTER TABLE books 
ALTER COLUMN gutenberg_id DROP NOT NULL;

-- Drop the unique constraint on gutenberg_id (we'll use source + source_id instead)
ALTER TABLE books 
DROP CONSTRAINT IF EXISTS books_gutenberg_id_key;

-- Add unique constraint on (source, source_id) combination
ALTER TABLE books 
ADD CONSTRAINT books_source_source_id_unique UNIQUE (source, source_id);

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);

-- Create index on source_id for lookups
CREATE INDEX IF NOT EXISTS idx_books_source_id ON books(source_id);

-- Add comment explaining the fields
COMMENT ON COLUMN books.source IS 'Source of the book: gutenberg, wikibooks, custom, etc.';
COMMENT ON COLUMN books.source_id IS 'Unique identifier within the source (e.g., gutenberg_id for Gutenberg, page title for Wikibooks)';
