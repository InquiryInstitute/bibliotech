/**
 * Execute migrations via Supabase client using RPC
 * This creates a temporary function to execute SQL, then runs the migrations
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
 * Execute SQL via Supabase RPC
 * Note: This requires creating a function first that can execute SQL
 */
async function executeSQL(sql) {
    // Split SQL into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    // First, create a function that can execute SQL (if it doesn't exist)
    const createExecutorFunction = `
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
    
    // Try to create the executor function via direct SQL execution
    // Since we can't execute arbitrary SQL directly, we'll use the REST API's RPC endpoint
    // But first, we need to create this function manually or use a different approach
    
    // Alternative: Execute each statement via the Supabase REST API
    // We'll need to use the Management API or create RPC functions for each statement type
    
    console.log('⚠️  Supabase REST API does not support arbitrary SQL execution.');
    console.log('Please use one of these methods:\n');
    console.log('1. Supabase Dashboard SQL Editor (Recommended)');
    console.log('2. Supabase CLI: supabase db push');
    console.log('3. Direct PostgreSQL connection\n');
    
    return false;
}

/**
 * Alternative: Use Supabase Management API
 */
async function executeViaManagementAPI(sql) {
    const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
        console.error('Could not extract project ref');
        return false;
    }
    
    // Management API endpoint (requires access token)
    // This typically requires Supabase CLI authentication
    console.log('Management API requires CLI authentication.');
    console.log('Please use: supabase db push\n');
    
    return false;
}

/**
 * Main function
 */
async function main() {
    const migrations = [
        'supabase/migrations/20251219230000_add_book_source_fields.sql',
        'supabase/migrations/20251219230001_add_book_uri_unified.sql'
    ];
    
    console.log('🚀 Attempting to run migrations via Supabase client...\n');
    
    // Try to execute via client (will show instructions)
    for (const migration of migrations) {
        if (!fs.existsSync(migration)) {
            console.error(`❌ Migration not found: ${migration}`);
            continue;
        }
        
        const sql = fs.readFileSync(migration, 'utf8');
        console.log(`\n📄 Migration: ${migration}`);
        console.log('='.repeat(80));
        
        await executeSQL(sql);
    }
    
    console.log('\n💡 Best approach: Use Supabase CLI or Dashboard SQL Editor\n');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeSQL };
