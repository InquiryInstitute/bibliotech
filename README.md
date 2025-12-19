# Bibliotech

Digital library system for Inquiry Institute featuring Project Gutenberg books, organized by the Dewey Decimal Classification system.

## Features

- 📚 **Digital Bookshelf**: Beautiful 3D book spine visualization
- 🔍 **Search & Filter**: Search by title/author and filter by Dewey Decimal category
- 📖 **Project Gutenberg Integration**: Access to thousands of free books
- 🎨 **Modern UI**: Responsive design with smooth animations
- 🗄️ **Supabase Backend**: Scalable database with Row Level Security

## Setup

### 1. Configure Supabase

**Note**: This project uses the same Supabase instance as Inquiry.Institute.

**Quick Setup:**
```bash
npm install
npm run setup
```

This will prompt you for your Supabase credentials and save them to `.env`.

**Manual Setup:**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your Supabase credentials (get from Supabase dashboard: Settings > API)
3. Generate config.js from .env:
   ```bash
   npm run build-config
   ```

### 2. Set Up Database Tables

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Click Run to create the `books` and `faculty` tables

### 3. Populate Books (Optional)

To populate with Project Gutenberg books:

1. Copy `.env.example` to `.env`
2. Add your Supabase service role key to `.env` (get from Supabase Settings > API)
3. Run: `npm run populate`

### 3. Populate Books Database

Install dependencies and run the population script:

```bash
npm install
npm run populate
```

This will fetch books from Project Gutenberg and populate your Supabase database.

**Note**: The initial population may take a while as it processes thousands of books. You can modify `populate-books.js` to limit the number of books if needed.

### 4. Local Development

```bash
npm run dev
```

Or use any static file server to serve the `index.html` file.

## Project Structure

```
bibliotech/
├── index.html          # Main HTML page
├── app.js              # Main application logic
├── styles.css          # Styling
├── config.js           # Configuration file
├── supabase-schema.sql # Database schema
├── populate-books.js   # Script to populate books
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## Database Schema

### Books Table
- `id`: UUID primary key
- `gutenberg_id`: Unique Project Gutenberg ID
- `title`: Book title
- `author`: Author name
- `dewey_decimal`: Dewey Decimal Classification
- `language`: Language code
- `subject`: Subject classification
- `faculty_id`: Optional link to faculty member
- `cover_url`: Optional cover image URL
- `description`: Book description
- `created_at`, `updated_at`: Timestamps

### Faculty Table
- `id`: UUID primary key
- `name`: Faculty member name
- `email`: Email address
- `department`: Department name

## GitHub Pages Deployment

1. Push your code to GitHub
2. Go to Settings > Pages in your repository
3. Select the source branch (usually `main` or `master`)
4. Select the root directory
5. Your site will be available at `https://yourusername.github.io/bibliotech/`

**Important**: Make sure to update `config.js` with your Supabase credentials before deploying, or use environment variables if your hosting platform supports them.

## Customization

### Adding Faculty Links

To link books to faculty members:

1. Create faculty records in the `faculty` table
2. Update books with `faculty_id` when inserting:
   ```javascript
   {
       ...bookData,
       faculty_id: 'faculty-uuid-here'
   }
   ```

### Styling

Modify `styles.css` to customize:
- Color scheme
- Book spine dimensions
- Layout and spacing
- Animations

### Dewey Decimal Classification

The current implementation uses a simplified classification. For more accurate classification, you can:
- Use a Dewey Decimal API
- Implement a more sophisticated classification algorithm
- Manually assign classifications

## License

MIT

## Acknowledgments

- [Project Gutenberg](https://www.gutenberg.org/) for providing free books
- [Supabase](https://supabase.com/) for the backend infrastructure
