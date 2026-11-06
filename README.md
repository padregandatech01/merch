# Merchandise — Loxada

## Current scope (2026-11-06)
- A visually distinct staff login at `/login`.
- Server-side Supabase email/password authentication.
- Server-enforced RBAC protecting `/admin`. Only the **dept_admin** role can enter.
- Logout action and session cookie refresh.
- **No signup, password recovery, customer portal or supplier workflows yet.**
- Site root redirects to `/login` (approved signed-in users are redirected to `/admin`).
- Admin page is a protected placeholder, not an operational dashboard.

## Permission model
A trusted operator must separately provision an Auth user and assign that user's UUID in `public.staff_roles` with role `dept_admin`. Never authorize using browser fields, email spelling, or editable user metadata. The DB table has row-level security: authenticated users may SELECT only their own role; they cannot INSERT/UPDATE/DELETE. The server rechecks the verified Auth user and role before rendering admin content. Registration and account provisioning are deliberately outside this phase.

## Run
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in your environment (use `.env.example`; never commit secrets). Run `npm install`, `npm run dev`, `npm run build`.

Source-only or deployment-ready checks do not prove real user login; no staff accounts were seeded or end-to-end sign-in tested.
