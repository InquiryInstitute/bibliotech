/**
 * Supabase initialization script
 * Loads Supabase and creates the client
 */

// Load Supabase from CDN and initialize
(async function() {
    try {
        // Use ES module import from CDN
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        
        // Get config
        const SUPABASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL) 
            ? CONFIG.SUPABASE_URL 
            : 'YOUR_SUPABASE_URL';
        const SUPABASE_ANON_KEY = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_ANON_KEY)
            ? CONFIG.SUPABASE_ANON_KEY
            : 'YOUR_SUPABASE_ANON_KEY';
        
        // Create and expose client
        window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Dispatch ready event
        window.dispatchEvent(new Event('supabaseReady'));
    } catch (error) {
        console.error('Failed to load Supabase:', error);
        window.supabaseClient = null;
    }
})();
