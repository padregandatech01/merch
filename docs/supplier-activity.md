# Supplier Activity report

**Access:** Department admins only, at `/admin/supplier-activity`. Each deployment reads its own department. This is a read-only operational report using the current database, not a warehouse or a cross-department export.

| Metric | Grain and source | Destination |
|---|---|---|
| Invitation follow-up | One supplier relationship in each current stage: invited, discussing, or accepted | Supplier Invitations & Messages filtered to the stage |
| Application queues | One submitted application in each current stage: pending, needs_info, or verified | Supplier Applications filtered to the stage |
| Oldest pending application | Original created_at of the oldest currently pending application, not time since the last resubmission | Pending application list |
| Recent intake | Original application creation in each adjacent, non-overlapping 30-day window | No date drill-down yet |
| Account access | One non-staff portal account grouped by account type and suspension status | Account Access with matching type and status filters |

Manga authors who self-register can appear in application counts without being counted as invited. Accepted means a supplier accepted their invitation, not that their application was verified. Not suspended is an account record status, not a guarantee that setup is complete or sign-in succeeds.

Counts use exact database counts, not the length of a paginated list. An unavailable count is shown as unavailable, never as zero. The oldest submission uses whole elapsed days. The report sends no emails, changes no records, and shows no contact emails or conversation contents.

## Verify

Run `node --test tests/supplier-activity.test.mjs` with Node.js 22.18+ or 24. As a department admin, open the report from the sidebar or home. Compare counts with the linked filtered lists, including zero-count views. Confirm signed-out visitors are redirected to login.
