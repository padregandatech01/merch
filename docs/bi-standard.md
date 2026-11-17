# Loxada BI standard

Apply this checklist to department and management **analytics reports**, including accounts and later product reporting. Operational forms and account-management pages stay separate from analytics.

- Start with the decision, source, fact grain, measure definitions, access rules and refresh cadence. State when a value is current, historical, or unavailable.
- Provide a useful initial view and a multidimensional table wherever the data supports it. Use readable names, units, and local time.
- **Slice** by one dimension. **Dice** by combining dimensions and, where useful, selecting multiple members. **Pivot** the same measures between row and column dimensions.
- **Drill down and up** on real hierarchies, such as year → month or account group → account type. Keep filters when switching levels.
- **Drill through** a count to the authorized, matching detail records. Carry all filters, and keep them on pagination or search. Never substitute a differently scoped list.
- Validate subtotal and grand-total reconciliation, filter boundaries, access permissions and the distinction between zero, missing and unavailable. Do not expose record identifiers in aggregate payloads.
- Don't force a meaningless hierarchy. If an operation does not fit the data, document why.

## First implementation

**Account Analysis** at `/admin/supplier-activity/accounts` uses one non-staff portal account as the fact grain. The measure is count of accounts. The dimensions are registration date (Asia/Manila year or month), account group/type, and current access status. These are registration cohorts with a current status, not historical suspension snapshots. A supplier account can exist before invitation setup or verification is complete.

Counts are grouped on demand inside the department database. The service-only read function returns aggregate rows, and the server route authorizes the department admin before fetching them. A cube cell drills through to Account Access. No warehouse, fake history, or cross-department data is added.

Verify with `node --test tests/account-cube.test.mjs` and compare the filtered account list totals with the selected cube cells.
