-- Bibliotech Database Schema for Inquiry Institute
-- Books table linked to faculty

-- Create faculty table (if it doesn't exist)
-- Check if faculty table exists and what type id is
DO $$
BEGIN
    -- If faculty table doesn't exist, create it with UUID
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faculty') THEN
        CREATE TABLE faculty (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            department TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    -- If faculty table exists with TEXT id, we need to handle it differently
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'faculty' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Faculty table exists with TEXT id, so books.faculty_id should be TEXT
        -- This will be handled in the books table creation
        NULL;
    END IF;
END $$;

-- Create books table
-- Handle faculty_id type based on existing faculty table
DO $$
DECLARE
    faculty_id_type TEXT;
BEGIN
    -- Check if faculty table exists and what type its id column is
    SELECT data_type INTO faculty_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'faculty'
    AND column_name = 'id';
    
    -- Create books table
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'books') THEN
        IF faculty_id_type = 'text' OR faculty_id_type IS NULL THEN
            -- Faculty table has TEXT id or doesn't exist, use TEXT for faculty_id
            CREATE TABLE books (
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
                faculty_id TEXT REFERENCES faculty(id) ON DELETE SET NULL,
                cover_url TEXT,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        ELSE
            -- Faculty table has UUID id, use UUID for faculty_id
            CREATE TABLE books (
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
        END IF;
    END IF;
END $$;

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
