# Supplier relationships — Merchandise

## Workflow
1. Admin chooses **Onboarding → Invite**, enters a real contact and supplier type, and writes a message of 40–3000 characters.
2. A Supabase Auth invitation initiates a provisional account; the message is saved as the first private conversation record. The temporary identity has no supplier application privileges.
3. Contact opens a verified invitation, sets a password, visits `/invitation`, exchanges messages with the department, and accepts or declines.
4. If accepted, the contact may retain the invited login email or request a different verified email. Once verified, `Finish account setup` marks the relationship completed; the *same* auth user ID and conversation history remain.
5. The permanent portal at `/portal` is used to submit business qualification details; applications at `/admin/onboarding` are reviewed separately. Verification does **not** grant licensing, title, stock, or contracting rights.
6. Admin manages relationships at `/admin/relations`; neither party can view other supplier conversations. Relational records and messages are append-only to the ordinary user API.

## Required hosted Supabase Auth email template configuration
**This cannot be applied solely by committing a Git file.** In the Supabase Dashboard for this department project, open Authentication → Email Templates → Invite User, and paste the HTML in `supabase/templates/invite.html`. This ensures the *initial personalized message* is included in the invitation email through the verified Supabase template variable `{{ .Data.invitation_message }}`. The default hosted invite template will only contain a generic invitation without that message.

Check that `{{ .ConfirmationURL }}` remains present and that `APP_ORIGIN` and Auth redirect allowlist point to the canonical HTTPS domain. Configure SMTP for reliable external delivery. Do not copy real invitation tokens to bug reports or chat.

The invitation form stores the message on-platform regardless of the email template state; subsequent discussion uses on-platform private messages, not email replies.

## Constraints and operations
- Staff roles are trusted separately; suppliers cannot grant themselves internal privileges.
- One relationship per account; supplier type is fixed by trusted server action.
- Suppliers get SELECT-only RLS access to their own relationship/message rows; writes go through server actions with object authorization.
- A declined or revoked invitation closes message posting, while retaining read-only history. Admin may reopen an invitation; no automatic re-email currently occurs.
- There is no live push subscription: users can revisit the thread to see new replies. Invite/recovery email delivery and real sign-in must be tested using a nonproduction identity before considering the full workflow end-to-end verified.
- The migration file follows the exact applied Supabase schema migration version. Do not replay it or modify existing application/account records.
- Existing public authors in Manga & Light Novel can register directly and are not subject to invitation gatekeeping; author-application submission creates their completed relationship record.

## Acceptance checklist
- Admin sends a real invitation with a 40+ character introduction; invited contact receives the customized email and access link.
- Invitee sets password, accesses only their invitation, exchanges messages, accepts/declines, and is not able to submit an application until account completion.
- Admin cannot read messages from another department. A supplier cannot access another relationship by changing its UUID.
- Existing email → Finish account setup; alternate email → confirm email change first → Finish. Confirm same account ID and message history in both cases.
- Supplier application submitted after completion appears in **Onboarding**, not the **Accounts** list, and does not auto-approve business activities.
- Account suspension prevents supplier API access; revoked/declined contacts cannot send new messages.
- Browser/phone screen tests confirm responsive layout, accessible form labels, clear error states, and navigation without unexpected document reloads.
