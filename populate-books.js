/**
 * Script to populate Supabase books table with Project Gutenberg books
 * 
 * Usage: node populate-books.js
 * 
 * Requires environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for admin access)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Project Gutenberg catalog URL
const GUTENBERG_CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';

// Dewey Decimal classification mapping (simplified)
// This is a basic mapping - in production, you'd want a more sophisticated classification
const DEWEY_MAP = {
    'Fiction': '800',
    'Literature': '800',
    'Poetry': '800',
    'Drama': '800',
    'History': '900',
    'Biography': '920',
    'Philosophy': '100',
    'Religion': '200',
    'Social Sciences': '300',
    'Language': '400',
    'Science': '500',
    'Technology': '600',
    'Arts': '700',
    'Geography': '910',
    'Travel': '910'
};

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
 * Parse CSV data
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        console.error('Catalog appears to be empty or invalid');
        return [];
    }
    
    // Try tab-separated first, then comma-separated
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const books = [];
    
    console.log(`Found ${lines.length - 1} lines in catalog`);
    console.log(`Headers: ${headers.slice(0, 5).join(', ')}...`);
    
    // Find the column name for Text# (might be 'Text#' or 'text#' or 'id')
    const textCol = headers.findIndex(h => 
        h.toLowerCase().includes('text') || 
        h.toLowerCase() === 'id' ||
        h === 'Text#'
    );
    
    if (textCol === -1) {
        console.error('Could not find Text# column. Available columns:', headers);
        return [];
    }
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle quoted fields that might contain delimiters
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
        
        const book = {};
        headers.forEach((header, index) => {
            book[header] = values[index] || '';
        });
        
        // Check if this book has a valid Text#/ID
        const textId = book[headers[textCol]] || book['Text#'] || book['text#'] || book['ID'] || book['id'];
        if (textId && !isNaN(parseInt(textId))) {
            book['Text#'] = textId;
            books.push(book);
        }
    }
    
    console.log(`Parsed ${books.length} books from catalog`);
    return books;
}

/**
 * Determine Dewey Decimal classification
 */
function getDeweyDecimal(book) {
    const subject = (book['Subject'] || '').toLowerCase();
    const title = (book['Title'] || '').toLowerCase();
    
    // Try to match subject
    for (const [keyword, dewey] of Object.entries(DEWEY_MAP)) {
        if (subject.includes(keyword.toLowerCase()) || title.includes(keyword.toLowerCase())) {
            return dewey;
        }
    }
    
    // Default to general literature
    return '800';
}

/**
 * Get cover image URL from Project Gutenberg
 */
function getGutenbergCoverUrl(gutenbergId) {
    // Project Gutenberg cover images are typically at:
    // https://www.gutenberg.org/cache/epub/{id}/pg{id}.cover.medium.jpg
    // or https://www.gutenberg.org/cache/epub/{id}/pg{id}.cover.small.jpg
    // or https://www.gutenberg.org/files/{id}/{id}-h/images/cover.jpg
    
    // Try multiple possible cover image paths
    const baseUrl = `https://www.gutenberg.org/cache/epub/${gutenbergId}`;
    return `${baseUrl}/pg${gutenbergId}.cover.medium.jpg`;
}

/**
 * Check if cover image exists (optional validation)
 */
async function checkCoverExists(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => {
            resolve(false);
        });
    });
}

/**
 * Insert book into Supabase
 */
async function insertBook(book) {
    const gutenbergId = parseInt(book['Text#']);
    if (!gutenbergId) return null;
    
    // Check if book already exists
    const { data: existing } = await supabase
        .from('books')
        .select('id, cover_url')
        .eq('gutenberg_id', gutenbergId)
        .single();
    
    if (existing) {
        // If book exists but doesn't have a cover, try to add it
        if (!existing.cover_url) {
            const coverUrl = getGutenbergCoverUrl(gutenbergId);
            // Optionally verify cover exists before updating
            // const coverExists = await checkCoverExists(coverUrl);
            // if (coverExists) {
                await supabase
                    .from('books')
                    .update({ cover_url: coverUrl })
                    .eq('id', existing.id);
            // }
        }
        return null;
    }
    
    // Get cover URL from Project Gutenberg
    const coverUrl = getGutenbergCoverUrl(gutenbergId);
    
    const bookData = {
        gutenberg_id: gutenbergId,
        title: book['Title'] || 'Untitled',
        author: book['Author'] || 'Unknown',
        dewey_decimal: getDeweyDecimal(book),
        language: book['Language'] || 'en',
        subject: book['Subject'] || '',
        publisher: 'Project Gutenberg',
        publication_date: book['Release Date'] || null,
        description: book['Note'] || '',
        cover_url: coverUrl
    };
    
    const { data, error } = await supabase
        .from('books')
        .insert([bookData])
        .select()
        .single();
    
    if (error) {
        console.error(`Error inserting book ${gutenbergId}:`, error.message);
        return null;
    }
    
    return data;
}

/**
 * Main function to populate books
 */
async function populateBooks() {
    console.log('Fetching Project Gutenberg catalog...');
    const catalogText = await fetchGutenbergCatalog();
    
    console.log('Parsing catalog...');
    const books = parseCSV(catalogText);
    console.log(`Found ${books.length} books in catalog`);
    
    console.log('Inserting books into Supabase...');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < books.length; i += batchSize) {
        const batch = books.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, books.length)} of ${books.length})...`);
        
        for (const book of batch) {
            try {
                const result = await insertBook(book);
                if (result) {
                    inserted++;
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error('Error processing book:', error.message);
                errors++;
            }
            
            // Small delay between books to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== Summary ===');
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total processed: ${inserted + skipped + errors}`);
}

// Run the script
if (require.main === module) {
    populateBooks().catch(console.error);
}

module.exports = { populateBooks, insertBook };
