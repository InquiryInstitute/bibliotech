/**
 * Improve Dewey Decimal classifications for Wikibooks using GPT-OSS-120B:free
 * 
 * Usage: node improve-dewey-classifications.js [options]
 * 
 * Options:
 *   --limit N        Process only N books (for testing)
 *   --dry-run        Show what would be updated without making changes
 *   --api-url URL    Custom API URL for GPT-OSS-120B (default: from env)
 * 
 * Requires environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - GPT_OSS_API_URL (optional, can be set via --api-url)
 * - GPT_OSS_API_KEY (optional, if API requires authentication)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GPT-OSS-120B API configuration
// For GPT-OSS-120B:free, configure the endpoint in .env
// Common options:
// - OpenRouter: https://api.openrouter.ai/api/v1/chat/completions
// - Hugging Face: https://api-inference.huggingface.co/models/...
// - Local: http://localhost:11434/api/chat (Ollama)
// - Custom GPT-OSS endpoint: configure in .env
const GPT_OSS_API_URL = process.env.GPT_OSS_API_URL || 'https://api.openrouter.ai/api/v1/chat/completions';
const GPT_OSS_API_KEY = process.env.GPT_OSS_API_KEY || '';
// Model name - use 'gpt-oss-120b:free' if available, or another free model
const GPT_OSS_MODEL = process.env.GPT_OSS_MODEL || 'gpt-oss-120b:free';

// Parse command line arguments
const args = process.argv.slice(2);
let limit = null;
let dryRun = false;
let customApiUrl = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
        limit = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--dry-run') {
        dryRun = true;
    } else if (args[i] === '--api-url' && args[i + 1]) {
        customApiUrl = args[i + 1];
        i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log('Usage: node improve-dewey-classifications.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --limit N        Process only N books (for testing)');
        console.log('  --dry-run        Show what would be updated without making changes');
        console.log('  --api-url URL    Custom API URL for GPT-OSS-120B');
        console.log('  --help, -h       Show this help message');
        console.log('');
        console.log('Environment variables:');
        console.log('  GPT_OSS_API_URL  API endpoint (default: OpenRouter)');
        console.log('  GPT_OSS_API_KEY  API key if required');
        console.log('  GPT_OSS_MODEL   Model name (default: free model)');
        process.exit(0);
    }
}

const apiUrl = customApiUrl || GPT_OSS_API_URL;

/**
 * Call GPT-OSS-120B to classify a book
 */
async function classifyBookWithLLM(title, description) {
    const prompt = `Classify the following book into a Dewey Decimal Classification category.

Book Title: ${title}
Description: ${description || 'No description available'}

Return ONLY a 3-digit Dewey Decimal code (000-999) that best fits this book.
Do not include any explanation, just the 3-digit number.

Common categories:
- 000: Computer Science, Information & General Works
- 100: Philosophy & Psychology
- 200: Religion
- 300: Social Sciences
- 400: Language
- 500: Science
- 600: Technology
- 700: Arts & Recreation
- 800: Literature
- 900: History & Geography

Return the code:`;

    // Build request body - adapt based on API format
    // Most OpenAI-compatible APIs use this format
    let requestBody = {
        model: GPT_OSS_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a librarian expert in Dewey Decimal Classification. Return only the 3-digit code (000-999), nothing else.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.3,
        max_tokens: 10
    };

    // Adapt for different API formats
    if (apiUrl.includes('openrouter.ai')) {
        // OpenRouter format
        requestBody = {
            ...requestBody,
            provider: 'openai'
        };
    } else if (apiUrl.includes('huggingface.co')) {
        // Hugging Face format (different structure)
        requestBody = {
            inputs: prompt,
            parameters: {
                max_new_tokens: 10,
                temperature: 0.3
            }
        };
    } else if (apiUrl.includes('ollama') || apiUrl.includes('localhost')) {
        // Ollama format
        requestBody = {
            model: GPT_OSS_MODEL,
            messages: requestBody.messages,
            stream: false,
            options: {
                temperature: 0.3,
                num_predict: 10
            }
        };
    }

    return new Promise((resolve, reject) => {
        const url = new URL(apiUrl);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(GPT_OSS_API_KEY && { 'Authorization': `Bearer ${GPT_OSS_API_KEY}` })
            }
        };

        const client = url.protocol === 'https:' ? https : http;
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (json.error) {
                        reject(new Error(`API Error: ${json.error.message || JSON.stringify(json.error)}`));
                        return;
                    }
                    
                    // Handle different API response formats
                    let content = null;
                    
                    if (json.choices?.[0]?.message?.content) {
                        // OpenAI/OpenRouter format
                        content = json.choices[0].message.content.trim();
                    } else if (json[0]?.generated_text) {
                        // Hugging Face format
                        content = json[0].generated_text.trim();
                    } else if (json.message?.content) {
                        // Ollama format
                        content = json.message.content.trim();
                    } else if (json.content) {
                        // Generic format
                        content = json.content.trim();
                    }
                    
                    if (!content) {
                        console.error('API Response:', JSON.stringify(json, null, 2).substring(0, 500));
                        reject(new Error('No response content from API'));
                        return;
                    }
                    
                    // Extract 3-digit number
                    const match = content.match(/\b(\d{3})\b/);
                    if (match) {
                        const dewey = match[1];
                        // Validate it's a valid Dewey Decimal (000-999)
                        if (parseInt(dewey) >= 0 && parseInt(dewey) <= 999) {
                            resolve(dewey);
                        } else {
                            reject(new Error(`Invalid Dewey code: ${dewey}`));
                        }
                    } else {
                        reject(new Error(`Could not extract Dewey code from: "${content}"`));
                    }
                } catch (error) {
                    reject(new Error(`Parse error: ${error.message}. Response: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(requestBody));
        req.end();
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
    const mainCategory = dewey.substring(0, 1) + '00';
    return names[mainCategory] || 'Uncategorized';
}

/**
 * Main function to improve classifications
 */
async function improveClassifications() {
    console.log('📚 Improving Dewey Decimal Classifications for Wikibooks\n');
    console.log(`Using API: ${apiUrl}`);
    console.log(`Model: ${GPT_OSS_MODEL}`);
    if (dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    console.log('');

    try {
        // Fetch all wikibooks
        let query = supabase
            .from('books')
            .select('id, title, description, dewey_decimal, source')
            .eq('source', 'wikibooks')
            .order('title', { ascending: true });

        if (limit) {
            query = query.limit(limit);
        }

        const { data: books, error } = await query;

        if (error) {
            throw error;
        }

        if (!books || books.length === 0) {
            console.log('No wikibooks found in database.');
            return;
        }

        console.log(`Found ${books.length} wikibooks to evaluate\n`);

        let updated = 0;
        let unchanged = 0;
        let errors = 0;
        let changed = [];

        // Process in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < books.length; i += batchSize) {
            const batch = books.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(books.length / batchSize);

            console.log(`📦 Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, books.length)} of ${books.length})...`);

            for (const book of batch) {
                try {
                    const oldDewey = book.dewey_decimal || '000';
                    const oldName = getDeweyName(oldDewey);

                    // Classify with LLM
                    const newDewey = await classifyBookWithLLM(book.title, book.description || '');
                    const newName = getDeweyName(newDewey);

                    if (newDewey !== oldDewey) {
                        changed.push({
                            title: book.title,
                            old: `${oldDewey} - ${oldName}`,
                            new: `${newDewey} - ${newName}`
                        });

                        if (!dryRun) {
                            const { error: updateError } = await supabase
                                .from('books')
                                .update({ dewey_decimal: newDewey })
                                .eq('id', book.id);

                            if (updateError) {
                                throw updateError;
                            }
                        }

                        updated++;
                        console.log(`  ✓ "${book.title.substring(0, 50)}${book.title.length > 50 ? '...' : ''}"`);
                        console.log(`    ${oldDewey} → ${newDewey} (${oldName} → ${newName})`);
                    } else {
                        unchanged++;
                        console.log(`  - "${book.title.substring(0, 50)}${book.title.length > 50 ? '...' : ''}" [${oldDewey} - ${oldName}] (unchanged)`);
                    }
                } catch (error) {
                    errors++;
                    console.error(`  ✗ Error processing "${book.title}":`, error.message);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Delay between batches
            if (i + batchSize < books.length) {
                console.log('   Waiting before next batch...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updated}`);
        console.log(`➖ Unchanged: ${unchanged}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📖 Total processed: ${updated + unchanged + errors}`);
        console.log('='.repeat(60) + '\n');

        if (changed.length > 0) {
            console.log('📝 Classification Changes:\n');
            changed.slice(0, 20).forEach(change => {
                console.log(`  "${change.title}"`);
                console.log(`    ${change.old}`);
                console.log(`    → ${change.new}\n`);
            });
            if (changed.length > 20) {
                console.log(`  ... and ${changed.length - 20} more changes\n`);
            }
        }

        if (dryRun) {
            console.log('\n🔍 This was a dry run. No changes were made.');
            console.log('   Run without --dry-run to apply changes.\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    improveClassifications().catch(console.error);
}

module.exports = { improveClassifications, classifyBookWithLLM };
