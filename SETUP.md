# Bibliotech Setup Guide

## Quick Start

### 1. Supabase Setup

**Note**: This project shares the same Supabase instance as Inquiry.Institute. Use the same Supabase project.

1. **If Supabase is Already Set Up** (for Inquiry.Institute):
   - Use the same Supabase project
   - Go to SQL Editor in your Supabase dashboard
   - Run the `supabase-schema.sql` to create the books and faculty tables
   - Get your API credentials from Settings > API (same as used for Inquiry.Institute)

2. **If Setting Up Supabase for the First Time**:
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Create a new project
   - Wait for the project to be fully provisioned
   - In SQL Editor, run the `supabase-schema.sql` file
   - Go to Settings > API and copy your "Project URL" and "anon public" key

### 2. Configure the Application

1. **Update `config.js`**
   ```javascript
   const CONFIG = {
       SUPABASE_URL: 'https://your-project.supabase.co',
       SUPABASE_ANON_KEY: 'your-anon-key-here'
   };
   ```

### 3. Populate Books (Optional but Recommended)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   (Get the service role key from Supabase Settings > API)

3. **Run the Population Script**
   ```bash
   npm run populate
   ```
   
   **Note**: This will fetch and insert thousands of books from Project Gutenberg. It may take 30-60 minutes depending on your connection and the number of books. You can modify `populate-books.js` to limit the number of books if needed.

### 4. Test Locally

1. **Serve the Files**
   ```bash
   npm run dev
   ```
   Or use any static file server (Python's `http.server`, Node's `serve`, etc.)

2. **Open in Browser**
   - Navigate to `http://localhost:3000` (or whatever port your server uses)
   - You should see the bookshelf with books organized by Dewey Decimal

### 5. Deploy to GitHub Pages

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial Bibliotech setup"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository Settings > Pages
   - Under "Source", select "GitHub Actions"
   - The workflow in `.github/workflows/pages.yml` will automatically deploy

3. **Update Config for Production**
   - Since `config.js` is in the repository, make sure your Supabase project has Row Level Security (RLS) enabled (which the schema does)
   - The anon key is safe to expose in client-side code when RLS is properly configured

## Troubleshooting

### Books Not Loading

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for errors in the Console tab
   - Common issues:
     - Supabase URL/key not configured
     - CORS errors (check Supabase project settings)
     - Network errors

2. **Verify Supabase Connection**
   - Check that your Supabase project is active
   - Verify the URL and key in `config.js`
   - Test the connection in Supabase dashboard > Table Editor

### Population Script Issues

1. **Check Environment Variables**
   - Make sure `.env` file exists and has correct values
   - Service role key is required (not anon key) for the population script

2. **Network Issues**
   - The script fetches from Project Gutenberg's catalog
   - If it fails, check your internet connection
   - The catalog URL might change - check Project Gutenberg's website

3. **Rate Limiting**
   - If you get rate limit errors, add delays between requests in `populate-books.js`

### GitHub Pages Not Working

1. **Check Workflow**
   - Go to Actions tab in your repository
   - Check if the workflow ran successfully
   - Look for any error messages

2. **Check Branch**
   - Make sure you're pushing to `main` or `master` (whichever your default branch is)
   - Update the workflow file if your branch name is different

## Next Steps

- **Link Books to Faculty**: Update books with `faculty_id` to show which faculty member curated each book
- **Add Book Covers**: Populate `cover_url` field with book cover images
- **Customize Styling**: Modify `styles.css` to match your brand
- **Add More Features**: Bookmarks, reading lists, reviews, etc.

## Support

For issues or questions:
- Check the [README.md](README.md) for more details
- Review Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Project Gutenberg: [https://www.gutenberg.org/](https://www.gutenberg.org/)
