/**
 * Update cover URLs for existing books in the database
 * 
 * Usage: node update-covers.js [limit]
 * 
 * This script updates books that don't have cover_url set
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

/**
 * Get cover image URL from Project Gutenberg
 */
function getGutenbergCoverUrl(gutenbergId) {
    // Try multiple possible cover image paths
    const urls = [
        `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.cover.medium.jpg`,
        `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.cover.small.jpg`,
        `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-h/images/cover.jpg`,
        `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}/images/cover.jpg`
    ];
    return urls[0]; // Return primary URL
}

/**
 * Check if URL exists
 */
function checkUrlExists(url) {
    return new Promise((resolve) => {
        const req = https.get(url, { timeout: 5000 }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

/**
 * Update covers for books missing cover URLs
 */
async function updateCovers(limit = 100) {
    console.log('Fetching books without cover URLs...\n');
    
    // Get books without cover URLs
    const { data: books, error } = await supabase
        .from('books')
        .select('id, gutenberg_id, title, cover_url')
        .or('cover_url.is.null,cover_url.eq.')
        .limit(limit);
    
    if (error) {
        console.error('Error fetching books:', error);
        return;
    }
    
    if (!books || books.length === 0) {
        console.log('✅ All books already have cover URLs!');
        return;
    }
    
    console.log(`Found ${books.length} books without cover URLs\n`);
    console.log('Updating cover URLs...\n');
    
    let updated = 0;
    let failed = 0;
    
    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const coverUrl = getGutenbergCoverUrl(book.gutenberg_id);
        
        // Update directly without checking (faster)
        // In production, you might want to verify the URL exists first
        const { error: updateError } = await supabase
            .from('books')
            .update({ cover_url: coverUrl })
            .eq('id', book.id);
        
        if (updateError) {
            console.error(`Failed to update ${book.gutenberg_id}: ${updateError.message}`);
            failed++;
        } else {
            updated++;
            if ((i + 1) % 10 === 0) {
                console.log(`Updated ${i + 1}/${books.length} books...`);
            }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n✅ Updated ${updated} books`);
    if (failed > 0) {
        console.log(`⚠️  Failed to update ${failed} books`);
    }
}

// Run if called directly
if (require.main === module) {
    const limit = parseInt(process.argv[2]) || 100;
    updateCovers(limit).catch(console.error);
}

module.exports = { updateCovers, getGutenbergCoverUrl };
