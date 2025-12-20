/**
 * Script to populate Supabase books table with Wikibooks
 * 
 * Usage: 
 *   node populate-wikibooks.js          # Fetch all wikibooks
 *   node populate-wikibooks.js all      # Fetch all wikibooks
 *   node populate-wikibooks.js 100      # Fetch 100 wikibooks
 * 
 * Requires environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for admin access)
 * 
 * This script:
 * 1. Fetches books from Wikibooks using the MediaWiki API
 * 2. Filters out non-book pages (categories, templates, etc.)
 * 3. Attempts to match books to faculty based on subject/topic
 * 4. Inserts them into the books table with book_uri format: wikibooks://{title}
 * 
 * Note: Make sure to run the database migrations first:
 * - supabase/migrations/add_book_source_fields.sql
 * - supabase/migrations/add_book_uri_unified.sql
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
 * Fetch books from Wikibooks API with pagination support
 * If limit is 0 or not provided, fetches all available books
 */
async function fetchWikibooks(limit = 0) {
    const allPages = [];
    let continueToken = null;
    let fetched = 0;
    const fetchAll = limit === 0 || !limit;
    
    while (fetchAll || fetched < limit) {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            list: 'allpages',
            apnamespace: '0', // Main namespace (books)
            aplimit: '500', // API max is 500
        });
        
        if (continueToken) {
            params.append('apcontinue', continueToken);
        }
        
        const batch = await new Promise((resolve, reject) => {
            const url = `${WIKIBOOKS_API_URL}?${params.toString()}`;
            const options = {
                headers: {
                    'User-Agent': 'Bibliotech/1.0 (https://github.com/yourusername/bibliotech; contact@example.com)'
                }
            };
            https.get(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    // Check if response is valid JSON
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
                        return;
                    }
                    
                    // Check if it looks like an error page
                    if (data.trim().startsWith('<') || !data.trim().startsWith('{')) {
                        reject(new Error(`Invalid response (not JSON): ${data.substring(0, 200)}`));
                        return;
                    }
                    
                    try {
                        const json = JSON.parse(data);
                        
                        if (json.error) {
                            reject(new Error(`API Error: ${json.error.info || JSON.stringify(json.error)}`));
                            return;
                        }
                        
                        resolve({
                            pages: json.query?.allpages || [],
                            continueToken: json.continue?.apcontinue || null
                        });
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}. Response: ${data.substring(0, 200)}`));
                    }
                });
            }).on('error', (err) => {
                reject(new Error(`Request error: ${err.message}`));
            });
        });
        
        allPages.push(...batch.pages);
        fetched += batch.pages.length;
        continueToken = batch.continueToken;
        
        // If fetching all, continue until no more pages
        // If limit specified, stop when reached
        if (!continueToken || (!fetchAll && fetched >= limit)) {
            break;
        }
        
        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Progress indicator for large fetches
        if (fetchAll && fetched % 500 === 0) {
            console.log(`  📥 Fetched ${fetched} pages so far...`);
        }
    }
    
    return fetchAll ? allPages : allPages.slice(0, limit);
}

/**
 * Fetch detailed information about a wikibook page
 */
async function fetchWikibookDetails(pageTitle) {
    return new Promise((resolve, reject) => {
        // MediaWiki API expects titles to be URL-encoded, but spaces as underscores
        const encodedTitle = pageTitle.replace(/ /g, '_');
        
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            titles: encodedTitle,
            prop: 'extracts|info',
            exintro: 'true',
            explaintext: 'true',
            inprop: 'url'
        });

        const url = `${WIKIBOOKS_API_URL}?${params.toString()}`;
        const options = {
            headers: {
                'User-Agent': 'Bibliotech/1.0 (https://github.com/yourusername/bibliotech; contact@example.com)'
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                // Check if response is valid
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} for ${pageTitle}`));
                    return;
                }
                
                // Check if it looks like an error page
                if (data.trim().startsWith('<') || !data.trim().startsWith('{')) {
                    reject(new Error(`Invalid response for ${pageTitle}`));
                    return;
                }
                
                try {
                    const json = JSON.parse(data);
                    
                    if (json.error) {
                        reject(new Error(`API Error for ${pageTitle}: ${json.error.info || JSON.stringify(json.error)}`));
                        return;
                    }
                    
                    const pages = json.query?.pages;
                    if (pages) {
                        const pageId = Object.keys(pages)[0];
                        const page = pages[pageId];
                        
                        // Check if page is missing
                        if (page.missing) {
                            resolve(null);
                            return;
                        }
                        
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
                    reject(new Error(`JSON parse error for ${pageTitle}: ${error.message}`));
                }
            });
        }).on('error', (err) => {
            reject(new Error(`Request error for ${pageTitle}: ${err.message}`));
        });
    });
}

/**
 * Get human-readable name for Dewey Decimal category
 */
function getDeweyName(dewey) {
    const names = {
        '000': 'Computer Science, Information & General Works',
        '100': 'Philosophy & Psychology',
        '200': 'Religion',
        '300': 'Social Sciences',
        '400': 'Language',
        '500': 'Science',
        '600': 'Technology',
        '700': 'Arts & Recreation',
        '800': 'Literature',
        '900': 'History & Geography'
    };
    return names[dewey] || 'Uncategorized';
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
 * Improved matching with better keyword extraction
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
    
    // Common subject keywords that might match departments
    const subjectKeywords = [
        'computer', 'programming', 'software', 'code', 'algorithm', 'data', 'database',
        'mathematics', 'math', 'calculus', 'algebra', 'statistics',
        'physics', 'chemistry', 'biology', 'science',
        'history', 'historical', 'ancient', 'medieval',
        'philosophy', 'ethics', 'logic', 'metaphysics',
        'literature', 'poetry', 'novel', 'writing',
        'language', 'linguistics', 'grammar', 'translation',
        'art', 'music', 'design', 'creative',
        'economics', 'business', 'finance', 'marketing',
        'psychology', 'mental', 'behavior', 'cognitive',
        'education', 'teaching', 'learning', 'pedagogy'
    ];
    
    // Try to match based on department or name keywords
    let bestMatch = null;
    let bestScore = 0;
    
    for (const member of faculty) {
        const department = (member.department || '').toLowerCase();
        const name = (member.name || '').toLowerCase();
        let score = 0;
        
        // Check department match
        if (department) {
            // Exact department match gets high score
            if (text.includes(department)) {
                score += 10;
            }
            
            // Check if department keywords match subject keywords
            for (const keyword of subjectKeywords) {
                if (department.includes(keyword) && text.includes(keyword)) {
                    score += 5;
                }
            }
        }
        
        // Check name match (lower weight)
        const nameWords = name.split(/\s+/).filter(w => w.length > 3);
        for (const word of nameWords) {
            if (text.includes(word)) {
                score += 2;
            }
        }
        
        // Check if title contains department-related terms
        const titleLower = title.toLowerCase();
        if (department && titleLower.includes(department.split(' ')[0])) {
            score += 3;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = member.id;
        }
    }
    
    // Only return a match if score is above threshold
    return bestScore >= 5 ? bestMatch : null;
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
    
    // Determine classification (already calculated in main loop, but recalculate here for consistency)
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
        source: source, // Required for filtering
        source_id: sourceId, // Required for uniqueness
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
    
    // Add book_uri if column exists (will be ignored if it doesn't)
    // We'll try to add it, and if it fails, we'll retry without it
    const bookDataWithUri = {
        ...bookData,
        book_uri: bookUri
    };
    
    // Try with book_uri first, fallback to without if column doesn't exist
    let data, error;
    ({ data, error } = await supabase
        .from('books')
        .insert([bookDataWithUri])
        .select()
        .single());
    
    // If book_uri column doesn't exist, try without it
    if (error && error.message.includes('book_uri')) {
        ({ data, error } = await supabase
            .from('books')
            .insert([bookData])
            .select()
            .single());
    }
    
    if (error) {
        // Don't log error if it's just a duplicate
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            return null; // Already exists
        }
        console.error(`Error inserting wikibook "${page.title}":`, error.message);
        return null;
    }
    
    return data;
}

/**
 * Filter out pages that are likely not actual books
 */
function isLikelyBook(pageTitle) {
    const title = pageTitle.toLowerCase();
    
    // Skip disambiguation pages, categories, templates, etc.
    const skipPatterns = [
        'category:',
        'template:',
        'help:',
        'user:',
        'file:',
        'mediawiki:',
        'disambiguation',
        'redirect',
        'stub',
        'book:',
        'module:'
    ];
    
    for (const pattern of skipPatterns) {
        if (title.includes(pattern)) {
            return false;
        }
    }
    
    // Skip very short titles (likely not books)
    if (pageTitle.length < 3) {
        return false;
    }
    
    return true;
}

/**
 * Check if database has required columns
 */
async function checkDatabaseSchema() {
    // Try to query with source to see if it exists
    const { error: sourceError } = await supabase
        .from('books')
        .select('source')
        .limit(1);
    
    if (sourceError && sourceError.message.includes('source')) {
        console.log('\n❌ ERROR: Database migrations have not been run!');
        console.log('   The "source" column does not exist in the books table.\n');
        console.log('   Please run the migrations first:\n');
        console.log('   Option 1 (Fastest):');
        console.log('     1. Run: ./show-migrations.sh');
        console.log('     2. Copy the SQL to Supabase Dashboard SQL Editor');
        console.log('     3. Run both migrations\n');
        console.log('   Option 2 (After rate limit clears):');
        console.log('     ./migrate.sh YOUR_DATABASE_PASSWORD\n');
        console.log('   Dashboard: https://supabase.com/dashboard/project/xougqdomkoisrxdnagcj/sql/new\n');
        return false;
    }
    
    // Check for book_uri (optional)
    const { error: uriError } = await supabase
        .from('books')
        .select('book_uri')
        .limit(1);
    
    if (uriError && uriError.message.includes('book_uri')) {
        console.log('⚠️  Warning: book_uri column not found.');
        console.log('   Migration 2 (add_book_uri_unified.sql) has not been run.');
        console.log('   Continuing without book_uri...\n');
        return true; // source exists, so we can continue
    }
    
    return true;
}

/**
 * Main function to populate wikibooks
 * @param {number} limit - Number of books to fetch (0 or undefined = fetch all)
 */
async function populateWikibooks(limit = 0) {
    if (limit === 0) {
        console.log('📚 Fetching ALL Wikibooks from MediaWiki API...\n');
    } else {
        console.log(`📚 Fetching ${limit} Wikibooks from MediaWiki API...\n`);
    }
    
    // Check database schema
    const schemaOk = await checkDatabaseSchema();
    if (!schemaOk) {
        console.error('\n❌ Cannot proceed without database migrations.');
        console.error('   Please run the migrations first (see instructions above).\n');
        process.exit(1);
    }
    
    try {
        // If limit is 0, fetch all; otherwise fetch more to account for filtering
        const fetchLimit = limit === 0 ? 0 : limit * 2;
        const pages = await fetchWikibooks(fetchLimit);
        console.log(`Found ${pages.length} pages from Wikibooks`);
        
        // Filter to likely books
        const bookPages = pages.filter(page => isLikelyBook(page.title));
        console.log(`Filtered to ${bookPages.length} likely books\n`);
        
        if (bookPages.length === 0) {
            console.log('No books found to process.');
            return;
        }
        
        // If limit specified, only process that many; otherwise process all
        const pagesToProcess = limit === 0 ? bookPages : bookPages.slice(0, limit);
        
        console.log(`Processing ${pagesToProcess.length} wikibooks...\n`);
        let inserted = 0;
        let skipped = 0;
        let errors = 0;
        let linkedToFaculty = 0;
        
        // Process in batches to avoid overwhelming the API
        const batchSize = 5; // Smaller batches for API rate limiting
        for (let i = 0; i < pagesToProcess.length; i += batchSize) {
            const batch = pagesToProcess.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(pagesToProcess.length / batchSize);
            console.log(`📦 Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, pagesToProcess.length)} of ${pagesToProcess.length})...`);
            
            for (const page of batch) {
                try {
                    // Fetch detailed information
                    const details = await fetchWikibookDetails(page.title);
                    
                    if (!details) {
                        console.log(`  ⚠ Skipping "${page.title}": Could not fetch details`);
                        skipped++;
                        continue;
                    }
                    
                    // Determine classification early to show in output
                    const deweyDecimal = getDeweyDecimal(page.title, details.extract);
                    const deweyName = getDeweyName(deweyDecimal);
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    const result = await insertWikibook(page, details);
                    if (result) {
                        inserted++;
                        if (result.faculty_id) {
                            linkedToFaculty++;
                            console.log(`  ✓ "${page.title}" [${deweyDecimal} - ${deweyName}] (linked to faculty)`);
                        } else {
                            console.log(`  ✓ "${page.title}" [${deweyDecimal} - ${deweyName}]`);
                        }
                    } else {
                        skipped++;
                        console.log(`  - "${page.title}" [${deweyDecimal} - ${deweyName}] (already exists)`);
                    }
                } catch (error) {
                    console.error(`  ✗ Error processing "${page.title}":`, error.message);
                    errors++;
                }
                
                // Small delay between books
                await new Promise(resolve => setTimeout(resolve, 400));
            }
            
            // Delay between batches
            if (i + batchSize < pagesToProcess.length) {
                console.log('   Waiting before next batch...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log('='.repeat(60));
        console.log(`✅ Inserted: ${inserted}`);
        console.log(`👥 Linked to faculty: ${linkedToFaculty}`);
        console.log(`⏭️  Skipped: ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📖 Total processed: ${inserted + skipped + errors}`);
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('❌ Error fetching wikibooks:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    // Handle help flag
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('Usage: node populate-wikibooks.js [limit|all]');
        console.log('');
        console.log('Options:');
        console.log('  (no args)    Fetch all wikibooks');
        console.log('  all          Fetch all wikibooks');
        console.log('  0            Fetch all wikibooks');
        console.log('  <number>     Fetch specified number of wikibooks');
        console.log('');
        console.log('Examples:');
        console.log('  node populate-wikibooks.js        # Fetch all');
        console.log('  node populate-wikibooks.js all    # Fetch all');
        console.log('  node populate-wikibooks.js 100    # Fetch 100 books');
        process.exit(0);
    }
    
    // Get limit from command line
    // 0 or "all" = fetch all books
    // number = fetch that many
    // no argument = fetch all
    let limit = 0; // Default to all
    
    if (process.argv[2]) {
        const arg = process.argv[2].toLowerCase();
        if (arg === 'all' || arg === '0') {
            limit = 0;
        } else {
            limit = parseInt(arg);
            if (isNaN(limit) || limit < 0) {
                console.error('❌ Invalid limit. Use a number, "all", or 0 to fetch all books.');
                console.error('   Run with --help for usage information.');
                process.exit(1);
            }
        }
    }
    
    populateWikibooks(limit).catch(console.error);
}

module.exports = { populateWikibooks, insertWikibook };
