/**
 * Setup database using Supabase REST API with SQL execution function
 * 
 * This script creates a temporary function in Supabase to execute SQL,
 * then uses it to run the schema, then removes the function.
 * 
 * Usage: node setup-database-rest.js
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
 * Make HTTP request to Supabase
 */
function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, data });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Execute SQL using Supabase's query endpoint
 * Note: This requires the SQL to be executed via PostgREST or a custom function
 */
async function executeSQLViaRPC(sql) {
    // First, we need to create a function that can execute SQL
    // This is a workaround since Supabase REST API doesn't directly execute SQL
    
    // Split SQL into statements and execute via pg_query
    // Actually, the best approach is to use Supabase's SQL execution via Management API
    // or create a stored procedure
    
    console.log('Note: Supabase REST API does not directly support arbitrary SQL execution.');
    console.log('Please use one of these methods:\n');
    console.log('1. Supabase CLI (Recommended):');
    console.log('   npm install -g supabase');
    console.log('   supabase login');
    console.log('   supabase link --project-ref your-project-ref');
    console.log('   ./setup-database-cli.sh\n');
    console.log('2. Run SQL directly in Supabase Dashboard:');
    console.log('   - Go to SQL Editor');
    console.log('   - Copy contents of supabase-schema.sql');
    console.log('   - Execute\n');
    console.log('3. Use Supabase Management API (if you have access)');
}

/**
 * Alternative: Use Supabase's database REST API
 * This requires the database to expose a function for SQL execution
 */
async function setupDatabase() {
    console.log('Setting up Bibliotech database via REST API...\n');
    
    // The Supabase REST API (PostgREST) doesn't support arbitrary SQL execution
    // We need to either:
    // 1. Use Supabase CLI
    // 2. Use the Management API
    // 3. Create tables via REST API (limited)
    // 4. Create a function that executes SQL
    
    // For now, provide instructions
    executeSQLViaRPC();
}

if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
