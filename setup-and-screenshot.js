/**
 * Setup marginalia table, create example marginalia, and take a screenshot
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupMarginaliaTable() {
    console.log('Setting up marginalia table...\n');
    
    // Read the schema SQL
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Extract just the marginalia table creation part
    const marginaliaTableSQL = `
-- Create marginalia table
CREATE TABLE IF NOT EXISTS marginalia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    faculty_id TEXT REFERENCES faculty(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER,
    location TEXT,
    quote TEXT,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marginalia_book_id ON marginalia(book_id);
CREATE INDEX IF NOT EXISTS idx_marginalia_faculty_id ON marginalia(faculty_id);

-- Enable RLS
ALTER TABLE marginalia ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Marginalia are viewable by everyone" ON marginalia;
CREATE POLICY "Marginalia are viewable by everyone" ON marginalia
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Faculty can create marginalia" ON marginalia;
CREATE POLICY "Faculty can create marginalia" ON marginalia
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Faculty can update own marginalia" ON marginalia;
CREATE POLICY "Faculty can update own marginalia" ON marginalia
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Faculty can delete own marginalia" ON marginalia;
CREATE POLICY "Faculty can delete own marginalia" ON marginalia
    FOR DELETE USING (true);

-- Trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger
DROP TRIGGER IF EXISTS update_marginalia_updated_at ON marginalia;
CREATE TRIGGER update_marginalia_updated_at BEFORE UPDATE ON marginalia
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    // Execute via REST API (Supabase doesn't support direct SQL via JS client)
    // We'll use the service role key to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: marginaliaTableSQL });
    
    if (error) {
        // If RPC doesn't exist, we need to run SQL manually
        console.log('Note: Cannot execute SQL directly. Please run the marginalia table creation SQL in Supabase SQL Editor.\n');
        console.log('SQL to run:');
        console.log(marginaliaTableSQL);
        console.log('\nAfter running the SQL, this script will continue...\n');
        return false;
    }
    
    console.log('✅ Marginalia table created/verified\n');
    return true;
}

async function createExampleMarginalia() {
    console.log('Creating example marginalia...\n');
    
    // Get a book
    const { data: books, error: booksError } = await supabase
        .from('books')
        .select('id, title, author, gutenberg_id')
        .not('title', 'eq', 'Untitled')
        .not('author', 'eq', 'Unknown')
        .limit(1);
    
    if (booksError || !books || books.length === 0) {
        console.error('Error fetching books:', booksError);
        return null;
    }
    
    const book = books[0];
    console.log(`Selected book: "${book.title}" by ${book.author}\n`);
    
    // Get a faculty member
    const { data: faculty, error: facultyError } = await supabase
        .from('faculty')
        .select('id, name')
        .limit(1);
    
    if (facultyError || !faculty || faculty.length === 0) {
        console.error('Error fetching faculty:', facultyError);
        return null;
    }
    
    const facultyMember = faculty[0];
    console.log(`Using faculty: ${facultyMember.name || facultyMember.id}\n`);
    
    // Create example marginalia
    const marginalia = {
        book_id: book.id,
        faculty_id: facultyMember.id,
        page_number: 42,
        location: 'Chapter 3, Page 42',
        quote: 'The unexamined life is not worth living.',
        comment: 'This profound statement by Socrates resonates deeply with our modern pursuit of knowledge. The act of examination—of questioning, reflecting, and seeking understanding—is what gives meaning to our existence. In the context of this work, it serves as a reminder that passive acceptance is antithetical to true learning.'
    };
    
    // Check if marginalia already exists
    const { data: existing } = await supabase
        .from('marginalia')
        .select('id')
        .eq('book_id', book.id)
        .eq('faculty_id', facultyMember.id)
        .eq('page_number', 42)
        .limit(1);
    
    if (existing && existing.length > 0) {
        console.log('Marginalia already exists. Updating...\n');
        const { error: updateError } = await supabase
            .from('marginalia')
            .update(marginalia)
            .eq('id', existing[0].id);
        
        if (updateError) {
            console.error('Error updating marginalia:', updateError);
            return null;
        }
    } else {
        const { data, error } = await supabase
            .from('marginalia')
            .insert(marginalia)
            .select();
        
        if (error) {
            console.error('Error creating marginalia:', error);
            console.error('Make sure the marginalia table exists. Run the SQL from supabase-schema.sql in Supabase SQL Editor.\n');
            return null;
        }
    }
    
    console.log('✅ Marginalia created successfully!\n');
    return { book, facultyMember, marginalia };
}

async function takeScreenshot() {
    console.log('Taking screenshot...\n');
    
    // Check if puppeteer is available
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.log('Puppeteer not found. Installing...\n');
        const { execSync } = require('child_process');
        try {
            execSync('npm install puppeteer --save-dev', { stdio: 'inherit' });
            puppeteer = require('puppeteer');
        } catch (installError) {
            console.error('Failed to install puppeteer. Please install manually: npm install puppeteer --save-dev');
            return;
        }
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Load the local index.html
    const indexPath = path.join(__dirname, 'index.html');
    const fileUrl = `file://${indexPath}`;
    
    console.log(`Loading ${fileUrl}...\n`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for books to load
    await page.waitForTimeout(3000);
    
    // Click on the first book to open it
    try {
        await page.click('.book-spine', { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Click "Read Book" button
        const readButton = await page.$('button:has-text("Read Book")');
        if (readButton) {
            await readButton.click();
            await page.waitForTimeout(2000);
            
            // Toggle marginalia display
            const marginaliaToggle = await page.$('button:has-text("Toggle Marginalia")');
            if (marginaliaToggle) {
                await marginaliaToggle.click();
                await page.waitForTimeout(1000);
            }
        }
    } catch (e) {
        console.log('Could not open book reader, taking screenshot of bookshelf...\n');
    }
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'marginalia-screenshot.png');
    await page.screenshot({ 
        path: screenshotPath,
        fullPage: true
    });
    
    await browser.close();
    
    console.log(`✅ Screenshot saved to: ${screenshotPath}\n`);
    return screenshotPath;
}

async function main() {
    // Try to setup table (may fail if RPC doesn't exist)
    await setupMarginaliaTable();
    
    // Create example marginalia
    const result = await createExampleMarginalia();
    
    if (!result) {
        console.log('Could not create marginalia. Please ensure:');
        console.log('1. The marginalia table exists (run SQL from supabase-schema.sql)');
        console.log('2. You have at least one book and one faculty member in the database\n');
        return;
    }
    
    // Take screenshot
    await takeScreenshot();
    
    console.log('✅ Done! Check marginalia-screenshot.png\n');
}

main().catch(console.error);
