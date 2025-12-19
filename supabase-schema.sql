-- Bibliotech Database Schema for Inquiry Institute
-- Books table linked to faculty
-- Note: faculty table already exists with TEXT id, so faculty_id is TEXT

-- Create books table (faculty table already exists)
-- Supports multiple sources: gutenberg, wikibooks, custom, etc.
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT DEFAULT 'gutenberg' NOT NULL,
    source_id TEXT NOT NULL,
    gutenberg_id INTEGER, -- Kept for backward compatibility, nullable
    title TEXT NOT NULL,
    author TEXT,
    dewey_decimal TEXT,
    language TEXT DEFAULT 'en',
    subject TEXT,
    publisher TEXT,
    publication_date DATE,
    download_count INTEGER DEFAULT 0,
    faculty_id TEXT REFERENCES faculty(id) ON DELETE SET NULL,
    cover_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT books_source_source_id_unique UNIQUE (source, source_id)
);

-- Create index on dewey_decimal for sorting
CREATE INDEX IF NOT EXISTS idx_books_dewey_decimal ON books(dewey_decimal);

-- Create index on faculty_id for joins
CREATE INDEX IF NOT EXISTS idx_books_faculty_id ON books(faculty_id);

-- Create index on gutenberg_id for lookups (backward compatibility)
CREATE INDEX IF NOT EXISTS idx_books_gutenberg_id ON books(gutenberg_id);

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);

-- Create index on source_id for lookups
CREATE INDEX IF NOT EXISTS idx_books_source_id ON books(source_id);

-- Create marginalia table for faculty comments on books
CREATE TABLE IF NOT EXISTS marginalia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    faculty_id TEXT REFERENCES faculty(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER,
    location TEXT, -- e.g., "Chapter 3, paragraph 2" or "Page 45, line 10"
    quote TEXT, -- The text being commented on
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on book_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_marginalia_book_id ON marginalia(book_id);

-- Create index on faculty_id for filtering by faculty
CREATE INDEX IF NOT EXISTS idx_marginalia_faculty_id ON marginalia(faculty_id);

-- Enable Row Level Security (RLS) for marginalia
ALTER TABLE marginalia ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to marginalia
DROP POLICY IF EXISTS "Marginalia are viewable by everyone" ON marginalia;
CREATE POLICY "Marginalia are viewable by everyone" ON marginalia
    FOR SELECT USING (true);

-- Policy: Allow faculty to insert their own marginalia
DROP POLICY IF EXISTS "Faculty can create marginalia" ON marginalia;
CREATE POLICY "Faculty can create marginalia" ON marginalia
    FOR INSERT WITH CHECK (true); -- In production, check auth.uid() matches faculty_id

-- Policy: Allow faculty to update their own marginalia
DROP POLICY IF EXISTS "Faculty can update own marginalia" ON marginalia;
CREATE POLICY "Faculty can update own marginalia" ON marginalia
    FOR UPDATE USING (true); -- In production, check auth.uid() matches faculty_id

-- Policy: Allow faculty to delete their own marginalia
DROP POLICY IF EXISTS "Faculty can delete own marginalia" ON marginalia;
CREATE POLICY "Faculty can delete own marginalia" ON marginalia
    FOR DELETE USING (true); -- In production, check auth.uid() matches faculty_id

-- Trigger to automatically update updated_at for marginalia
DROP TRIGGER IF EXISTS update_marginalia_updated_at ON marginalia;
CREATE TRIGGER update_marginalia_updated_at BEFORE UPDATE ON marginalia
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to books
CREATE POLICY "Books are viewable by everyone" ON books
    FOR SELECT USING (true);

-- Policy: Allow public read access to faculty
CREATE POLICY "Faculty are viewable by everyone" ON faculty
    FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
