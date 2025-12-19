/**
 * Execute SQL directly via PostgreSQL connection
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Extract connection details from Supabase URL
// Format: https://[project-ref].supabase.co
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
    console.error('Could not extract project ref from SUPABASE_URL');
    process.exit(1);
}

// Supabase connection string format
// postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// Or direct: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

// Try to get database password from .env.db or use service role key as fallback
const fs = require('fs');
const path = require('path');
let DB_PASSWORD = SUPABASE_SERVICE_ROLE_KEY; // Fallback

try {
    const envDbPath = path.join(__dirname, '.env.db');
    if (fs.existsSync(envDbPath)) {
        const envDbContent = fs.readFileSync(envDbPath, 'utf8');
        const dbPasswordMatch = envDbContent.match(/DB_PASSWORD=(.+)/);
        if (dbPasswordMatch) {
            DB_PASSWORD = dbPasswordMatch[1].trim();
        }
    }
} catch (e) {
    // Use fallback
}

// Try pooler connection (port 6543) first, then direct (port 5432)
const connectionString = `postgresql://postgres.${projectRef}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function executeSQL(sql) {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('Connected to database\n');
        
        // Split SQL by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await client.query(statement);
                    console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
                } catch (err) {
                    // Ignore "already exists" errors
                    if (err.message.includes('already exists') || err.message.includes('does not exist')) {
                        console.log(`⚠️  Skipped (already exists/does not exist): ${statement.substring(0, 50)}...`);
                    } else {
                        console.error(`❌ Error: ${err.message}`);
                        console.error(`   Statement: ${statement.substring(0, 100)}...`);
                    }
                }
            }
        }
        
        await client.end();
        console.log('\n✅ SQL execution complete\n');
        return true;
    } catch (error) {
        console.error('Connection error:', error.message);
        
        // Try direct connection (port 5432) as fallback
        console.log('Trying direct connection...\n');
        const directConnectionString = `postgresql://postgres.${projectRef}:${SUPABASE_SERVICE_ROLE_KEY}@db.${projectRef}.supabase.co:5432/postgres`;
        
        const directClient = new Client({
            connectionString: directConnectionString,
            ssl: { rejectUnauthorized: false }
        });
        
        try {
            await directClient.connect();
            console.log('Connected via direct connection\n');
            
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await directClient.query(statement);
                        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
                    } catch (err) {
                        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
                            console.log(`⚠️  Skipped: ${statement.substring(0, 50)}...`);
                        } else {
                            console.error(`❌ Error: ${err.message}`);
                        }
                    }
                }
            }
            
            await directClient.end();
            console.log('\n✅ SQL execution complete\n');
            return true;
        } catch (directError) {
            console.error('Direct connection also failed:', directError.message);
            return false;
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
    
    const success = await executeSQL(sql);
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeSQL };
