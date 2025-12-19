/**
 * Create example marginalia and take a screenshot
 * 
 * Prerequisites:
 * 1. Run the marginalia table SQL from supabase-schema.sql in Supabase SQL Editor
 * 2. Have at least one book and one faculty member in the database
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
            if (error.code === 'PGRST205') {
                console.error('❌ Marginalia table does not exist!\n');
                console.error('Please run this SQL in Supabase SQL Editor (from supabase-schema.sql lines 34-78):\n');
                console.error('='.repeat(80));
                const schemaPath = path.join(__dirname, 'supabase-schema.sql');
                if (fs.existsSync(schemaPath)) {
                    const schema = fs.readFileSync(schemaPath, 'utf8');
                    const lines = schema.split('\n');
                    console.error(lines.slice(33, 78).join('\n'));
                }
                console.error('='.repeat(80));
                return null;
            }
            console.error('Error creating marginalia:', error);
            return null;
        }
    }
    
    console.log('✅ Marginalia created successfully!\n');
    return { book, facultyMember, marginalia };
}

async function takeScreenshot() {
    console.log('Taking screenshot...\n');
    
    // Install puppeteer if needed
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
            console.error('Failed to install puppeteer. Please install manually:');
            console.error('  npm install puppeteer --save-dev');
            return null;
        }
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Load the page - try local file first, then localhost
    const indexPath = path.join(__dirname, 'index.html');
    const fileUrl = `file://${indexPath}`;
    
    console.log(`Loading ${fileUrl}...\n`);
    
    try {
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Try to open a book
        const bookSpines = await page.$$('.book-spine');
        if (bookSpines.length > 0) {
            console.log('Opening book...\n');
            await bookSpines[0].click();
            await page.waitForTimeout(2000);
            
            // Click "Read Book" button
            const buttons = await page.$$('button');
            for (const button of buttons) {
                const text = await page.evaluate(el => el.textContent, button);
                if (text && text.includes('Read Book')) {
                    await button.click();
                    await page.waitForTimeout(2000);
                    break;
                }
            }
            
            // Toggle marginalia display
            const toggleButtons = await page.$$('button');
            for (const button of toggleButtons) {
                const text = await page.evaluate(el => el.textContent, button);
                if (text && text.includes('Marginalia')) {
                    await button.click();
                    await page.waitForTimeout(2000);
                    break;
                }
            }
        }
    } catch (e) {
        console.log('Note: Could not fully interact with page, taking screenshot of current state...\n');
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
    // Create marginalia
    const result = await createExampleMarginalia();
    
    if (!result) {
        console.log('\n⚠️  Could not create marginalia. Please ensure:');
        console.log('1. The marginalia table exists (run SQL from supabase-schema.sql)');
        console.log('2. You have at least one book and one faculty member\n');
        process.exit(1);
    }
    
    // Take screenshot
    const screenshotPath = await takeScreenshot();
    
    if (screenshotPath) {
        console.log('✅ Complete! Screenshot saved to:', screenshotPath);
    } else {
        console.log('⚠️  Could not take screenshot, but marginalia was created successfully.');
    }
}

main().catch(console.error);
