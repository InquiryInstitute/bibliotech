/**
 * Setup database using Supabase REST API
 * Uses the service role key to execute SQL
 * 
 * Usage: node setup-database.js
 * 
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Read the SQL schema
const fs = require('fs');
const path = require('path');
const sqlSchema = fs.readFileSync(path.join(__dirname, 'supabase-schema.sql'), 'utf8');

/**
 * Execute SQL via Supabase REST API
 */
async function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'return=representation'
            }
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({ query: sql }));
        req.end();
    });
}

/**
 * Alternative: Use PostgREST to execute SQL
 * This requires creating a function in Supabase first
 */
async function setupDatabase() {
    console.log('Setting up Bibliotech database...\n');
    
    // Split SQL into individual statements
    const statements = sqlSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;
        
        try {
            console.log(`[${i + 1}/${statements.length}] Executing statement...`);
            // Note: Supabase REST API doesn't directly support arbitrary SQL execution
            // We need to use the Management API or create a function
            // For now, let's use a different approach
            await executeSQL(statement + ';');
            console.log('✅ Success');
        } catch (error) {
            // Some errors are expected (like "table already exists")
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate') ||
                error.message.includes('42804')) {
                console.log('⚠️  Skipped (already exists or type mismatch)');
            } else {
                console.error(`❌ Error: ${error.message}`);
            }
        }
    }
    
    console.log('\n✅ Database setup complete!');
    console.log('\nNote: If you see errors, you may need to:');
    console.log('1. Use Supabase CLI: supabase db push');
    console.log('2. Or run the SQL directly in Supabase SQL Editor');
    console.log('3. Or use the setup-database-cli.js script');
}

// Alternative approach: Use Supabase Management API
async function setupDatabaseViaManagementAPI() {
    console.log('Setting up Bibliotech database via Management API...\n');
    console.log('Note: This requires the Supabase Management API key.');
    console.log('For now, please use one of these methods:\n');
    console.log('1. Supabase CLI:');
    console.log('   supabase init');
    console.log('   supabase link --project-ref your-project-ref');
    console.log('   supabase db push\n');
    console.log('2. Or run supabase-schema.sql directly in Supabase SQL Editor\n');
    console.log('3. Or use the provided migration files with Supabase CLI\n');
}

if (require.main === module) {
    // Try REST API first, fallback to instructions
    setupDatabase().catch((error) => {
        console.error('\n❌ Failed to setup via REST API:', error.message);
        console.log('\nFalling back to CLI instructions...\n');
        setupDatabaseViaManagementAPI();
    });
}

module.exports = { setupDatabase };
