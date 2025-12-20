# Improving Dewey Decimal Classifications

This script uses GPT-OSS-120B:free (or other LLM APIs) to improve Dewey Decimal classifications for Wikibooks.

## Setup

### Option 1: OpenRouter (Free Models)

1. Get a free API key from https://openrouter.ai
2. Add to `.env`:
   ```
   GPT_OSS_API_URL=https://api.openrouter.ai/api/v1/chat/completions
   GPT_OSS_API_KEY=your_openrouter_api_key
   GPT_OSS_MODEL=openrouter/cognitivecomputations/dolphin-mixtral-8x7b
   ```

### Option 2: GPT-OSS-120B:free

If you have access to GPT-OSS-120B:free via a specific endpoint:

1. Add to `.env`:
   ```
   GPT_OSS_API_URL=your_gpt_oss_endpoint
   GPT_OSS_API_KEY=your_api_key_if_needed
   GPT_OSS_MODEL=gpt-oss-120b:free
   ```

### Option 3: Local LLM

If running a local LLM server (e.g., Ollama, LM Studio):

1. Add to `.env`:
   ```
   GPT_OSS_API_URL=http://localhost:11434/api/chat
   GPT_OSS_MODEL=llama2
   ```

## Usage

### Test with a few books first

```bash
# Dry run with 5 books (no changes made)
npm run improve-dewey:dry-run -- --limit 5

# Actually update 5 books
node improve-dewey-classifications.js --limit 5
```

### Process all wikibooks

```bash
# Dry run first to see what would change
npm run improve-dewey:dry-run

# Actually update all books
npm run improve-dewey
```

### Custom API

```bash
node improve-dewey-classifications.js --api-url https://your-api-endpoint.com/v1/chat
```

## Example Output

```
📚 Improving Dewey Decimal Classifications for Wikibooks

Using API: https://api.openrouter.ai/api/v1/chat/completions
Model: openrouter/cognitivecomputations/dolphin-mixtral-8x7b

Found 150 wikibooks to evaluate

📦 Batch 1/30 (1-5 of 150)...
  ✓ "19th Century Literature/Frankenstein"
    000 → 800 (Computer Science → Literature)
  ✓ "Python Programming"
    000 → 000 (unchanged, correct)
  - "JavaScript Basics" [000 - Computer Science] (unchanged)

============================================================
📊 Summary
============================================================
✅ Updated: 45
➖ Unchanged: 100
❌ Errors: 5
📖 Total processed: 150
============================================================
```

## How It Works

1. **Fetches all wikibooks** from your database
2. **For each book**, sends title and description to the LLM
3. **LLM classifies** the book into a 3-digit Dewey Decimal code
4. **Updates database** if the classification is different
5. **Shows progress** and summary of changes

## Rate Limiting

The script includes delays:
- 500ms between books
- 2 seconds between batches

If you hit rate limits, you can increase these delays in the script.

## Troubleshooting

### "API Error" or connection issues
- Check your API URL and key
- Verify the model name is correct
- Try a different free model

### "Invalid Dewey code"
- The LLM might return text instead of just the number
- Check the API response format
- You may need to adjust the prompt or response parsing

### Slow processing
- This is normal - each book requires an API call
- For 150 books, expect 10-30 minutes depending on API speed
- Use `--limit` to test with fewer books first

## Cost

- **OpenRouter free models**: Free tier available
- **GPT-OSS-120B:free**: Free if you have access
- **Local LLM**: Free, but requires local setup

The script uses minimal tokens (max 10 tokens per request) to keep costs low.
