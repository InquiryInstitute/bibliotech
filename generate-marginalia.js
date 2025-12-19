/**
 * Generate marginalia algorithmically using AI faculty (LLMs)
 * 
 * This script processes books and generates marginalia by feeding pages
 * to faculty LLMs and asking for comments
 * 
 * Usage: node generate-marginalia.js [book-id] [options]
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

// AI Faculty configuration
// Each faculty member is an AI model with a specific role/persona
const AI_FACULTY = [
    {
        id: 'ai-literary-critic',
        name: 'AI Literary Critic',
        model: 'gpt-4', // or your preferred model
        prompt: `You are a literary critic analyzing this text. Provide insightful commentary on themes, style, and meaning. Keep comments concise (2-3 sentences) and scholarly.`
    },
    {
        id: 'ai-historian',
        name: 'AI Historian',
        model: 'gpt-4',
        prompt: `You are a historian examining this text. Comment on historical context, accuracy, and significance. Keep comments concise (2-3 sentences).`
    },
    {
        id: 'ai-philosopher',
        name: 'AI Philosopher',
        model: 'gpt-4',
        prompt: `You are a philosopher analyzing this text. Comment on philosophical themes, arguments, and implications. Keep comments concise (2-3 sentences).`
    }
];

/**
 * Call LLM API to generate marginalia
 * This is a placeholder - replace with your actual LLM API call
 */
async function callLLM(text, faculty) {
    // TODO: Replace with actual LLM API call (OpenAI, Anthropic, etc.)
    // For now, return a placeholder response
    
    const prompt = `${faculty.prompt}\n\nText to analyze:\n${text}\n\nProvide your commentary:`;
    
    // Example using OpenAI (you'll need to install openai package)
    // const OpenAI = require('openai');
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.chat.completions.create({
    //     model: faculty.model,
    //     messages: [{ role: 'user', content: prompt }],
    //     max_tokens: 150
    // });
    // return response.choices[0].message.content;
    
    // Placeholder response
    return `[AI Comment from ${faculty.name}]: This passage demonstrates interesting thematic elements that warrant further analysis.`;
}

/**
 * Generate marginalia for a book page
 */
async function generateMarginaliaForPage(bookId, pageContent, pageNumber, location) {
    const marginalia = [];
    
    // Split page content into chunks (e.g., paragraphs)
    const chunks = pageContent.split(/\n\n+/).filter(chunk => chunk.trim().length > 100);
    
    for (const chunk of chunks.slice(0, 3)) { // Limit to 3 comments per page
        // Randomly select an AI faculty member
        const faculty = AI_FACULTY[Math.floor(Math.random() * AI_FACULTY.length)];
        
        try {
            const comment = await callLLM(chunk, faculty);
            
            // Extract a quote (first sentence or first 100 chars)
            const quote = chunk.substring(0, 100).trim() + '...';
            
            marginalia.push({
                book_id: bookId,
                faculty_id: faculty.id,
                page_number: pageNumber,
                location: location || `Page ${pageNumber}`,
                quote: quote,
                comment: comment
            });
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error generating marginalia with ${faculty.name}:`, error.message);
        }
    }
    
    return marginalia;
}

/**
 * Generate marginalia for a book
 */
async function generateMarginaliaForBook(bookId, numPages = 5) {
    console.log(`Generating marginalia for book ${bookId}...`);
    
    // Get book info
    const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();
    
    if (bookError || !book) {
        console.error('Book not found:', bookError);
        return;
    }
    
    console.log(`Processing ${numPages} pages for "${book.title}"...`);
    
    // For now, generate marginalia for sample pages
    // In the future, this would fetch actual book content from Project Gutenberg
    const allMarginalia = [];
    
    for (let page = 1; page <= numPages; page++) {
        // Placeholder page content - in production, fetch from Project Gutenberg
        const pageContent = `This is page ${page} of "${book.title}" by ${book.author || 'Unknown'}. 
        
        The content would be fetched from Project Gutenberg's API or stored content. 
        For now, this is a placeholder to demonstrate the marginalia generation system.
        
        In a real implementation, you would:
        1. Fetch the book content from Project Gutenberg
        2. Split it into pages
        3. Feed each page (or paragraph) to the AI faculty
        4. Store the generated marginalia`;
        
        const location = `Page ${page}`;
        const pageMarginalia = await generateMarginaliaForPage(bookId, pageContent, page, location);
        allMarginalia.push(...pageMarginalia);
        
        console.log(`Generated ${pageMarginalia.length} comments for page ${page}`);
    }
    
    // Insert marginalia into database
    if (allMarginalia.length > 0) {
        const { data, error } = await supabase
            .from('marginalia')
            .insert(allMarginalia)
            .select();
        
        if (error) {
            console.error('Error inserting marginalia:', error);
        } else {
            console.log(`\n✅ Successfully generated ${allMarginalia.length} marginalia comments`);
            console.log(`   Inserted ${data.length} comments into database`);
        }
    }
}

/**
 * Main function
 */
async function main() {
    const bookId = process.argv[2];
    const numPages = parseInt(process.argv[3]) || 5;
    
    if (!bookId) {
        console.log('Usage: node generate-marginalia.js <book-id> [num-pages]');
        console.log('\nExample: node generate-marginalia.js <uuid> 10');
        process.exit(1);
    }
    
    await generateMarginaliaForBook(bookId, numPages);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { generateMarginaliaForBook, generateMarginaliaForPage, callLLM };
