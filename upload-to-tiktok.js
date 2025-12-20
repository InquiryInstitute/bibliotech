/**
 * Upload videos to TikTok using Puppeteer (headless browser automation)
 * 
 * Usage:
 *   node upload-to-tiktok.js <video-file> [options]
 * 
 * Options:
 *   --caption "Your caption here"
 *   --privacy PUBLIC|PRIVATE|FRIENDS
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// TikTok credentials from environment
const TIKTOK_EMAIL = process.env.TIKTOK_EMAIL;
const TIKTOK_PASSWORD = process.env.TIKTOK_PASSWORD;

if (!TIKTOK_EMAIL || !TIKTOK_PASSWORD) {
    console.error('Error: TIKTOK_EMAIL and TIKTOK_PASSWORD must be set in .env file');
    console.error('Add these to your .env file:');
    console.error('TIKTOK_EMAIL=your-email@example.com');
    console.error('TIKTOK_PASSWORD=your-password');
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const videoFile = args[0];

if (!videoFile) {
    console.error('Usage: node upload-to-tiktok.js <video-file> [--caption "text"] [--privacy PUBLIC|PRIVATE|FRIENDS]');
    process.exit(1);
}

if (!fs.existsSync(videoFile)) {
    console.error(`Error: Video file not found: ${videoFile}`);
    process.exit(1);
}

// Parse options
let caption = '';
let privacy = 'PUBLIC';

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--caption' && args[i + 1]) {
        caption = args[i + 1];
        i++;
    } else if (args[i] === '--privacy' && args[i + 1]) {
        privacy = args[i + 1].toUpperCase();
        if (!['PUBLIC', 'PRIVATE', 'FRIENDS'].includes(privacy)) {
            console.error('Error: Privacy must be PUBLIC, PRIVATE, or FRIENDS');
            process.exit(1);
        }
        i++;
    }
}

/**
 * Upload video to TikTok using Puppeteer
 */
async function uploadVideo() {
    let browser;
    
    try {
        console.log('Launching browser...\n');
        
        browser = await puppeteer.launch({
            headless: false, // Set to true for headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1920, height: 1080 }
        });
        
        const page = await browser.newPage();
        
        console.log('Navigating to TikTok...\n');
        await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });
        
        // Wait for login if needed
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('signup')) {
            console.log('Logging in to TikTok...\n');
            
            // Click "Use phone / email / username" if present
            try {
                await page.waitForSelector('a[href*="login"]', { timeout: 5000 });
                await page.click('a[href*="login"]');
                await page.waitForTimeout(1000);
            } catch (e) {
                // Already on login page
            }
            
            // Enter email
            await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
            await page.type('input[type="text"], input[type="email"]', TIKTOK_EMAIL);
            await page.waitForTimeout(500);
            
            // Enter password
            await page.waitForSelector('input[type="password"]', { timeout: 5000 });
            await page.type('input[type="password"]', TIKTOK_PASSWORD);
            await page.waitForTimeout(500);
            
            // Click login button
            const loginButton = await page.$('button[type="submit"], button:has-text("Log in")');
            if (loginButton) {
                await loginButton.click();
            }
            
            // Wait for navigation after login
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            console.log('✅ Logged in successfully\n');
        }
        
        // Navigate to upload page if not already there
        if (!page.url().includes('upload')) {
            console.log('Navigating to upload page...\n');
            await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });
        }
        
        // Wait for file input
        console.log('Waiting for upload interface...\n');
        await page.waitForSelector('input[type="file"]', { timeout: 10000 });
        
        // Upload video file
        const videoPath = path.resolve(videoFile);
        console.log(`Uploading video: ${videoPath}\n`);
        
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(videoPath);
        
        console.log('Video file selected, waiting for processing...\n');
        
        // Wait for video to be processed (TikTok processes the video)
        await page.waitForTimeout(5000);
        
        // Enter caption if provided
        if (caption) {
            console.log(`Adding caption: ${caption}\n`);
            const captionSelector = 'div[contenteditable="true"], textarea[placeholder*="caption"], textarea[placeholder*="description"]';
            await page.waitForSelector(captionSelector, { timeout: 10000 });
            await page.type(captionSelector, caption);
            await page.waitForTimeout(1000);
        }
        
        // Set privacy if needed
        if (privacy !== 'PUBLIC') {
            console.log(`Setting privacy to: ${privacy}\n`);
            // Look for privacy dropdown/button
            try {
                const privacyButton = await page.$('button:has-text("Who can view"), button:has-text("Privacy")');
                if (privacyButton) {
                    await privacyButton.click();
                    await page.waitForTimeout(1000);
                    
                    // Select privacy option
                    const privacyOption = await page.$(`button:has-text("${privacy}"), div:has-text("${privacy}")`);
                    if (privacyOption) {
                        await privacyOption.click();
                        await page.waitForTimeout(1000);
                    }
                }
            } catch (e) {
                console.log('⚠️  Could not set privacy setting automatically');
            }
        }
        
        // Click publish button
        console.log('Publishing video...\n');
        const publishButton = await page.$('button:has-text("Post"), button:has-text("Publish"), button[type="submit"]');
        
        if (publishButton) {
            await publishButton.click();
            console.log('✅ Video published successfully!\n');
            
            // Wait a bit to see if there's a success message
            await page.waitForTimeout(3000);
            
            console.log('Video upload complete!');
        } else {
            console.log('⚠️  Could not find publish button. Please publish manually.');
            console.log('Browser will stay open for 60 seconds...\n');
            await page.waitForTimeout(60000);
        }
        
    } catch (error) {
        console.error('❌ Error uploading video:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run upload
uploadVideo().catch(console.error);
