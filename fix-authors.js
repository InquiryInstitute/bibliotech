/**
 * Fix "Unknown" authors in existing books by re-parsing the Gutenberg catalog
 * 
 * Usage: node fix-authors.js [limit]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Project Gutenberg catalog URL
const GUTENBERG_CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';

/**
 * Fetch Project Gutenberg catalog
 */
async function fetchGutenbergCatalog() {
    return new Promise((resolve, reject) => {
        https.get(GUTENBERG_CATALOG_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', reject);
    });
}

/**
 * Parse CSV and create a lookup map by gutenberg_id
 */
function parseCatalogToMap(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return {};
    
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    
    const textCol = headers.findIndex(h => 
        h.toLowerCase().includes('text') || 
        h.toLowerCase() === 'id' ||
        h === 'Text#'
    );
    
    const authorCol = headers.findIndex(h => 
        h.toLowerCase() === 'authors' || 
        h.toLowerCase() === 'author' ||
        h.toLowerCase().includes('author')
    );
    
    const bookMap = {};
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if ((char === delimiter || char === '\n') && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        if (current) values.push(current.trim().replace(/^"|"$/g, ''));
        
        const textId = values[textCol];
        if (textId && !isNaN(parseInt(textId))) {
            let author = '';
            if (authorCol !== -1 && values[authorCol]) {
                author = values[authorCol].replace(/^"|"$/g, '').trim();
                // Take first author if multiple
                if (author.includes(';')) {
                    author = author.split(';')[0].trim();
                }
            }
            
            if (author) {
                bookMap[parseInt(textId)] = author;
            }
        }
    }
    
    return bookMap;
}

/**
 * Fix authors for books with "Unknown" author
 */
async function fixAuthors(limit = 100) {
    console.log('Fetching books with Unknown authors...\n');
    
    // Get books with Unknown or empty authors
    const { data: books, error } = await supabase
        .from('books')
        .select('id, gutenberg_id, title, author')
        .or('author.eq.Unknown,author.is.null,author.eq.')
        .limit(limit);
    
    if (error) {
        console.error('Error fetching books:', error);
        return;
    }
    
    if (!books || books.length === 0) {
        console.log('✅ No books with Unknown authors found!');
        return;
    }
    
    console.log(`Found ${books.length} books with Unknown authors\n`);
    console.log('Fetching Gutenberg catalog...\n');
    
    // Fetch and parse catalog
    const catalogText = await fetchGutenbergCatalog();
    const authorMap = parseCatalogToMap(catalogText);
    
    console.log(`Loaded ${Object.keys(authorMap).length} author entries from catalog\n`);
    console.log('Updating authors...\n');
    
    let updated = 0;
    let notFound = 0;
    
    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const author = authorMap[book.gutenberg_id];
        
        if (author) {
            const { error: updateError } = await supabase
                .from('books')
                .update({ author: author })
                .eq('id', book.id);
            
            if (updateError) {
                console.error(`Failed to update ${book.gutenberg_id}: ${updateError.message}`);
            } else {
                updated++;
                if ((i + 1) % 10 === 0) {
                    console.log(`Updated ${i + 1}/${books.length} books...`);
                }
            }
        } else {
            notFound++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n✅ Updated ${updated} books with author information`);
    if (notFound > 0) {
        console.log(`⚠️  Could not find author for ${notFound} books in catalog`);
    }
}

// Run if called directly
if (require.main === module) {
    const limit = parseInt(process.argv[2]) || 100;
    fixAuthors(limit).catch(console.error);
}

module.exports = { fixAuthors };
