/**
 * Create marginalia table via REST API, add example marginalia, and take screenshot
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
    console.error('Could not extract project ref from SUPABASE_URL');
    process.exit(1);
}

const REST_URL = `https://${projectRef}.supabase.co/rest/v1/rpc`;

/**
 * Execute SQL via Supabase REST API
 */
async function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        // Use the SQL editor endpoint (requires service role key)
        const sqlUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`;
        
        const postData = JSON.stringify({ query: sql });
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        };
        
        // Try direct SQL execution via REST
        // Note: This may not work if the RPC function doesn't exist
        // Alternative: Use Supabase Management API or provide SQL for manual execution
        
        const req = https.request(sqlUrl, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data || '{}'));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Create marginalia table using direct SQL
 * Since REST API may not support direct SQL, we'll provide the SQL for manual execution
 */
async function ensureMarginaliaTable() {
    const sql = `
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
    
    console.log('⚠️  Please run this SQL in Supabase SQL Editor to create the marginalia table:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\nPress Enter after running the SQL to continue...\n');
    
    // Wait for user input (in a real scenario, we'd use readline)
    // For now, we'll just try to create the marginalia and see if table exists
    return false;
}

/**
 * Create example marginalia using Supabase JS client
 */
async function createExampleMarginalia() {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
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
    
    // Try to insert
    const { data, error } = await supabase
        .from('marginalia')
        .insert(marginalia)
        .select();
    
    if (error) {
        if (error.code === 'PGRST205') {
            console.error('❌ Marginalia table does not exist yet!\n');
            console.error('Please run the SQL shown above in Supabase SQL Editor first.\n');
            return null;
        }
        console.error('Error creating marginalia:', error);
        return null;
    }
    
    console.log('✅ Marginalia created successfully!\n');
    return { book, facultyMember, marginalia };
}

/**
 * Take screenshot using Puppeteer
 */
async function takeScreenshot() {
    console.log('Taking screenshot...\n');
    
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.log('Installing puppeteer...\n');
        const { execSync } = require('child_process');
        try {
            execSync('npm install puppeteer --save-dev', { stdio: 'inherit', cwd: __dirname });
            puppeteer = require('puppeteer');
        } catch (installError) {
            console.error('Failed to install puppeteer. Please install manually: npm install puppeteer --save-dev');
            return null;
        }
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Try to load from local file or localhost
    const indexPath = path.join(__dirname, 'index.html');
    const fileUrl = `file://${indexPath}`;
    
    console.log(`Loading ${fileUrl}...\n`);
    
    try {
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Try to open a book and show marginalia
        const bookSpines = await page.$$('.book-spine');
        if (bookSpines.length > 0) {
            await bookSpines[0].click();
            await page.waitForTimeout(1000);
            
            // Click "Read Book" button
            const readButton = await page.$('button:has-text("Read Book")');
            if (readButton) {
                await readButton.click();
                await page.waitForTimeout(2000);
                
                // Toggle marginalia
                const toggleButton = await page.$('button:has-text("Toggle Marginalia")');
                if (toggleButton) {
                    await toggleButton.click();
                    await page.waitForTimeout(1000);
                }
            }
        }
    } catch (e) {
        console.log('Note: Could not interact with page, taking bookshelf screenshot...\n');
    }
    
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
    // Try to create marginalia
    const result = await createExampleMarginalia();
    
    if (!result) {
        console.log('\n⚠️  Please ensure the marginalia table exists before continuing.');
        console.log('Run the SQL shown above in Supabase SQL Editor.\n');
        return;
    }
    
    // Take screenshot
    await takeScreenshot();
    
    console.log('✅ Done! Check marginalia-screenshot.png\n');
}

main().catch(console.error);
