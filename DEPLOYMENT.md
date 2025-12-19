# Deployment Guide

## Local Development

1. **Set up credentials in `.env`**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

2. **Generate config.js**:
   ```bash
   npm run build-config
   ```

3. **Run dev server**:
   ```bash
   npm run dev
   ```
   (This automatically runs `build-config` first)

## GitHub Pages Deployment

### Option 1: Using GitHub Secrets (Recommended)

1. **Add secrets to your GitHub repository**:
   - Go to Settings → Secrets and variables → Actions
   - Add these secrets:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_ANON_KEY`: Your Supabase anon key

2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy bibliotech"
   git push origin main
   ```

3. **The workflow will automatically**:
   - Build `config.js` from secrets during deployment
   - Deploy to GitHub Pages

### Option 2: Manual config.js (Alternative)

If you prefer not to use GitHub Secrets:

1. **Build config.js locally**:
   ```bash
   npm run build-config
   ```

2. **Commit config.js** (note: this exposes your anon key publicly):
   ```bash
   git add config.js
   git commit -m "Add config.js"
   git push origin main
   ```

   **Security Note**: The anon key is safe to expose in client-side code when Row Level Security (RLS) is properly configured in Supabase, which our schema does.

3. **The workflow will deploy** with the committed `config.js`

## Verifying Deployment

After deployment:

1. Check your GitHub Pages URL (usually `https://yourusername.github.io/bibliotech/`)
2. Open browser console to check for any errors
3. Verify books are loading from Supabase

## Troubleshooting

### "Config not found" error
- Make sure `config.js` exists in the repository
- If using secrets, verify they're set correctly in GitHub Settings

### "Supabase client not initialized"
- Check that `config.js` has valid credentials
- Verify the Supabase URL starts with `https://`
- Check browser console for detailed errors

### Books not loading
- Verify the `books` table exists in Supabase
- Check that RLS policies allow public read access
- Verify your Supabase project is active
