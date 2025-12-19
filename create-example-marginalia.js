/**
 * Create an example marginalia for demonstration
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
    
    // Get a book (preferably one with a title)
    const { data: books, error: booksError } = await supabase
        .from('books')
        .select('id, title, author, gutenberg_id')
        .not('title', 'eq', 'Untitled')
        .not('author', 'eq', 'Unknown')
        .limit(1);
    
    if (booksError || !books || books.length === 0) {
        console.error('Error fetching books:', booksError);
        return;
    }
    
    const book = books[0];
    console.log(`Selected book: "${book.title}" by ${book.author} (ID: ${book.id})\n`);
    
    // Check if faculty table exists and get/create a test faculty
    let facultyId = 'test-faculty-1';
    
    // Try to get or create a test faculty
    const { data: existingFaculty } = await supabase
        .from('faculty')
        .select('id')
        .eq('id', facultyId)
        .limit(1);
    
    if (!existingFaculty || existingFaculty.length === 0) {
        // Try to insert a test faculty (might fail if table doesn't allow inserts)
        const { error: insertError } = await supabase
            .from('faculty')
            .insert({ 
                id: facultyId,
                name: 'Dr. Test Scholar',
                email: 'test@inquiry.institute'
            });
        
        if (insertError) {
            console.log('Note: Could not create test faculty. Using existing faculty or default ID.\n');
            // Try to get any faculty
            const { data: anyFaculty } = await supabase
                .from('faculty')
                .select('id')
                .limit(1);
            
            if (anyFaculty && anyFaculty.length > 0) {
                facultyId = anyFaculty[0].id;
            }
        }
    }
    
    console.log(`Using faculty ID: ${facultyId}\n`);
    
    // Create example marginalia
    const marginalia = {
        book_id: book.id,
        faculty_id: facultyId,
        page_number: 42,
        location: 'Chapter 3, Page 42',
        quote: 'The unexamined life is not worth living.',
        comment: 'This profound statement by Socrates resonates deeply with our modern pursuit of knowledge. The act of examination—of questioning, reflecting, and seeking understanding—is what gives meaning to our existence. In the context of this work, it serves as a reminder that passive acceptance is antithetical to true learning.'
    };
    
    // Check if marginalia already exists for this book/faculty/page
    const { data: existing } = await supabase
        .from('marginalia')
        .select('id')
        .eq('book_id', book.id)
        .eq('faculty_id', facultyId)
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
            return;
        }
        console.log('✅ Marginalia updated successfully!\n');
    } else {
        const { data, error } = await supabase
            .from('marginalia')
            .insert(marginalia)
            .select();
        
        if (error) {
            console.error('Error creating marginalia:', error);
            return;
        }
        
        console.log('✅ Marginalia created successfully!\n');
    }
    
    console.log('Marginalia details:');
    console.log(`  Book: "${book.title}" by ${book.author}`);
    console.log(`  Page: ${marginalia.page_number}`);
    console.log(`  Quote: "${marginalia.quote}"`);
    console.log(`  Comment: ${marginalia.comment.substring(0, 100)}...`);
    console.log(`\nYou can now view this marginalia in the book reader!\n`);
}

createExampleMarginalia().catch(console.error);
