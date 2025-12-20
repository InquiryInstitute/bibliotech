/**
 * Run migrations using Supabase CLI programmatically
 * This script uses the Supabase CLI to push migrations
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const migrations = [
    'supabase/migrations/20251219230000_add_book_source_fields.sql',
    'supabase/migrations/20251219230001_add_book_uri_unified.sql'
];

/**
 * Check if Supabase CLI is available
 */
function checkCLI() {
    try {
        execSync('which supabase', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Run migration via CLI with password prompt
 */
async function runMigrationWithCLI() {
    if (!checkCLI()) {
        console.error('❌ Supabase CLI not found. Install with: npm install -g supabase');
        return false;
    }
    
    console.log('🚀 Running migrations via Supabase CLI...\n');
    console.log('⚠️  This will require your database password.');
    console.log('   Get it from: https://supabase.com/dashboard/project/xougqdomkoisrxdnagcj/settings/database\n');
    
    // Try to push migrations
    try {
        console.log('Attempting to push migrations...\n');
        
        // Use spawn to handle password prompt interactively
        const child = spawn('supabase', ['db', 'push', '--linked', '--include-all', '--yes'], {
            stdio: 'inherit',
            cwd: __dirname,
            shell: true
        });
        
        return new Promise((resolve) => {
            child.on('close', (code) => {
                resolve(code === 0);
            });
            
            child.on('error', (err) => {
                console.error('Error:', err.message);
                resolve(false);
            });
        });
    } catch (error) {
        console.error('Failed to run migrations:', error.message);
        return false;
    }
}

/**
 * Alternative: Execute SQL statements directly via Supabase client
 * by creating the schema changes through INSERT/UPDATE operations
 */
async function runMigrationsViaClient() {
    console.log('\n📝 Migrations need to be run manually via SQL Editor.');
    console.log('The Supabase REST API does not support DDL (ALTER TABLE, etc.)\n');
    
    console.log('SQL to run:\n');
    migrations.forEach((migration, i) => {
        if (fs.existsSync(migration)) {
            const sql = fs.readFileSync(migration, 'utf8');
            console.log(`\n${'='.repeat(80)}`);
            console.log(`Migration ${i + 1}: ${migration}`);
            console.log('='.repeat(80));
            console.log(sql);
        }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('Please copy the SQL above and run it in Supabase SQL Editor');
    console.log('https://supabase.com/dashboard/project/xougqdomkoisrxdnagcj/sql/new\n');
}

/**
 * Main function
 */
async function main() {
    console.log('📦 Bibliotech Migration Runner\n');
    
    // Try CLI first
    const cliSuccess = await runMigrationWithCLI();
    
    if (!cliSuccess) {
        console.log('\n⚠️  CLI method failed. Showing SQL for manual execution...\n');
        await runMigrationsViaClient();
    } else {
        console.log('\n✅ Migrations completed successfully!\n');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runMigrationWithCLI, runMigrationsViaClient };
