/**
 * Script to run database migrations
 * 
 * Usage: node run-migration.js [migration-file]
 * 
 * This script reads a SQL migration file and executes it via Supabase REST API
 * Note: For complex migrations, you may need to run them directly in Supabase SQL Editor
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration(migrationFile) {
    const migrationPath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: ${migrationPath}`);
        process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Running migration: ${migrationFile}`);
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\n⚠️  Note: Supabase REST API does not support direct SQL execution.');
    console.log('Please run this SQL in the Supabase SQL Editor:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Paste the SQL above');
    console.log('5. Run the query\n');
    
    // Try to execute via RPC if we have a function, otherwise just show instructions
    // For now, we'll just provide instructions since Supabase doesn't expose raw SQL execution
    // via the REST API without a custom function
    
    console.log('Alternatively, you can use the Supabase CLI:');
    console.log(`  supabase db execute --file ${migrationFile}\n`);
}

if (require.main === module) {
    const migrationFile = process.argv[2] || 'supabase/migrations/add_book_source_fields.sql';
    runMigration(migrationFile).catch(console.error);
}

module.exports = { runMigration };
