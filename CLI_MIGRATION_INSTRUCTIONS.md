# Running Migrations via CLI

## Current Status

The database connection is currently rate-limited due to multiple authentication attempts. You have two options:

## Option 1: Wait and Use CLI (Recommended)

Wait **5-10 minutes** for the rate limit to clear, then:

### Method A: Interactive (will prompt for password)
```bash
supabase db push --linked --include-all --yes
```

When prompted, enter your database password from:
https://supabase.com/dashboard/project/xougqdomkoisrxdnagcj/settings/database

### Method B: With password as argument
```bash
supabase db push --linked --include-all --yes --password YOUR_DATABASE_PASSWORD
```

### Method C: Using the helper script
```bash
./migrate.sh YOUR_DATABASE_PASSWORD
```

## Option 2: Use Supabase Dashboard SQL Editor (Fastest)

Since the CLI is rate-limited, the fastest way is to run the SQL directly:

1. Go to: https://supabase.com/dashboard/project/xougqdomkoisrxdnagcj/sql/new
2. Run Migration 1 (copy from below)
3. Run Migration 2 (copy from below)

### Migration 1: Add source fields

```sql
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'gutenberg',
ADD COLUMN IF NOT EXISTS source_id TEXT;

UPDATE books 
SET source_id = gutenberg_id::TEXT 
WHERE source_id IS NULL AND gutenberg_id IS NOT NULL;

ALTER TABLE books 
ALTER COLUMN gutenberg_id DROP NOT NULL;

ALTER TABLE books 
DROP CONSTRAINT IF EXISTS books_gutenberg_id_key;

ALTER TABLE books 
ADD CONSTRAINT books_source_source_id_unique UNIQUE (source, source_id);

CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);
CREATE INDEX IF NOT EXISTS idx_books_source_id ON books(source_id);

COMMENT ON COLUMN books.source IS 'Source of the book: gutenberg, wikibooks, custom, etc.';
COMMENT ON COLUMN books.source_id IS 'Unique identifier within the source';
```

### Migration 2: Add book_uri

```sql
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS book_uri TEXT UNIQUE;

UPDATE books 
SET book_uri = 'gutenberg://' || gutenberg_id::TEXT 
WHERE book_uri IS NULL AND gutenberg_id IS NOT NULL;

UPDATE books 
SET book_uri = source || '://' || source_id 
WHERE book_uri IS NULL AND source IS NOT NULL AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_books_book_uri ON books(book_uri);

CREATE OR REPLACE FUNCTION get_book_source(uri TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN split_part(uri, '://', 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_book_source_id(uri TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN split_part(uri, '://', 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON COLUMN books.book_uri IS 'Unified unique identifier in URI format: source://identifier';
```

## Verification

After running migrations, verify:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' 
AND column_name IN ('source', 'source_id', 'book_uri');
```

You should see all three columns.

## Next Steps

Once migrations are complete:

```bash
npm run populate-wikibooks
```
