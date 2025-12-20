# TikTok Video Upload Guide

This project includes functionality to upload videos to TikTok using Puppeteer (headless browser automation).

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure TikTok credentials:**
   
   Add to your `.env` file:
   ```env
   TIKTOK_EMAIL=your-email@example.com
   TIKTOK_PASSWORD=your-password
   ```

## Usage

### Basic Upload

```bash
npm run upload-tiktok path/to/video.mp4
```

### With Caption

```bash
npm run upload-tiktok path/to/video.mp4 --caption "Your video caption here"
```

### With Privacy Settings

```bash
npm run upload-tiktok path/to/video.mp4 --privacy PRIVATE
```

Privacy options:
- `PUBLIC` (default) - Anyone can view
- `PRIVATE` - Only you can view
- `FRIENDS` - Only your friends can view

### Complete Example

```bash
npm run upload-tiktok ./videos/my-video.mp4 --caption "Check out this amazing book!" --privacy PUBLIC
```

## How It Works

The script uses Puppeteer to:
1. Launch a browser (visible by default for debugging)
2. Navigate to TikTok's upload page
3. Log in with your credentials
4. Upload the video file
5. Add caption and set privacy if specified
6. Publish the video

## Notes

- The browser runs in **non-headless mode** by default so you can see what's happening
- TikTok may require additional verification (CAPTCHA, 2FA, etc.) - you'll need to complete these manually
- Video processing on TikTok's side may take a few seconds
- Make sure your video meets TikTok's requirements (format, size, duration, etc.)

## Troubleshooting

### Login Issues
- If login fails, check your credentials in `.env`
- TikTok may require additional verification - complete it manually in the browser
- Some accounts may need 2FA - you'll need to enter the code when prompted

### Upload Issues
- Ensure the video file path is correct
- Check that the video format is supported by TikTok (MP4, MOV, etc.)
- Verify video file size and duration meet TikTok's limits

### Browser Issues
- If Puppeteer fails to launch, ensure Chrome/Chromium is installed
- On Linux, you may need additional dependencies: `sudo apt-get install -y chromium-browser`

## Security

⚠️ **Important:** Never commit your `.env` file with real credentials to version control. The `.env` file is already in `.gitignore`.

## Alternative: TikTok API

For production use, consider using TikTok's official Content API:
- https://developers.tiktok.com/doc/content-posting-api-getting-started/

This requires:
- TikTok Developer account
- App registration
- OAuth authentication
- More setup but more reliable for automation
