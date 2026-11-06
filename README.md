# Loxada — Merchandise

## Staff access
This application has a standalone login page at `/login` and an RBAC-protected page at `/admin`, with its own design. Signup is not available yet.

The username `admin` is a server-side alias resolved using `ADMIN_LOGIN_EMAIL`; normal email login also works. **The alias itself does not give anyone admin access.** The password is verified by Supabase Auth and the server checks the authenticated user's own `public.staff_roles` entry for `dept_admin` before displaying admin content. Role assignment cannot be performed by web users.

## Initial staff setup
Do not deploy public admin accounts with `admin` as the password. For a real account, a trusted operator can run `node scripts/provision-admin.mjs` from a private terminal with `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ADMIN_LOGIN_EMAIL` environment variables. It generates a strong temporary password and creates an **unconfirmed** Supabase Auth user with the staff role. Confirm email ownership using your Supabase Auth dashboard, then change the temporary password. This script is not a web endpoint and must never be executed with secrets in client-side code or CI logs.

Set `ADMIN_LOGIN_EMAIL` as a server-side environment variable on Vercel to enable the `admin` alias. Without it, the real email can be used directly.

## Running locally
Copy `.env.example` into `.env.local` and configure your own Supabase URL/publishable key. Use `npm install`, `npm run dev`, `npm run build`.

No real staff account is created by deploying repository code. Authentication, role checks, and UI must be tested using a separately provisioned staff account.
