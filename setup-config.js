/**
 * Setup script to configure Bibliotech with Supabase credentials
 * Stores credentials in .env and generates config.js for frontend
 * 
 * Usage: node setup-config.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('Bibliotech Supabase Configuration Setup');
    console.log('========================================\n');
    console.log('This will configure bibliotech to use the same Supabase instance as Inquiry.Institute.\n');

    const supabaseUrl = await question('Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): ');
    const anonKey = await question('Enter your Supabase Anon Key: ');
    const serviceRoleKey = await question('Enter your Supabase Service Role Key (for populating books, optional): ');

    if (!supabaseUrl || !anonKey) {
        console.error('Error: URL and anon key are required.');
        rl.close();
        process.exit(1);
    }

    // Write to .env file
    const envContent = `# Supabase Configuration
# This uses the same Supabase instance as Inquiry.Institute
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${anonKey}
${serviceRoleKey ? `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}` : '# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here'}
`;

    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');

    // Generate config.js from .env for frontend
    // Load dotenv to read the .env we just created
    require('dotenv').config();
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    const configContent = `/**
 * Configuration file for Bibliotech
 * 
 * This file is auto-generated from .env
 * Do not edit manually - edit .env and run: npm run build-config
 * 
 * This uses the same Supabase instance as Inquiry.Institute
 */

// Supabase Configuration
const CONFIG = {
    SUPABASE_URL: '${supabaseUrl}',
    SUPABASE_ANON_KEY: '${anonKey}'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
`;

    const configPath = path.join(__dirname, 'config.js');
    fs.writeFileSync(configPath, configContent, 'utf8');

    console.log('\n✅ Configuration saved to .env');
    console.log('✅ Generated config.js for frontend');
    console.log('\nNext steps:');
    console.log('1. Run the SQL schema in Supabase: supabase-schema.sql');
    if (serviceRoleKey) {
        console.log('2. Populate books: npm run populate');
    } else {
        console.log('2. (Optional) Add service role key to .env and run: npm run populate');
    }
    console.log('3. Test locally: npm run dev');
    
    rl.close();
}

function generateConfig() {
    // Load .env
    require('dotenv').config();
    
    const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
    const anonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

    const configContent = `/**
 * Configuration file for Bibliotech
 * 
 * This file is auto-generated from .env
 * Do not edit manually - edit .env and run: npm run build-config
 * 
 * This uses the same Supabase instance as Inquiry.Institute
 */

// Supabase Configuration
const CONFIG = {
    SUPABASE_URL: '${supabaseUrl}',
    SUPABASE_ANON_KEY: '${anonKey}'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
`;

    const configPath = path.join(__dirname, 'config.js');
    fs.writeFileSync(configPath, configContent, 'utf8');
}

// If run directly, do setup. If required, export generateConfig
if (require.main === module) {
    setup().catch(console.error);
} else {
    module.exports = { generateConfig };
}
