/**
 * Run migrations via Supabase client
 * This creates temporary RPC functions to execute SQL
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Execute SQL by creating a temporary function
 * Note: This requires creating an RPC function first
 */
async function executeSQL(sql) {
    // Split SQL into statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    // First, create a function that can execute SQL
    // This requires the function to already exist or be created via Dashboard
    const createExecutorSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            result TEXT;
        BEGIN
            EXECUTE sql_text;
            RETURN 'Success';
        EXCEPTION WHEN OTHERS THEN
            RETURN 'Error: ' || SQLERRM;
        END;
        $$;
    `;
    
    // Try to create the executor function via RPC
    // But Supabase REST API doesn't support creating functions directly
    // We need to use the Management API or Dashboard
    
    console.log('⚠️  Supabase REST API does not support arbitrary SQL execution.');
    console.log('   Creating functions requires DDL permissions.\n');
    console.log('   Please run migrations via one of these methods:\n');
    console.log('   1. Supabase Dashboard SQL Editor (Recommended)');
    console.log('   2. Supabase CLI: supabase db push');
    console.log('   3. Direct PostgreSQL connection\n');
    
    return false;
}

/**
 * Alternative: Execute via Supabase Management API
 */
async function executeViaManagementAPI(sql) {
    const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
        console.error('Could not extract project ref');
        return false;
    }
    
    // Management API endpoint
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `${projectRef}.supabase.co`,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            }
        };
        
        const postData = JSON.stringify({ query: sql });
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ SQL executed successfully');
                    resolve(true);
                } else {
                    console.log(`⚠️  API returned ${res.statusCode}: ${data.substring(0, 200)}`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('Request error:', err.message);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

async function main() {
    const migrations = [
        'supabase/migrations/20251219230000_add_book_source_fields.sql',
        'supabase/migrations/20251219230001_add_book_uri_unified.sql'
    ];
    
    console.log('🚀 Running migrations via Supabase client...\n');
    
    // Try Management API first
    for (const migration of migrations) {
        if (!fs.existsSync(migration)) {
            console.error(`❌ Migration not found: ${migration}`);
            continue;
        }
        
        const sql = fs.readFileSync(migration, 'utf8');
        console.log(`\n📄 Migration: ${path.basename(migration)}`);
        console.log('='.repeat(80));
        
        const success = await executeViaManagementAPI(sql);
        
        if (!success) {
            // Fallback: show SQL for manual execution
            console.log('\nSQL for manual execution:');
            console.log(sql);
            console.log('\nPlease run this in Supabase Dashboard SQL Editor');
        }
    }
    
    // Also try the RPC approach
    await executeSQL('');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeSQL, executeViaManagementAPI };
