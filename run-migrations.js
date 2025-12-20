/**
 * Run database migrations for Bibliotech
 * 
 * This script attempts to run migrations using available methods:
 * 1. Supabase CLI (if linked)
 * 2. Direct PostgreSQL connection (if password available)
 * 3. Provides SQL for manual execution
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const migrations = [
    'supabase/migrations/20251219230000_add_book_source_fields.sql',
    'supabase/migrations/20251219230001_add_book_uri_unified.sql'
];

/**
 * Try to run migration using Supabase CLI
 */
async function runWithCLI(migrationFile) {
    try {
        console.log(`\n📦 Attempting to run ${migrationFile} via Supabase CLI...\n`);
        
        // Check if supabase CLI is available
        try {
            execSync('which supabase', { stdio: 'ignore' });
        } catch {
            console.log('⚠️  Supabase CLI not found. Install it with: npm install -g supabase\n');
            return false;
        }
        
        // Try to execute via CLI
        // Note: This requires the project to be linked
        const sql = fs.readFileSync(migrationFile, 'utf8');
        const tempFile = path.join(__dirname, '.temp-migration.sql');
        fs.writeFileSync(tempFile, sql);
        
        try {
            // Use supabase db execute if available
            execSync(`supabase db execute --file ${tempFile}`, {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            fs.unlinkSync(tempFile);
            return true;
        } catch (error) {
            fs.unlinkSync(tempFile);
            if (error.message.includes('not linked')) {
                console.log('⚠️  Project not linked. Run: supabase link --project-ref YOUR_PROJECT_REF\n');
            }
            return false;
        }
    } catch (error) {
        console.error('CLI execution failed:', error.message);
        return false;
    }
}

/**
 * Display SQL for manual execution
 */
function showSQLForManualExecution(migrationFile) {
    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log('\n' + '='.repeat(80));
    console.log(`SQL for: ${migrationFile}`);
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\n📋 Copy the SQL above and run it in Supabase SQL Editor:\n');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"\n');
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Running Bibliotech Database Migrations\n');
    console.log('Migrations to run:');
    migrations.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
    
    const method = process.argv[2] || 'auto';
    
    if (method === 'show' || method === 'manual') {
        // Just show SQL for manual execution
        migrations.forEach(m => {
            if (fs.existsSync(m)) {
                showSQLForManualExecution(m);
            } else {
                console.error(`❌ Migration file not found: ${m}`);
            }
        });
        return;
    }
    
    // Try to run migrations
    let allSuccess = true;
    
    for (const migration of migrations) {
        if (!fs.existsSync(migration)) {
            console.error(`❌ Migration file not found: ${migration}`);
            allSuccess = false;
            continue;
        }
        
        console.log(`\n📄 Processing: ${migration}`);
        
        // Try CLI first
        const cliSuccess = await runWithCLI(migration);
        
        if (!cliSuccess) {
            console.log('⚠️  Could not execute automatically.');
            showSQLForManualExecution(migration);
            allSuccess = false;
        } else {
            console.log(`✅ Successfully executed: ${migration}`);
        }
    }
    
    if (allSuccess) {
        console.log('\n✅ All migrations completed successfully!\n');
    } else {
        console.log('\n⚠️  Some migrations need to be run manually (see SQL above)\n');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runWithCLI, showSQLForManualExecution };
