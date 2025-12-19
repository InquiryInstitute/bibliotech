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
    const lines = csvText.split('\n');
    const headers = lines[0].split('\t');
    const books = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split('\t');
        const book = {};
        headers.forEach((header, index) => {
            book[header] = values[index] || '';
        });
        if (book['Text#']) {
            books.push(book);
        }
    }
    
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
 * Insert book into Supabase
 */
async function insertBook(book) {
    const gutenbergId = parseInt(book['Text#']);
    if (!gutenbergId) return null;
    
    // Check if book already exists
    const { data: existing } = await supabase
        .from('books')
        .select('id')
        .eq('gutenberg_id', gutenbergId)
        .single();
    
    if (existing) {
        console.log(`Book ${gutenbergId} already exists, skipping...`);
        return null;
    }
    
    const bookData = {
        gutenberg_id: gutenbergId,
        title: book['Title'] || 'Untitled',
        author: book['Author'] || 'Unknown',
        dewey_decimal: getDeweyDecimal(book),
        language: book['Language'] || 'en',
        subject: book['Subject'] || '',
        publisher: 'Project Gutenberg',
        publication_date: book['Release Date'] || null,
        description: book['Note'] || ''
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
