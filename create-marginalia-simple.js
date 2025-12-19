/**
 * Create example marginalia (assumes table exists)
 * Run the marginalia table SQL from supabase-schema.sql first if needed
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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
    
    // Create example marginalia with multiple examples
    const marginaliaExamples = [
        {
            book_id: book.id,
            faculty_id: facultyMember.id,
            page_number: 42,
            location: 'Chapter 3, Page 42',
            quote: 'The unexamined life is not worth living.',
            comment: 'This profound statement by Socrates resonates deeply with our modern pursuit of knowledge. The act of examination—of questioning, reflecting, and seeking understanding—is what gives meaning to our existence.'
        },
        {
            book_id: book.id,
            faculty_id: facultyMember.id,
            page_number: 15,
            location: 'Chapter 1, Page 15',
            quote: 'Knowledge is power, but wisdom is understanding how to use it.',
            comment: 'A timeless observation that distinguishes between mere accumulation of facts and the deeper comprehension of their application. This speaks to the heart of our educational mission.'
        }
    ];
    
    // Check if marginalia already exists
    const { data: existing } = await supabase
        .from('marginalia')
        .select('id, book_id, page_number')
        .eq('book_id', book.id)
        .eq('faculty_id', facultyMember.id);
    
    let created = 0;
    let updated = 0;
    
    for (const marginalia of marginaliaExamples) {
        const existingItem = existing?.find(e => e.page_number === marginalia.page_number);
        
        if (existingItem) {
            const { error: updateError } = await supabase
                .from('marginalia')
                .update(marginalia)
                .eq('id', existingItem.id);
            
            if (updateError) {
                console.error(`Error updating marginalia for page ${marginalia.page_number}:`, updateError);
            } else {
                updated++;
            }
        } else {
            const { data, error } = await supabase
                .from('marginalia')
                .insert(marginalia)
                .select();
            
            if (error) {
                if (error.code === 'PGRST205') {
                    console.error('❌ Marginalia table does not exist!\n');
                    console.error('Please run this SQL in Supabase SQL Editor:\n');
                    console.error('See supabase-schema.sql lines 34-78\n');
                    return null;
                }
                console.error(`Error creating marginalia for page ${marginalia.page_number}:`, error);
            } else {
                created++;
            }
        }
    }
    
    if (created > 0 || updated > 0) {
        console.log(`✅ Created ${created} new marginalia, updated ${updated} existing\n`);
        return { book, facultyMember };
    }
    
    return null;
}

createExampleMarginalia()
    .then(result => {
        if (result) {
            console.log('✅ Example marginalia ready!\n');
            console.log(`Book: "${result.book.title}"`);
            console.log(`Faculty: ${result.facultyMember.name || result.facultyMember.id}\n`);
            process.exit(0);
        } else {
            process.exit(1);
        }
    })
    .catch(console.error);
