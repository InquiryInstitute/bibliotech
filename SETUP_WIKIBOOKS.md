# Quick Setup: Adding Wikibooks Support

## Step 1: Run Database Migrations

You need to run two migrations in your Supabase SQL Editor:

### Migration 1: Add source and source_id fields
File: `supabase/migrations/add_book_source_fields.sql`

This adds:
- `source` column (e.g., 'gutenberg', 'wikibooks', 'custom')
- `source_id` column (unique ID within that source)
- Makes `gutenberg_id` nullable
- Adds unique constraint on `(source, source_id)`

### Migration 2: Add unified book_uri field
File: `supabase/migrations/add_book_uri_unified.sql`

This adds:
- `book_uri` column (unified identifier: `source://identifier`)
- Helper functions to parse URIs
- Indexes for performance

**To run:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Run them in order

## Step 2: Populate Wikibooks

Once migrations are complete:

```bash
# Populate with 50 books (default)
npm run populate-wikibooks

# Or specify a custom number
node populate-wikibooks.js 100
```

## What Gets Added

Each Wikibook will have:
- **book_uri**: `wikibooks://Python_Programming` (unique identifier)
- **source**: `wikibooks`
- **source_id**: URL-encoded page title
- **title**: Book title from Wikibooks
- **author**: "Wikibooks Contributors"
- **publisher**: "Wikibooks"
- **dewey_decimal**: Automatically classified
- **faculty_id**: Linked if a match is found (optional)
- **description**: Extracted from Wikibooks page
- **cover_url**: null (Wikibooks don't have standard covers)

## Verification

After running, check your books table:
```sql
SELECT book_uri, title, source, faculty_id 
FROM books 
WHERE source = 'wikibooks' 
LIMIT 10;
```

You should see books with `book_uri` values like `wikibooks://...`

## Troubleshooting

**"column not found" errors**: Run the migrations first (Step 1)

**No books inserted**: Check that:
- Migrations ran successfully
- Your `.env` has correct Supabase credentials
- You have internet connection (for API calls)

**Rate limiting**: The script includes delays, but if you get 403 errors, wait a few minutes and try again.
