# Discussion Garden

Live captions, schedule prompts, a moderated audience feed, and a growing "garden" of ideas for the *We Create Our Futures* festival (garden live Oct 17 & 18, 2026).

## Docs
- Product: `prd-v0.2.md`
- Build plan + progress log: `dev-plan-v0.1.md`
- UI: `DESIGN_GUIDE.md`

## Secrets policy (public repo)
This repository is **public**. Treat every push as world-readable.

**Never commit:** `.env.local` or any filled env file, API keys (Deepgram, OpenAI), Supabase secret keys, tokens, real festival transcripts or audience submissions. Only `.env.example` (placeholder names) is committed.

If a secret is ever committed: rotate it immediately in the provider's dashboard.

## Local setup
```bash
npm install
copy .env.example .env.local
# fill .env.local with your own keys — never commit it
npm run dev
```
Open http://localhost:3000.

## Stack
Next.js (App Router) · Tailwind CSS v4 · Supabase · Vercel · Deepgram · OpenAI
