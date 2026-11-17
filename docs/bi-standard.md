# Loxada BI standard

Apply this checklist to department and management **analytics reports**, including accounts and later product reporting. Keep analytical controls and results separate from operational forms, even when they share a screen.

- Start with the decision, source, fact grain, measure definitions, access rules and refresh cadence. State when a value is current, historical, or unavailable.
- Provide a useful initial view and a multidimensional table wherever the data supports it. Use readable names, units, and local time.
- **Slice** by one dimension. **Dice** by combining dimensions and, where useful, selecting multiple members. **Pivot** the same measures between row and column dimensions.
- **Drill down and up** on real hierarchies, such as year → month or account group → account type. Keep filters when switching levels.
- **Drill through** a count to the authorized, matching detail records. Carry all filters, and keep them on pagination or search. Never substitute a differently scoped list.
- Validate subtotal and grand-total reconciliation, filter boundaries, access permissions and the distinction between zero, missing and unavailable. Do not expose record identifiers in aggregate payloads.
- Don't force a meaningless hierarchy. If an operation does not fit the data, document why.

## Account Analysis

**Account Analysis** lives inside Account Access at `/admin/accounts#account-analysis`. Pick any account group (users, department admins, or suppliers), date range, and grouping (year, quarter, or month) directly. You can still narrow by account type or access status, choose dimensions, and pivot without changing the scope. Dates use Asia/Manila calendar boundaries.

The measure is current account count, grouped by portal registration date or department admin role assignment date. Current access status is separate from account date and is not a historical suspension snapshot. Staff sign-in status is not tracked by this report. Staff counts are aggregate-only and cannot open individual staff records. The user/supplier directory still excludes staff. A supplier record can exist before invitation setup or verification is complete.

The department's service-only database function supplies user and supplier aggregates. After the admin check, the server also aggregates only the department admin role timestamps. User and supplier cells open their matching account records, including exact quarter/month bounds. Report and directory filters are independent. This uses current department data, with no warehouse, fake history, or cross-department totals.

Verify with `node --test tests/account-cube.test.mjs` and compare linked counts with the filtered account list totals.
