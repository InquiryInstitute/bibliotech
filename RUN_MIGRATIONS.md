# Running Migrations via Supabase

## ✅ Migration Files Ready

Your migrations are properly formatted and ready:

1. `20251219230000_add_book_source_fields.sql`
2. `20251219230001_add_book_uri_unified.sql`

## 🚀 Recommended: Run via Supabase Dashboard

Since the CLI requires database password authentication, the easiest way is:

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select project: **Inquiry Institute** (xougqdomkoisrxdnagcj)
3. Navigate to **SQL Editor**

### Step 2: Run Migration 1
Copy and paste the contents of:
```
supabase/migrations/20251219230000_add_book_source_fields.sql
```

Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Run Migration 2
Copy and paste the contents of:
```
supabase/migrations/20251219230001_add_book_uri_unified.sql
```

Click **Run**

## ✅ Verify Migrations

After running, verify in SQL Editor:

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' 
AND column_name IN ('source', 'source_id', 'book_uri');

-- Check URIs were generated
SELECT book_uri, source, source_id, title 
FROM books 
LIMIT 5;
```

## 🔄 Alternative: Using Supabase CLI

If you have your database password configured:

```bash
# Wait a few minutes for rate limit to clear
supabase db push
```

Or if you need to repair migration history first:

```bash
supabase migration repair --status applied 20251219230000
supabase migration repair --status applied 20251219230001
```

## 📝 Next Steps

After migrations complete:

```bash
# Populate Wikibooks
npm run populate-wikibooks
```
