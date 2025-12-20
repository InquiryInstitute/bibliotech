/**
 * Upload videos to TikTok using tiktok-uploader
 * 
 * Usage:
 *   node upload-to-tiktok.js <video-file> [options]
 * 
 * Options:
 *   --caption "Your caption here"
 *   --privacy PUBLIC|PRIVATE|FRIENDS
 *   --schedule "YYYY-MM-DD HH:MM:SS"
 */

require('dotenv').config();
const TikTokUploader = require('tiktok-uploader');
const fs = require('fs');
const path = require('path');

// TikTok credentials from environment
const TIKTOK_EMAIL = process.env.TIKTOK_EMAIL;
const TIKTOK_PASSWORD = process.env.TIKTOK_PASSWORD;
const TIKTOK_SESSION_ID = process.env.TIKTOK_SESSION_ID; // Optional: for persistent sessions

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
    console.error('Usage: node upload-to-tiktok.js <video-file> [--caption "text"] [--privacy PUBLIC|PRIVATE|FRIENDS] [--schedule "YYYY-MM-DD HH:MM:SS"]');
    process.exit(1);
}

if (!fs.existsSync(videoFile)) {
    console.error(`Error: Video file not found: ${videoFile}`);
    process.exit(1);
}

// Parse options
let caption = '';
let privacy = 'PUBLIC';
let schedule = null;

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
    } else if (args[i] === '--schedule' && args[i + 1]) {
        schedule = new Date(args[i + 1]);
        if (isNaN(schedule.getTime())) {
            console.error('Error: Invalid schedule date format. Use: YYYY-MM-DD HH:MM:SS');
            process.exit(1);
        }
        i++;
    }
}

/**
 * Upload video to TikTok
 */
async function uploadVideo() {
    try {
        console.log('Initializing TikTok uploader...\n');
        
        const uploader = new TikTokUploader({
            email: TIKTOK_EMAIL,
            password: TIKTOK_PASSWORD,
            sessionId: TIKTOK_SESSION_ID // Optional: for persistent sessions
        });
        
        console.log('Logging in to TikTok...\n');
        await uploader.login();
        
        console.log('Uploading video...\n');
        console.log(`File: ${videoFile}`);
        console.log(`Caption: ${caption || '(none)'}`);
        console.log(`Privacy: ${privacy}`);
        if (schedule) {
            console.log(`Schedule: ${schedule.toISOString()}`);
        }
        console.log('');
        
        const videoPath = path.resolve(videoFile);
        
        const result = await uploader.upload({
            video: videoPath,
            caption: caption,
            privacy: privacy,
            schedule: schedule
        });
        
        if (result.success) {
            console.log('✅ Video uploaded successfully!\n');
            console.log(`Video ID: ${result.videoId}`);
            console.log(`Video URL: ${result.videoUrl || 'N/A'}`);
            return result;
        } else {
            console.error('❌ Upload failed:', result.error || 'Unknown error');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error uploading video:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run upload
uploadVideo().catch(console.error);
