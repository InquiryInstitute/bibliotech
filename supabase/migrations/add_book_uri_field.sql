-- Migration: Add URI-based unique identifier for books
-- This allows supporting any source with a single unified identifier
-- URI format: source://source_id (e.g., "gutenberg://12345", "wikibooks://Python_Programming", "custom://my-book-001")

-- Add book_uri column as the primary unique identifier
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS book_uri TEXT UNIQUE;

-- Generate URIs for existing books
-- Gutenberg books
UPDATE books 
SET book_uri = 'gutenberg://' || gutenberg_id::TEXT 
WHERE book_uri IS NULL AND gutenberg_id IS NOT NULL;

-- Books with source and source_id already set
UPDATE books 
SET book_uri = source || '://' || source_id 
WHERE book_uri IS NULL AND source IS NOT NULL AND source_id IS NOT NULL;

-- Create index on book_uri for fast lookups
CREATE INDEX IF NOT EXISTS idx_books_book_uri ON books(book_uri);

-- Add comment explaining the field
COMMENT ON COLUMN books.book_uri IS 'Unified unique identifier in URI format: source://identifier (e.g., gutenberg://12345, wikibooks://Python_Programming, custom://my-book-001)';

-- Make book_uri NOT NULL after populating existing records
-- (Run this after verifying all books have URIs)
-- ALTER TABLE books ALTER COLUMN book_uri SET NOT NULL;
