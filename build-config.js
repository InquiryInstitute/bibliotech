/**
 * Build script to generate config.js from .env
 * Run this after updating .env file
 * 
 * Usage: node build-config.js
 * Or: npm run build-config
 */

const fs = require('fs');
const path = require('path');

// Load .env
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const anonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || anonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env');
    console.warn('Make sure .env file exists and contains your Supabase credentials');
}

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

console.log('✅ Generated config.js from .env');
console.log(`   SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   SUPABASE_ANON_KEY: ${anonKey.substring(0, 20)}...`);
