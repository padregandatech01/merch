# Loxada — Merchandise

**Clean slate (6 November 2026).** This is the Merchandise application repository. It has a blank Next.js home page, with no registration, login, password reset, protected demo, supplier portals, or other active business features.

Existing Next.js, Tailwind CSS, TypeScript, Vercel setup and Supabase browser/server client helpers are retained for future implementation. The Supabase environment variable names stay unchanged. No Supabase database, Auth users, project settings, or Vercel configuration was changed by this source cleanup.

## Start locally

1. Copy `.env.example` to `.env.local` and set this application's own Supabase URL and publishable key (do not commit credentials).
2. Run `npm install` and `npm run dev`.
3. Build with `npm run build`.

**No sign-in or signup is available yet.** Registration/login will be designed and implemented separately later. Do not restore template authentication or infer supplier permissions from this placeholder.
