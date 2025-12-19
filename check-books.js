/**
 * Check if books are populated in Supabase
 * 
 * Usage: node check-books.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_project_url') {
    console.error('❌ Error: SUPABASE_URL not configured in .env file');
    console.log('\nPlease update .env with your Supabase credentials.');
    process.exit(1);
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your_supabase_anon_key') {
    console.error('❌ Error: SUPABASE_ANON_KEY not configured in .env file');
    console.log('\nPlease update .env with your Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkBooks() {
    console.log('Checking books in Supabase...\n');
    
    try {
        // Check total count
        const { count, error: countError } = await supabase
            .from('books')
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
            throw countError;
        }
        
        console.log(`📚 Total books in database: ${count || 0}\n`);
        
        if (count === 0) {
            console.log('⚠️  No books found in the database.');
            console.log('\nTo populate books, run:');
            console.log('  1. Make sure .env has SUPABASE_SERVICE_ROLE_KEY');
            console.log('  2. Run: npm run populate\n');
            return;
        }
        
        // Check books by category
        const categories = ['000', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
        console.log('Books by category:');
        console.log('─'.repeat(50));
        
        for (const category of categories) {
            const categoryStart = category;
            const categoryEnd = (parseInt(category) + 99).toString().padStart(3, '0');
            
            const { count: catCount, error: catError } = await supabase
                .from('books')
                .select('*', { count: 'exact', head: true })
                .gte('dewey_decimal', categoryStart)
                .lt('dewey_decimal', categoryEnd);
            
            if (!catError) {
                const categoryName = getCategoryName(category);
                console.log(`${category}: ${catCount || 0} books - ${categoryName}`);
            }
        }
        
        console.log('\n✅ Books are populated!');
        
    } catch (error) {
        console.error('❌ Error checking books:', error.message);
        if (error.message.includes('relation "books" does not exist')) {
            console.log('\n⚠️  The books table does not exist.');
            console.log('Please run the database schema first:');
            console.log('  1. Open Supabase SQL Editor');
            console.log('  2. Run the contents of supabase-schema.sql\n');
        }
    }
}

function getCategoryName(code) {
    const names = {
        '000': 'Computer Science',
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
    return names[code] || 'Uncategorized';
}

checkBooks();
