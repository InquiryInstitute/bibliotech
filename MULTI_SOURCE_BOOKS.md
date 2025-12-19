# Multi-Source Book Support

The Bibliotech system now supports books from multiple sources, not just Project Gutenberg. This allows you to add books from Wikibooks, your own custom sources, and more.

## Database Schema

The `books` table uses a **URI-based unique identifier** (`book_uri`) for flexible, extensible identification:

- **`book_uri`**: A unified unique identifier in URI format: `source://identifier`
  - Examples:
    - `gutenberg://12345` - Project Gutenberg book #12345
    - `wikibooks://Python_Programming` - Wikibooks page
    - `custom://my-book-001` - Your own custom book
    - `archive://item123` - Internet Archive item
    - `local://uuid-here` - Local/internal book

The `book_uri` field is unique and can handle any source format. The `source` and `source_id` fields are kept for backward compatibility and filtering, but `book_uri` is the primary identifier.

### Migration

To update your existing database, run the migrations in order:

```bash
# Step 1: Add source and source_id fields (if not already done)
# Copy the contents of supabase/migrations/add_book_source_fields.sql
# and run it in the Supabase Dashboard SQL Editor

# Step 2: Add unified book_uri field
# Copy the contents of supabase/migrations/add_book_uri_unified.sql
# and run it in the Supabase Dashboard SQL Editor

# Or view the migrations
node run-migration.js supabase/migrations/add_book_source_fields.sql
node run-migration.js supabase/migrations/add_book_uri_unified.sql
```

The migrations will:
1. Add `source` and `source_id` columns (for backward compatibility)
2. Add `book_uri` column as the primary unique identifier
3. Generate URIs for existing books (e.g., `gutenberg://12345`)
4. Create helper functions to extract source and identifier from URIs

## Supported Sources

### 1. Project Gutenberg

```javascript
{
  book_uri: 'gutenberg://12345',  // Primary identifier
  source: 'gutenberg',  // For filtering
  source_id: '12345',  // For backward compatibility
  gutenberg_id: 12345,  // Kept for backward compatibility
  title: 'Pride and Prejudice',
  author: 'Jane Austen',
  publisher: 'Project Gutenberg',
  // ... other fields
}
```

### 2. Wikibooks

```javascript
{
  book_uri: 'wikibooks://Python_Programming',  // Primary identifier
  source: 'wikibooks',
  source_id: 'Python_Programming',  // URL-encoded page title
  gutenberg_id: null,
  title: 'Python Programming',
  author: 'Wikibooks Contributors',
  publisher: 'Wikibooks',
  // ... other fields
}
```

### 3. Custom Sources

You can add your own books with any URI format:

```javascript
{
  book_uri: 'custom://my-book-001',  // Primary identifier
  source: 'custom',
  source_id: 'my-book-001',
  gutenberg_id: null,
  title: 'My Custom Book',
  author: 'Your Name',
  publisher: 'Your Publisher',
  // ... other fields
}
```

### 4. Other Sources

The URI format is flexible - you can use any source identifier:

```javascript
{
  book_uri: 'archive://item123',  // Internet Archive
  // or
  book_uri: 'local://550e8400-e29b-41d4-a716-446655440000',  // Local UUID
  // or
  book_uri: 'openlibrary://OL123456M',  // Open Library
  // etc.
}
```

## Populating Books

### Project Gutenberg Books

```bash
npm run populate
# or
node populate-books.js
```

### Wikibooks

```bash
npm run populate-wikibooks
# or
node populate-wikibooks.js [limit]
```

Example: `node populate-wikibooks.js 100` to fetch 100 wikibooks.

### Custom Books

You can insert custom books directly via Supabase or create your own script:

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

await supabase.from('books').insert({
  book_uri: 'custom://my-unique-id',  // Required: unique URI
  source: 'custom',  // Optional: for filtering
  source_id: 'my-unique-id',  // Optional: for backward compatibility
  title: 'My Book',
  author: 'Author Name',
  publisher: 'My Publisher',
  dewey_decimal: '000',
  language: 'en',
  faculty_id: 'faculty-id-if-applicable'
});
```

**Important**: Always provide a unique `book_uri` when inserting books. The format is `source://identifier` where:
- `source` is any lowercase alphanumeric identifier (e.g., `custom`, `archive`, `local`)
- `identifier` is any unique string within that source

## Linking to Faculty

Books can be linked to faculty members via the `faculty_id` field. The `populate-wikibooks.js` script attempts to automatically match books to faculty based on:
- Department names
- Faculty names
- Subject keywords

You can also manually link books to faculty when inserting them.

## Frontend Display

The frontend (`app.js`) automatically handles different sources by parsing the `book_uri`:
- Gutenberg books: `gutenberg://12345` → `https://www.gutenberg.org/ebooks/12345`
- Wikibooks: `wikibooks://Python_Programming` → `https://en.wikibooks.org/wiki/Python_Programming`
- Custom books: Can be configured in `getBookSourceLink()` function

The `getBookSourceLink()` function parses the `book_uri` to determine the appropriate external link.

## Adding New Sources

To add support for a new source:

1. Choose a unique source identifier (e.g., `'archive'`, `'openlibrary'`)
2. Create a unique `book_uri` in the format: `source://identifier`
3. Create a population script that generates URIs for that source
4. Update `getBookSourceLink()` in `app.js` to handle the new source URI format
5. Add any source-specific logic as needed

Example for Internet Archive:
```javascript
const bookUri = 'archive://item123';
const bookData = {
  book_uri: bookUri,
  source: 'archive',
  source_id: 'item123',
  title: 'Book Title',
  // ... other fields
};
```

## Backward Compatibility

- Existing Gutenberg books continue to work
- The `gutenberg_id`, `source`, and `source_id` fields are kept for backward compatibility
- All existing queries should continue to work
- **New books should use `book_uri` as the primary identifier**
- The `book_uri` is automatically generated from `source` and `source_id` if not provided
