/**
 * Supabase initialization script
 * Loads Supabase and creates the client
 */

// Load Supabase from CDN and initialize
(async function() {
    try {
        // Wait for config to be available
        let retries = 0;
        while (typeof CONFIG === 'undefined' && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        // Use ES module import from CDN
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        
        // Get config
        const SUPABASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL && 
                              CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
                              CONFIG.SUPABASE_URL !== 'your_supabase_project_url') 
            ? CONFIG.SUPABASE_URL 
            : null;
        const SUPABASE_ANON_KEY = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_ANON_KEY &&
                                   CONFIG.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
                                   CONFIG.SUPABASE_ANON_KEY !== 'your_supabase_anon_key')
            ? CONFIG.SUPABASE_ANON_KEY
            : null;
        
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('Supabase credentials not configured. Please update config.js with your Supabase URL and anon key.');
            window.supabaseClient = null;
            window.dispatchEvent(new Event('supabaseReady'));
            return;
        }
        
        // Create and expose client
        window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        
        // Dispatch ready event
        window.dispatchEvent(new Event('supabaseReady'));
    } catch (error) {
        console.error('Failed to load Supabase:', error);
        window.supabaseClient = null;
        window.dispatchEvent(new Event('supabaseReady'));
    }
})();
