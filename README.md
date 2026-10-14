# PromptStudio

A Cloudflare Pages app with a serverless `/api/generate` endpoint for a Kobo-friendly AI website generator.

This repository was updated to use OpenRouter as the upstream AI API and to be Cloudflare Pages-ready with secure secret handling.

Important changes and instructions

- API secret name: `OPENROUTER_API_KEY` (set this in Cloudflare Pages project > Settings > Environment variables & secrets)
- Optional model override secret: `OPENROUTER_MODEL` (set to the model name you prefer)

Cloudflare Pages settings

- Framework: static
- Build command: `npm install`
- Build output directory: `public`
- Environment secrets: add `OPENROUTER_API_KEY` (do NOT commit your key)

How the server-side secret is used

- The Pages Function at `functions/api/generate.js` reads `env.OPENROUTER_API_KEY` on the server and uses it to call OpenRouter.
- The key is never included in client-side code, responses, or committed files.

How to add the secret in Cloudflare Pages

1. Open your Pages project in the Cloudflare dashboard.
2. Go to Settings → Environment variables & secrets → Add variable.
3. Enter `OPENROUTER_API_KEY` as the name, paste your OpenRouter secret into the value field, and save.
4. (optional) Add `OPENROUTER_MODEL` if you want a specific model. If not set, the function uses a conservative default.

What changed in this repo

- functions/api/generate.js — Replaced the OpenAI direct call with OpenRouter calls, robust response parsing, timeout handling, rate-limit handling, and server-side child-content screening. The function returns JSON only.
- public/app.js — Client-side improvements: saved projects (localStorage), simple progress/ETA, cancellation, fullscreen preview, download, and robust error handling. No secrets in client code.
- public/index.html — Updated UI to expose saved projects, preview, download, cancel, and improved layout for Kobo compatibility.
- public/style.css — Minor styles for progress and project list; kept minimal animations.
- README.md — Updated deployment steps and secret name.

Testing the API locally

- Install Wrangler and run a local Pages development server (see package.json):

  npm install
  npx wrangler pages dev public --compatibility-date=2024-06-01

- Set your environment variable locally for testing (do NOT commit this):

  export OPENROUTER_API_KEY="your_openrouter_key"

- Then use curl to test:

  curl -X POST http://127.0.0.1:8787/api/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Create a lightweight landing page for a children's reading app"}'

Security notes

- Do NOT commit any API keys. The keys you pasted in the chat will not be saved to the repository.
- The content filter is a simple heuristic and is not infallible. It helps reduce explicit content but cannot guarantee full safety.

If you want, I can now:
- Walk you through adding the secret in Cloudflare Pages step-by-step with screenshots (if you allow me to guide you), or
- Deploy the Pages project and watch a first deploy (you'll need to add the secret in the dashboard first), or
- Run a live test (requires the secret added in Cloudflare and a successful deploy).
