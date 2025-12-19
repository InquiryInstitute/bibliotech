/**
 * Execute SQL via Supabase Management API
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Extract project ref
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
    console.error('Could not extract project ref from SUPABASE_URL');
    process.exit(1);
}

/**
 * Execute SQL via Supabase Management API
 */
async function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        // Supabase Management API endpoint for executing SQL
        // Note: This requires the Management API which may not be available
        // Alternative: Use Supabase CLI or direct PostgreSQL connection
        
        const options = {
            hostname: `${projectRef}.supabase.co`,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'return=minimal'
            }
        };
        
        const postData = JSON.stringify({ query: sql });
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    // Try alternative: Use psql via exec
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Alternative: Use Supabase CLI to execute SQL
 */
async function executeViaCLI(sql) {
    const { execSync } = require('child_process');
    
    // Write SQL to temp file
    const tempFile = path.join(__dirname, '.temp-sql.sql');
    fs.writeFileSync(tempFile, sql);
    
    try {
        // Try using supabase db execute (if available)
        // Or use psql directly if connection string is available
        console.log('Attempting to execute via Supabase CLI...\n');
        
        // Check if we can use psql
        try {
            // Get database password from environment or use service role key
            // Note: Service role key is NOT the database password
            // We need to use the Supabase CLI's linked project or get the password
            
            // For now, let's try using the Supabase CLI's db commands
            // But we need the project linked first
            
            console.log('⚠️  Direct SQL execution requires database password or linked Supabase project.');
            console.log('Please run the SQL manually in Supabase SQL Editor, or:');
            console.log('1. Link project: supabase link --project-ref ' + projectRef);
            console.log('2. Then use: supabase db push (with migration files)\n');
            
            return false;
        } catch (err) {
            console.error('CLI execution failed:', err.message);
            return false;
        }
    } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

async function main() {
    const sqlFile = process.argv[2] || 'create-marginalia-table.sql';
    const sqlPath = path.join(__dirname, sqlFile);
    
    if (!fs.existsSync(sqlPath)) {
        console.error(`SQL file not found: ${sqlPath}`);
        process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Executing SQL from ${sqlFile}...\n`);
    
    // Try API first
    try {
        await executeSQL(sql);
        console.log('✅ SQL executed successfully via API\n');
        return;
    } catch (apiError) {
        console.log('API method failed, trying CLI...\n');
    }
    
    // Try CLI
    const cliSuccess = await executeViaCLI(sql);
    
    if (!cliSuccess) {
        console.log('⚠️  Could not execute SQL automatically.');
        console.log('Please run the SQL manually in Supabase SQL Editor:\n');
        console.log('='.repeat(80));
        console.log(sql);
        console.log('='.repeat(80));
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeSQL, executeViaCLI };
