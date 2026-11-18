# Supplier relationships — Merchandise

## Department admin navigation

Open **Suppliers** in the department navigation. It opens on **Invitations & Messages**, alongside **Applications** and **Activity**.

- **Invitations & Messages** handles email invitations, responses, and private conversations.
- **Applications** is for reviewing forms suppliers have submitted.
- **Activity** shows invitation follow-ups, review queues, and account access counts.
- **Account Access** is for sign-in, suspension, and password recovery.

## Workflow
1. Admin opens **Supplier Invitations & Messages** and chooses **Invite a supplier**, enters a real contact and supplier type, and writes a message of 40–3000 characters.
2. A Supabase Auth invitation initiates a provisional account; the message is saved as the first private conversation record. The temporary identity has no supplier application privileges.
3. Contact opens a verified invitation, sets a password, visits `/invitation`, exchanges messages with the department, and accepts or declines.
4. If accepted, the contact may retain the invited login email or request a different verified email. Once verified, `Finish account setup` marks the relationship completed; the *same* auth user ID and conversation history remain.
5. The permanent supplier panel at `/portal` shows the next application action, private Messages, and sign-in details. Suppliers submit or review their application at `/portal/application`; applications are reviewed separately under **Supplier Applications** (`/admin/onboarding`). Verification does **not** grant licensing, title, stock, or contracting rights.
6. Admin tracks invitations and messages under **Supplier Invitations & Messages** (`/admin/relations`); neither party can view other supplier conversations. Relational records and messages are append-only to the ordinary user API.

## Hosted Supabase Auth setup
Repository files are not automatically applied to hosted Auth. Configure the matching Supabase project before sending invitations.

1. In **Authentication → URL Configuration**, set **Site URL** to `https://merch-three-fawn.vercel.app` (no trailing slash). Vercel's production `APP_ORIGIN` must match.
2. Preserve existing redirect entries and ensure these production redirects are permitted:
   - `https://merch-three-fawn.vercel.app/set-password`
   - `https://merch-three-fawn.vercel.app/auth/confirm?next=/portal`
   - `https://merch-three-fawn.vercel.app/auth/confirm?next=/invitation`
3. In **Authentication → Emails → Invite user**, use the subject **Loxada Merch supplier invitation** and paste the complete contents of `supabase/templates/invite.html`.
4. Ensure custom SMTP is configured for invitations to recipients outside the Supabase organization. Leave click tracking off for auth emails.

The template uses `{{ .Data.invitation_message }}` for the admin's message. The button uses the production Site URL and `{{ .TokenHash }}` to reach the portal's server-side `/auth/confirm` route, which verifies the invite, creates the session, and redirects to `/set-password`. Do not replace the button with the default `{{ .ConfirmationURL }}` or share real tokens in chat or bug reports. Previously delivered emails do not change when hosted settings are saved.

The invitation form stores the message on-platform regardless of the email template state; subsequent discussion uses on-platform private messages, not email replies.

## Constraints and operations
- Staff roles are trusted separately; suppliers cannot grant themselves internal privileges.
- One relationship per account; supplier type is fixed by trusted server action.
- Suppliers get SELECT-only RLS access to their own relationship/message rows; writes go through server actions with object authorization.
- A declined or revoked invitation closes message posting, while retaining read-only history. Admin may reopen an invitation; no automatic re-email currently occurs.
- Open conversations update over Supabase Realtime, with reconnect, tab-focus catch-up and a manual Refresh button. The browser treats Realtime events only as signals to refresh. The server reloads the thread under the existing authorization rules.
- Accept, decline, revoke, reopen and account-completed transitions append private system notices atomically. The first ordinary supplier reply moves the invitation into discussion without a system notice. Previous decisions are not backfilled. The database also blocks replies if a conversation closes while a message is being sent.
- The migration file follows the exact applied Supabase schema migration version. Do not replay it or modify existing application/account records.
- Existing public authors in Manga & Light Novel can register directly and are not subject to invitation gatekeeping; author-application submission creates their completed relationship record.

## Troubleshoot invitations

- **Email could not be sent** is a delivery failure, not an existing account. Check Authentication logs and the SMTP provider. Resend's `onboarding@resend.dev` is test-only and accepts the Resend account's email. For other recipients, verify a sender domain and change the sender email in hosted Supabase SMTP settings, or use another production SMTP provider.
- **Email already has an account** is shown only when Auth confirms an account conflict. If a relationship already exists, open it instead of resending from the new invite form. This form does not resend existing invitations.
- **Email sent but setup incomplete** means Auth sent the email and a later database write failed. Check Vercel logs for `supplier_invite_failed` and the named step. If the relationship exists but its first message is missing, open it and post the message there. Do not delete an existing Auth user just to retry.
- The form keeps your draft after a failed attempt. Provider messages, contact details, and invite tokens are not included in the application logs or in its user-facing errors.

Run the error-mapping regression tests with Node.js 22.18+ or Node.js 24 using `node --test tests/supplier-invite.test.mjs`.

## Acceptance checklist
- Fully set-up suppliers see their role-specific overview, their own application and their private conversation when available. The first independent-author application opens the conversation. Customers do not see supplier tools and provisional suppliers remain in the invitation workspace.
- Open the same private thread as admin and supplier. Replies and decision notices appear without a manual reload. Reload both tabs to confirm the notices persist. Change connection state and return to the thread to check catch-up.
- Admin sends a real invitation with a 40+ character introduction; invited contact receives the customized email and access link.
- Invitee sets password, accesses only their invitation, exchanges messages, accepts/declines, and is not able to submit an application until account completion.
- Admin cannot read messages from another department. A supplier cannot access another relationship by changing its UUID.
- Existing email → Finish account setup; alternate email → confirm email change first → Finish. Confirm same account ID and message history in both cases.
- Supplier application submitted after completion appears under **Supplier Applications**, not **Account Access**, and does not auto-approve business activities.
- Account suspension prevents supplier API access; revoked/declined contacts cannot send new messages.
- Browser/phone screen tests confirm responsive layout, accessible form labels, clear error states, and navigation without unexpected document reloads.
