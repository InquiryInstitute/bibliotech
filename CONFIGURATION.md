# Bibliotech Configuration Guide

## Quick Configuration

Since bibliotech uses the same Supabase instance as Inquiry.Institute, credentials are stored in `.env` for security.

### Option 1: Interactive Setup (Recommended)

Run the setup script:

```bash
npm install
npm run setup
```

This will prompt you for your Supabase credentials and save them to `.env`, then generate `config.js` for the frontend.

### Option 2: Manual Configuration

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. Generate `config.js` from `.env`:
   ```bash
   npm run build-config
   ```

**Note**: `config.js` is generated from `.env` and should not be edited manually. Always edit `.env` and run `npm run build-config` to update it.

## Getting Your Supabase Credentials

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project (the same one used for Inquiry.Institute)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `SUPABASE_URL`
   - **anon public** key → Use for `SUPABASE_ANON_KEY`

## Setting Up the Database

After configuring the credentials:

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to create the `books` and `faculty` tables

## Populating Books (Optional)

To populate the database with Project Gutenberg books:

1. Get your **service_role** key from Supabase Settings → API
2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. Run the population script:
   ```bash
   npm run populate
   ```

**Note**: The service_role key is different from the anon key and should be kept secret. Only use it for server-side scripts like the population script.

## Verification

To verify your configuration:

1. Make sure `.env` has valid Supabase credentials
2. Run `npm run build-config` to generate `config.js`
3. Run `npm run dev` to start a local server (this will auto-build config.js)
4. Open the page in your browser
5. Check the browser console for any connection errors
6. If books are loading, your configuration is correct!

## Updating Credentials

If you need to update your Supabase credentials:

1. Edit `.env` file
2. Run `npm run build-config` to regenerate `config.js`
3. Restart your dev server if running

## Troubleshooting

### "Supabase client not initialized"
- Check that `config.js` has valid credentials
- Make sure the Supabase URL starts with `https://`
- Verify the anon key is correct

### "Failed to load books"
- Check your Supabase project is active
- Verify the `books` table exists (run the schema SQL)
- Check browser console for detailed error messages
- Verify Row Level Security (RLS) policies allow public read access

### CORS Errors
- Make sure your Supabase project allows requests from your domain
- Check Supabase Settings → API → CORS configuration
