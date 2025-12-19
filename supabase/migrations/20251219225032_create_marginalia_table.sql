-- Create marginalia table for faculty comments on books
-- Run this in Supabase SQL Editor

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

-- Trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for marginalia
DROP TRIGGER IF EXISTS update_marginalia_updated_at ON marginalia;
CREATE TRIGGER update_marginalia_updated_at BEFORE UPDATE ON marginalia
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
