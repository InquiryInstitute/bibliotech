/**
 * Complete setup: Create marginalia table (if possible), add example, and screenshot
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

async function checkTableExists() {
    // Try to query the table
    const { error } = await supabase
        .from('marginalia')
        .select('id')
        .limit(1);
    
    return error === null || error.code !== 'PGRST205';
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
    
    // Try to insert
    const { data, error } = await supabase
        .from('marginalia')
        .insert(marginalia)
        .select();
    
    if (error) {
        if (error.code === 'PGRST205') {
            console.error('❌ Marginalia table does not exist!\n');
            console.error('Please run the SQL from create-marginalia-table.sql in Supabase SQL Editor.\n');
            return null;
        }
        console.error('Error creating marginalia:', error);
        return null;
    }
    
    console.log('✅ Marginalia created successfully!\n');
    return { book, facultyMember, marginalia };
}

async function takeScreenshot() {
    console.log('Taking screenshot...\n');
    
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.log('Installing puppeteer (this may take a minute)...\n');
        const { execSync } = require('child_process');
        try {
            execSync('npm install puppeteer --save-dev', { 
                stdio: 'inherit', 
                cwd: __dirname 
            });
            puppeteer = require('puppeteer');
        } catch (installError) {
            console.error('Failed to install puppeteer.');
            return null;
        }
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Try deployed site first, then local file
    let url = 'https://bibliotech.inquiry.institute';
    const indexPath = path.join(__dirname, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        url = `file://${indexPath}`;
    }
    
    console.log(`Loading ${url}...\n`);
    
    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Try to open a book and show marginalia
        const bookSpines = await page.$$('.book-spine');
        if (bookSpines.length > 0) {
            console.log('Opening book...\n');
            await bookSpines[0].click();
            await page.waitForTimeout(2000);
            
            // Click "Read Book"
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const readBtn = buttons.find(b => b.textContent.includes('Read Book'));
                if (readBtn) readBtn.click();
            });
            
            await page.waitForTimeout(2000);
            
            // Toggle marginalia
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const margBtn = buttons.find(b => b.textContent.includes('Marginalia'));
                if (margBtn) margBtn.click();
            });
            
            await page.waitForTimeout(2000);
        }
    } catch (e) {
        console.log('Note: Taking screenshot of current state...\n');
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
    // Check if table exists
    const tableExists = await checkTableExists();
    
    if (!tableExists) {
        console.log('⚠️  Marginalia table does not exist.\n');
        console.log('Please run this SQL in Supabase SQL Editor:\n');
        const sqlPath = path.join(__dirname, 'create-marginalia-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('='.repeat(80));
        console.log(sql);
        console.log('='.repeat(80));
        console.log('\nAfter running the SQL, run this script again to create marginalia and take a screenshot.\n');
        process.exit(1);
    }
    
    // Create marginalia
    const result = await createExampleMarginalia();
    
    if (!result) {
        console.log('Could not create marginalia.');
        process.exit(1);
    }
    
    // Take screenshot
    await takeScreenshot();
    
    console.log('✅ Complete! Check marginalia-screenshot.png');
}

main().catch(console.error);
