# Populating Wikibooks

This guide explains how to add Wikibooks to your Bibliotech database.

## Prerequisites

1. **Run Database Migrations** (if not already done):
   ```sql
   -- First migration: Add source and source_id
   -- Run: supabase/migrations/20251219230000_add_book_source_fields.sql
   
   -- Second migration: Add unified book_uri
   -- Run: supabase/migrations/20251219230001_add_book_uri_unified.sql
   ```

   You can run these in the Supabase SQL Editor, or use:
   ```bash
   ./show-migrations.sh  # View SQL
   # Then copy to Supabase Dashboard SQL Editor
   ```

2. **Environment Variables**:
   Make sure your `.env` file has:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Running the Script

### Fetch All Wikibooks (Default)

```bash
# Fetch all available wikibooks
npm run populate-wikibooks

# Or explicitly
npm run populate-wikibooks:all

# Or directly
node populate-wikibooks.js
node populate-wikibooks.js all
node populate-wikibooks.js 0
```

### Fetch a Specific Number

```bash
# Fetch 50 books (default if limit was previously set)
node populate-wikibooks.js 50

# Fetch 100 books
node populate-wikibooks.js 100
```

### Help

```bash
node populate-wikibooks.js --help
```

## What the Script Does

1. **Fetches Books**: Retrieves book pages from Wikibooks using the MediaWiki API
   - Shows progress every 500 pages when fetching all
2. **Filters**: Removes non-book pages (categories, templates, etc.)
3. **Fetches Details**: Gets detailed information for each book (description, URL, etc.)
4. **Classifies**: Automatically assigns Dewey Decimal classification
   - Shows classification in output: `[000 - Computer Science, Information & General Works]`
5. **Matches Faculty**: Attempts to automatically link books to faculty members based on:
   - Department names
   - Subject keywords
   - Book titles and content
6. **Inserts**: Adds books to your database with:
   - `book_uri`: `wikibooks://{page_title}`
   - `source`: `wikibooks`
   - `source_id`: URL-encoded page title
   - Automatic Dewey Decimal classification
   - Faculty links (when matches are found)

## Example Output

```
📚 Fetching ALL Wikibooks from MediaWiki API...

  📥 Fetched 500 pages so far...
  📥 Fetched 1000 pages so far...
Found 3500 pages from Wikibooks
Filtered to 3200 likely books

Processing 3200 wikibooks...

📦 Batch 1/640 (1-5 of 3200)...
  ✓ "Python Programming" [000 - Computer Science, Information & General Works] (linked to faculty)
  ✓ "JavaScript Basics" [000 - Computer Science, Information & General Works]
  ✓ "Introduction to Mathematics" [500 - Science] (linked to faculty)
  ...

============================================================
📊 Summary
============================================================
✅ Inserted: 3150
👥 Linked to faculty: 450
⏭️  Skipped: 50
❌ Errors: 0
📖 Total processed: 3200
============================================================
```

## Dewey Decimal Classification

The script automatically classifies books and shows the classification in the output:

- `[000]` - Computer Science, Information & General Works
- `[100]` - Philosophy & Psychology
- `[200]` - Religion
- `[300]` - Social Sciences
- `[400]` - Language
- `[500]` - Science
- `[600]` - Technology
- `[700]` - Arts & Recreation
- `[800]` - Literature
- `[900]` - History & Geography

## Faculty Matching

The script attempts to match books to faculty members by:

1. **Department Matching**: If a faculty member's department matches keywords in the book title or description
2. **Subject Keywords**: Matching common subject terms (computer, programming, mathematics, etc.) with faculty departments
3. **Name Matching**: Checking if faculty names appear in book content (lower weight)

Only matches with a score ≥ 5 are linked. You can adjust the matching logic in the `matchFacultyToBook()` function.

## Rate Limiting

The script includes delays to respect Wikibooks API rate limits:
- 300ms delay between individual book fetches
- 400ms delay between book processing
- 2 second delay between batches
- 500ms delay between API pagination calls

If you encounter rate limiting errors, increase these delays in the script.

## Processing Time

- **Fetching all wikibooks**: Can take 10-30 minutes depending on total number
- **Processing**: ~1-2 seconds per book (with delays)
- **Total for ~3000 books**: Approximately 1-2 hours

The script shows progress indicators to keep you informed.

## Troubleshooting

### "source column not found"
Run the database migrations first (see Prerequisites above).

### "HTTP 403" errors
The script includes a User-Agent header. If you still get 403 errors, you may need to:
- Wait a bit and try again (rate limiting)
- Check if your IP is blocked
- Contact Wikibooks if you need higher rate limits

### "Already exists" messages
This is normal - the script skips books that are already in your database.

### No faculty matches
This is also normal. Faculty matching is best-effort. You can:
- Manually link books to faculty via the database
- Improve the matching algorithm in `matchFacultyToBook()`
- Add more faculty members with relevant departments

## Customization

### Adjusting Matching Threshold

In `populate-wikibooks.js`, modify the `matchFacultyToBook()` function:

```javascript
// Change this line to adjust matching sensitivity
return bestScore >= 5 ? bestMatch : null;  // Lower = more matches
```

### Adding More Subject Keywords

Add to the `subjectKeywords` array in `matchFacultyToBook()`:

```javascript
const subjectKeywords = [
    'computer', 'programming', // ... existing keywords
    'your-keyword-here'  // Add new keywords
];
```

### Filtering Books

Modify the `isLikelyBook()` function to filter out specific types of pages:

```javascript
function isLikelyBook(pageTitle) {
    // Add your custom filters here
    if (pageTitle.includes('YourFilter')) {
        return false;
    }
    // ... existing filters
}
```

## Next Steps

After populating Wikibooks:

1. **Review Faculty Links**: Check which books were linked to faculty
2. **Manual Linking**: Link additional books to faculty as needed
3. **Verify in UI**: Check that books appear correctly in your Bibliotech interface
4. **Add More Sources**: Use the same pattern to add books from other sources
