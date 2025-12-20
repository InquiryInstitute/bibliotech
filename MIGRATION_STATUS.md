# Migration Status

## ✅ Migrations Ready

The following migrations have been created and are ready to run:

1. **`20251219230000_add_book_source_fields.sql`**
   - Adds `source` and `source_id` columns
   - Makes `gutenberg_id` nullable
   - Adds unique constraint on `(source, source_id)`

2. **`20251219230001_add_book_uri_unified.sql`**
   - Adds `book_uri` column (unified identifier)
   - Generates URIs for existing books
   - Creates helper functions to parse URIs

## 🚀 Running Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're authenticated
supabase login

# Push migrations to remote database
supabase db push
```

**Note**: If you get authentication errors, you may need to:
1. Reset your database password in Supabase Dashboard
2. Wait a few minutes if rate-limited
3. Or use Option 2 below

### Option 2: Manual Execution via Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Inquiry Institute**
3. Navigate to **SQL Editor**
4. Run each migration file in order:

**Migration 1**: Copy and paste contents of:
```
supabase/migrations/20251219230000_add_book_source_fields.sql
```

**Migration 2**: Copy and paste contents of:
```
supabase/migrations/20251219230001_add_book_uri_unified.sql
```

### Option 3: View SQL

```bash
# View all migration SQL
node run-migrations.js show
```

## ✅ Verification

After running migrations, verify they worked:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' 
AND column_name IN ('source', 'source_id', 'book_uri');

-- Check if URIs were generated
SELECT book_uri, source, source_id, title 
FROM books 
LIMIT 5;
```

## 📝 Next Steps

After migrations are complete:

1. **Populate Wikibooks**:
   ```bash
   npm run populate-wikibooks
   ```

2. **Verify in UI**: Check that books appear correctly with proper source links
