/**
 * Create books and faculty tables in Supabase
 * Uses the service role key to execute SQL
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Read the SQL schema
const sqlSchema = fs.readFileSync(path.join(__dirname, 'supabase-schema.sql'), 'utf8');

async function createTables() {
    console.log('Creating database tables...\n');
    
    // Split SQL into statements
    const statements = sqlSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;
        
        try {
            // Use RPC to execute SQL (if available) or use direct query
            // Note: Supabase REST API doesn't support arbitrary SQL
            // We'll need to use the Management API or run via SQL Editor
            
            // For now, let's try using the PostgREST API to check if tables exist
            if (statement.includes('CREATE TABLE')) {
                const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
                if (tableMatch) {
                    const tableName = tableMatch[1];
                    console.log(`[${i + 1}/${statements.length}] Creating table: ${tableName}`);
                    
                    // Check if table exists
                    const { error: checkError } = await supabase
                        .from(tableName)
                        .select('*')
                        .limit(1);
                    
                    if (checkError && checkError.code === 'PGRST116') {
                        console.log(`⚠️  Table ${tableName} does not exist.`);
                        console.log(`   Please run the SQL schema manually in Supabase SQL Editor:`);
                        console.log(`   1. Go to: https://app.supabase.com/project/xougqdomkoisrxdnagcj/sql`);
                        console.log(`   2. Copy contents of supabase-schema.sql`);
                        console.log(`   3. Paste and run\n`);
                    } else if (!checkError) {
                        console.log(`✅ Table ${tableName} already exists\n`);
                    }
                }
            }
        } catch (error) {
            // Expected - we can't execute DDL via REST API
        }
    }
    
    console.log('\n⚠️  Note: Supabase REST API cannot execute DDL statements.');
    console.log('Please run the schema manually:\n');
    console.log('1. Open: https://app.supabase.com/project/xougqdomkoisrxdnagcj/sql');
    console.log('2. Copy the contents of supabase-schema.sql');
    console.log('3. Paste and click "Run"\n');
}

createTables().catch(console.error);
