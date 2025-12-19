/**
 * Configuration file for Bibliotech
 * 
 * This file is auto-generated from .env
 * Do not edit manually - edit .env and run: npm run build-config
 * 
 * This uses the same Supabase instance as Inquiry.Institute
 */

// Supabase Configuration
const CONFIG = {
    SUPABASE_URL: 'your_supabase_project_url',
    SUPABASE_ANON_KEY: 'your_supabase_anon_key'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
