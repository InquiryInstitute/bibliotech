# Database Setup Guide

There are several ways to set up the Bibliotech database schema. Choose the method that works best for you.

## Method 1: Supabase CLI (Recommended)

The Supabase CLI is the most reliable way to set up the database.

### Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Get your project ref from your Supabase dashboard URL: `https://app.supabase.com/project/your-project-ref`)

### Run Setup Script

```bash
chmod +x setup-database-cli.sh
./setup-database-cli.sh
```

Or use npm:
```bash
npm run setup-db-cli
```

The script will:
1. Check for Supabase CLI
2. Link to your project
3. Create a migration from `supabase-schema.sql`
4. Push the migration to your database

## Method 2: Supabase Dashboard (Easiest)

If you prefer a GUI approach:

1. **Open Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Go to SQL Editor**
4. **Copy the contents of `supabase-schema.sql`**
5. **Paste into the SQL Editor**
6. **Click "Run"**

This is the simplest method and doesn't require any CLI tools.

## Method 3: REST API (Advanced)

The Supabase REST API doesn't directly support arbitrary SQL execution. However, you can:

1. **Use the Management API** (if you have access)
2. **Create a custom function** that executes SQL
3. **Use the setup script** (which will guide you):

```bash
npm run setup-db
```

Note: This method has limitations and may not work for all SQL operations.

## Method 4: Manual Migration

If you're using Supabase CLI for migrations:

1. **Create migration**:
   ```bash
   supabase migration new create_bibliotech_tables
   ```

2. **Copy schema**:
   ```bash
   cp supabase-schema.sql supabase/migrations/[timestamp]_create_bibliotech_tables.sql
   ```

3. **Apply migration**:
   ```bash
   supabase db push
   ```

## Verifying Setup

After running any method, verify the tables were created:

1. **In Supabase Dashboard**:
   - Go to **Table Editor**
   - You should see `books` and `faculty` tables

2. **Or via SQL**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('books', 'faculty');
   ```

## Troubleshooting

### "foreign key constraint cannot be implemented"

If you see this error, it means the `faculty` table might have a different `id` type. The schema expects UUID. If your existing `faculty` table uses TEXT, you have two options:

1. **Modify the schema** to match your existing table:
   ```sql
   -- Change books.faculty_id to TEXT if faculty.id is TEXT
   ALTER TABLE books ALTER COLUMN faculty_id TYPE TEXT;
   ALTER TABLE books DROP CONSTRAINT IF EXISTS books_faculty_id_fkey;
   ALTER TABLE books ADD CONSTRAINT books_faculty_id_fkey 
       FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL;
   ```

2. **Or modify faculty table** to use UUID:
   ```sql
   -- Convert faculty.id to UUID (if possible)
   ALTER TABLE faculty ALTER COLUMN id TYPE UUID USING id::uuid;
   ```

### "table already exists"

This is normal if you're re-running the setup. The schema uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### CLI not found

If `supabase` command is not found:
- Make sure you installed it globally: `npm install -g supabase`
- Or use npx: `npx supabase [command]`

## Next Steps

After setting up the database:

1. **Populate books** (optional):
   ```bash
   npm run populate
   ```

2. **Test locally**:
   ```bash
   npm run dev
   ```

3. **Verify books are loading** in your browser
