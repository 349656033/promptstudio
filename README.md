# PromptStudio

A minimal Cloudflare Pages app with a serverless `/api/generate` endpoint for a Kobo-friendly AI website generator.

## Features

- Static landing page and prompt form
- POST `/api/generate` route using Cloudflare Pages Functions
- CORS-friendly handling for browser requests
- OpenAI-compatible API call with `OPENAI_API_KEY`

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open the local Pages URL shown in the terminal.

## Cloudflare deployment

1. Push this repo to GitHub.
2. In Cloudflare Pages, create a project from the repo.
3. Set the build command to:
   ```bash
   npm install
   ```
4. Set the output directory to:
   ```bash
   public
   ```
5. Add environment variable:
   - `OPENAI_API_KEY`
6. Deploy.

## API example

```bash
curl -X POST https://<your-pages-project>.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Build a simple landing page for a bookstore"}'
```
