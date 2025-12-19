/**
 * Script to populate Supabase books table with Wikibooks
 * 
 * Usage: node populate-wikibooks.js
 * 
 * Requires environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for admin access)
 * 
 * This script:
 * 1. Fetches books from Wikibooks using the MediaWiki API
 * 2. Attempts to match books to faculty based on subject/topic
 * 3. Inserts them into the books table with negative gutenberg_id values
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Wikibooks API endpoint
const WIKIBOOKS_API_URL = 'https://en.wikibooks.org/w/api.php';

// Dewey Decimal classification mapping for common subjects
const DEWEY_MAP = {
    'computer': '000',
    'programming': '000',
    'software': '000',
    'information': '000',
    'philosophy': '100',
    'psychology': '100',
    'religion': '200',
    'social': '300',
    'sociology': '300',
    'economics': '300',
    'politics': '300',
    'language': '400',
    'linguistics': '400',
    'science': '500',
    'mathematics': '500',
    'physics': '500',
    'chemistry': '500',
    'biology': '500',
    'technology': '600',
    'engineering': '600',
    'medicine': '600',
    'arts': '700',
    'music': '780',
    'literature': '800',
    'poetry': '800',
    'history': '900',
    'geography': '910'
};

/**
 * Generate a URL-safe source ID from a wikibook title
 */
function generateWikibookSourceId(title) {
    // Use the page title as the source_id (URL-encoded if needed)
    // The title is already unique within Wikibooks
    return encodeURIComponent(title);
}

/**
 * Generate book URI from source and identifier
 */
function generateBookUri(source, identifier) {
    return `${source}://${identifier}`;
}

/**
 * Fetch books from Wikibooks API
 */
async function fetchWikibooks(limit = 100) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            list: 'allpages',
            apnamespace: '0', // Main namespace (books)
            aplimit: limit.toString(),
            apcontinue: ''
        });

        https.get(`${WIKIBOOKS_API_URL}?${params.toString()}`, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.query?.allpages || []);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Fetch detailed information about a wikibook page
 */
async function fetchWikibookDetails(pageTitle) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            titles: pageTitle,
            prop: 'extracts|info',
            exintro: 'true',
            explaintext: 'true',
            inprop: 'url'
        });

        https.get(`${WIKIBOOKS_API_URL}?${params.toString()}`, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const pages = json.query?.pages;
                    if (pages) {
                        const pageId = Object.keys(pages)[0];
                        const page = pages[pageId];
                        resolve({
                            title: page.title,
                            extract: page.extract || '',
                            fullurl: page.fullurl || `https://en.wikibooks.org/wiki/${encodeURIComponent(pageTitle)}`,
                            pageid: page.pageid
                        });
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Determine Dewey Decimal classification from title and content
 */
function getDeweyDecimal(title, extract) {
    const text = (title + ' ' + (extract || '')).toLowerCase();
    
    // Try to match subject keywords
    for (const [keyword, dewey] of Object.entries(DEWEY_MAP)) {
        if (text.includes(keyword)) {
            return dewey;
        }
    }
    
    // Default to general works
    return '000';
}

/**
 * Match book to faculty based on subject/topic
 */
async function matchFacultyToBook(title, extract, subject) {
    // Get all faculty members
    const { data: faculty, error } = await supabase
        .from('faculty')
        .select('id, name, department')
        .limit(100);
    
    if (error || !faculty || faculty.length === 0) {
        return null;
    }
    
    const text = (title + ' ' + (extract || '') + ' ' + (subject || '')).toLowerCase();
    
    // Try to match based on department or name keywords
    for (const member of faculty) {
        const department = (member.department || '').toLowerCase();
        const name = (member.name || '').toLowerCase();
        
        // Check if any keywords from faculty match the book
        const facultyText = department + ' ' + name;
        const facultyKeywords = facultyText.split(/\s+/).filter(k => k.length > 3);
        
        for (const keyword of facultyKeywords) {
            if (text.includes(keyword)) {
                return member.id;
            }
        }
        
        // Also check if department name appears in book title/subject
        if (department && text.includes(department)) {
            return member.id;
        }
    }
    
    return null;
}

/**
 * Insert wikibook into Supabase
 */
async function insertWikibook(page, details) {
    if (!details) {
        console.log(`Skipping ${page.title}: Could not fetch details`);
        return null;
    }
    
    const source = 'wikibooks';
    const sourceId = generateWikibookSourceId(page.title);
    const bookUri = generateBookUri(source, sourceId);
    
    // Check if book already exists (by book_uri, or fallback to source + source_id)
    let existing = null;
    
    // Try book_uri first
    const { data: existingByUri } = await supabase
        .from('books')
        .select('id')
        .eq('book_uri', bookUri)
        .maybeSingle();
    
    if (existingByUri) {
        existing = existingByUri;
    } else {
        // Fallback to source + source_id
        const { data: existingBySource } = await supabase
            .from('books')
            .select('id')
            .eq('source', source)
            .eq('source_id', sourceId)
            .maybeSingle();
        
        existing = existingBySource;
    }
    
    if (existing) {
        return null; // Already exists
    }
    
    // Determine classification
    const deweyDecimal = getDeweyDecimal(page.title, details.extract);
    
    // Try to match to faculty
    const facultyId = await matchFacultyToBook(page.title, details.extract, null);
    
    // Extract author (Wikibooks are collaborative, so use "Wikibooks Contributors")
    const author = 'Wikibooks Contributors';
    
    // Create description from extract
    const description = details.extract 
        ? details.extract.substring(0, 500) + (details.extract.length > 500 ? '...' : '')
        : `A collaborative textbook from Wikibooks. ${details.fullurl}`;
    
    const bookData = {
        book_uri: bookUri, // Primary unique identifier
        source: source, // Keep for backward compatibility and filtering
        source_id: sourceId, // Keep for backward compatibility
        gutenberg_id: null, // Not applicable for Wikibooks
        title: page.title,
        author: author,
        dewey_decimal: deweyDecimal,
        language: 'en',
        subject: null, // Could extract from categories if needed
        publisher: 'Wikibooks',
        publication_date: null, // Wikibooks are continuously updated
        description: description,
        cover_url: null, // Wikibooks don't have standard cover images
        faculty_id: facultyId
    };
    
    const { data, error } = await supabase
        .from('books')
        .insert([bookData])
        .select()
        .single();
    
    if (error) {
        console.error(`Error inserting wikibook "${page.title}":`, error.message);
        return null;
    }
    
    return data;
}

/**
 * Main function to populate wikibooks
 */
async function populateWikibooks(limit = 50) {
    console.log('Fetching Wikibooks from MediaWiki API...');
    
    try {
        const pages = await fetchWikibooks(limit);
        console.log(`Found ${pages.length} wikibooks pages`);
        
        console.log('Processing wikibooks...');
        let inserted = 0;
        let skipped = 0;
        let errors = 0;
        
        // Process in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < pages.length; i += batchSize) {
            const batch = pages.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, pages.length)} of ${pages.length})...`);
            
            for (const page of batch) {
                try {
                    // Fetch detailed information
                    const details = await fetchWikibookDetails(page.title);
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    const result = await insertWikibook(page, details);
                    if (result) {
                        inserted++;
                        if (result.faculty_id) {
                            console.log(`  ✓ Inserted: "${page.title}" (linked to faculty)`);
                        } else {
                            console.log(`  ✓ Inserted: "${page.title}"`);
                        }
                    } else {
                        skipped++;
                    }
                } catch (error) {
                    console.error(`Error processing "${page.title}":`, error.message);
                    errors++;
                }
                
                // Small delay between books
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n=== Summary ===');
        console.log(`Inserted: ${inserted}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Errors: ${errors}`);
        console.log(`Total processed: ${inserted + skipped + errors}`);
        
    } catch (error) {
        console.error('Error fetching wikibooks:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    // Get limit from command line or use default
    const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
    populateWikibooks(limit).catch(console.error);
}

module.exports = { populateWikibooks, insertWikibook };
