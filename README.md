# Discussion Garden

Live captions, schedule prompts, a live audience feed, and a growing "garden" of ideas for the *We Create Our Futures* festival (garden live Oct 17 & 18, 2026).

## Docs
- Product: `prd-v0.2.md`
- Build plan + progress log: `dev-plan-v0.1.md`
- UI: `DESIGN_GUIDE.md`

## Secrets policy (public repo)
This repository is **public**. Treat every push as world-readable.

**Never commit:** `.env.local` or any filled env file, API keys (Deepgram, OpenAI), Supabase secret keys, tokens, real festival transcripts or audience submissions. Only `.env.example` (placeholder names) is committed.

If a secret is ever committed: rotate it immediately in the provider's dashboard.

## Local setup
Needs Node 22+ and Docker Desktop (running) for the local Supabase.
```bash
npm install
copy .env.example .env.local
npm run db:start        # local Supabase; copy its API URL, Publishable key, Secret key into .env.local
npm run host:add -- host@example.com "a long password"   # local host login for /admin
npm run dev
```
Open http://localhost:3000 — `/admin` asks you to sign in.

Useful scripts:
- `npm test` — unit tests (pure helpers in `src/lib/`)
- `npm run db:check` — verifies database + realtime access rules (visitors vs non-hosts vs hosts)
- `npm run db:reset` — rebuild the local database from `supabase/migrations` + `supabase/seed.sql`
- `npm run db:push:hosted` — apply new migrations to the hosted project over HTTPS (needs `SUPABASE_ACCESS_TOKEN` and `npx supabase link`)
- Local Supabase Studio (database browser): http://127.0.0.1:54323

Troubleshooting:
- **Pages hang or 404 in dev** — stop `npm run dev`, delete the `.next` folder, start again (a full disk or a cloud-synced folder like OneDrive can corrupt the cache — keep the repo outside OneDrive).
- **Testing with a phone** — open `/captions` on the laptop via its LAN IP (e.g. `http://10.0.0.141:3000/captions`) so the QR points somewhere the phone can reach. A VPN or Windows Firewall can block this.

## Stack
Next.js (App Router) · Tailwind CSS v4 · Supabase · Vercel · Deepgram · OpenAI
