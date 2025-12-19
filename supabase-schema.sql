-- Bibliotech Database Schema for Inquiry Institute
-- Books table linked to faculty

-- Create faculty table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gutenberg_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    dewey_decimal TEXT,
    language TEXT DEFAULT 'en',
    subject TEXT,
    publisher TEXT,
    publication_date DATE,
    download_count INTEGER DEFAULT 0,
    faculty_id UUID REFERENCES faculty(id) ON DELETE SET NULL,
    cover_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on dewey_decimal for sorting
CREATE INDEX IF NOT EXISTS idx_books_dewey_decimal ON books(dewey_decimal);

-- Create index on faculty_id for joins
CREATE INDEX IF NOT EXISTS idx_books_faculty_id ON books(faculty_id);

-- Create index on gutenberg_id for lookups
CREATE INDEX IF NOT EXISTS idx_books_gutenberg_id ON books(gutenberg_id);

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
