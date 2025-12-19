-- Migration: Unified URI-based unique identifier for books
-- This replaces the source + source_id approach with a single, flexible URI field
-- URI format: source://identifier (e.g., "gutenberg://12345", "wikibooks://Python_Programming", "custom://my-book-001")
-- This approach is more flexible and extensible for any source, including custom ones

-- Add book_uri column as the primary unique identifier
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS book_uri TEXT UNIQUE;

-- Generate URIs for existing books based on current data
-- For books with gutenberg_id
UPDATE books 
SET book_uri = 'gutenberg://' || gutenberg_id::TEXT 
WHERE book_uri IS NULL AND gutenberg_id IS NOT NULL;

-- For books that already have source and source_id
UPDATE books 
SET book_uri = source || '://' || source_id 
WHERE book_uri IS NULL AND source IS NOT NULL AND source_id IS NOT NULL;

-- Create index on book_uri for fast lookups
CREATE INDEX IF NOT EXISTS idx_books_book_uri ON books(book_uri);

-- Helper function to extract source from URI
CREATE OR REPLACE FUNCTION get_book_source(uri TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN split_part(uri, '://', 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to extract source_id from URI
CREATE OR REPLACE FUNCTION get_book_source_id(uri TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN split_part(uri, '://', 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create computed columns (if supported) or views for easy access
-- Note: PostgreSQL doesn't support computed columns directly, but we can use the functions above

-- Add comment explaining the field
COMMENT ON COLUMN books.book_uri IS 'Unified unique identifier in URI format: source://identifier. Examples: gutenberg://12345, wikibooks://Python_Programming, custom://my-book-001, archive://item123';

-- Optional: After verifying all books have URIs, you can make it NOT NULL
-- ALTER TABLE books ALTER COLUMN book_uri SET NOT NULL;

-- Optional: You can also add a check constraint to ensure URI format
-- ALTER TABLE books ADD CONSTRAINT book_uri_format CHECK (book_uri ~ '^[a-z0-9-]+://.+');
