# AI Marginalia Generation

Bibliotech uses AI faculty (LLMs) to algorithmically generate marginalia comments on books.

## How It Works

1. **AI Faculty**: Each faculty member is an AI model with a specific persona:
   - **AI Literary Critic**: Analyzes themes, style, and literary meaning
   - **AI Historian**: Examines historical context and significance
   - **AI Philosopher**: Comments on philosophical themes and arguments

2. **Generation Process**:
   - Book pages are fed to AI faculty LLMs
   - Each AI provides commentary on the text
   - Comments are stored as marginalia with location and quote references

3. **Display**: Marginalia appear as handwritten-style notes overlayed on book pages in the pageflip reader view

## Setup

### Option 1: Using Supabase Edge Function (Recommended)

1. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy generate-marginalia
   ```

2. **Set Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
   - `OPENAI_API_KEY`: (or your LLM provider API key)

3. **Call from Frontend**:
   ```javascript
   await supabase.functions.invoke('generate-marginalia', {
     body: { book_id: 'uuid', num_pages: 5 }
   })
   ```

### Option 2: Using Node.js Script

1. **Install Dependencies** (if using OpenAI):
   ```bash
   npm install openai
   ```

2. **Configure API Key** in `.env`:
   ```
   OPENAI_API_KEY=your-api-key
   ```

3. **Run Generation**:
   ```bash
   npm run generate-marginalia <book-id> [num-pages]
   ```

## AI Faculty Configuration

Edit `generate-marginalia.js` or the Edge Function to customize:

- **Faculty personas**: Add more AI faculty with different specializations
- **Prompt engineering**: Customize prompts for better commentary
- **Model selection**: Choose different LLM models per faculty
- **Comment style**: Adjust length, tone, and format

## Integration with LLM Providers

### OpenAI

```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 150
});
```

### Anthropic (Claude)

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 150,
  messages: [{ role: 'user', content: prompt }]
});
```

### OpenRouter (Multiple Models)

```javascript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'openai/gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
});
```

## Future Enhancements

- [ ] Fetch actual book content from Project Gutenberg API
- [ ] Support for multiple LLM providers
- [ ] Batch processing for multiple books
- [ ] Caching to avoid regenerating for same content
- [ ] Fine-tuning models on specific book genres
- [ ] User preferences for AI faculty selection
- [ ] Quality scoring and filtering of generated comments
