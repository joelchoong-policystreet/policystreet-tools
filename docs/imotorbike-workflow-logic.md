# iMotorbike Workflow — Business Logic Reference

This document describes the rules and logic governing the iMotorbike project view: how data is imported, how rows are filtered, what the stat cards mean, and how verification statuses work.

---

## CSV Import — Rejection Rules

When a CSV is uploaded (Insurer Billing or OCR Data), rows are validated before insertion. Rejected rows are written to the **Errors tab** with a specific reason.

### Insurer Billing Upload

| Rejection Reason | When it triggers |
|---|---|
| **No valid date** | The issue date column is blank or in an unrecognisable format (e.g. typo, wrong column) |
| **Missing insurer** | The insurer column is blank or absent |
| **No valid date; Missing insurer** | Both conditions above apply |
| **Duplicate vehicle + date** | The same `vehicle_no` + `issue_date` combination already exists in `insurer_billing_data` for this company, **or** appears more than once within the same uploaded CSV batch |

> Date parsing is flexible — it accepts many formats (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-Mon-YYYY`, etc). A date is "invalid" only if no format can parse it at all.

### OCR Data Upload

| Rejection Reason | When it triggers |
|---|---|
| **Missing insurer** | The insurer column is blank or absent |
| **Duplicate** | The same `vehicle_no` + `date_issue` combination already exists in `ocr_data_table` for this company, **or** appears more than once within the same uploaded CSV batch |

### Duplicate Detection Logic (both uploads)

1. Before inserting, the app fetches all existing `vehicle_no + issue_date` combinations from the database for the current company.
2. It normalises plate numbers (lowercase, strips whitespace) for comparison.
3. As rows are processed, a `seenInBatch` set tracks plates already accepted in the current upload — so even if the DB has no existing record, two identical rows in one file will result in the second being rejected.

---

## Stat Cards — Filter Definitions

The four clickable cards at the top of the Issuance tab act as filters. Clicking a card toggles the filter on/off.

| Card | What it shows |
|---|---|
| **Complete** | Rows where `total_amount_payable` is **not empty**, OR where the verification status is `cancelled_billed` ("confirmed cancelled and already billed") |
| **Incomplete** | Rows where `total_amount_payable` **is empty** AND verification status is `pending`. These need action before billing. |
| **Cancelled** | Rows where verification status is `cancelled_not_billed` ("issuance cancelled, do not bill") |
| **Total** | All rows in the current date/insurer filter — not affected by the stat card filter |

> The default view loads with the **Complete** filter active.

---

## Verification Status

Each issuance row on the Issuance tab has an **Action** dropdown. The status is persisted to the `imotorbike_billing_normalised` table (`verification_status` column).

| Status Value | Label | Meaning |
|---|---|---|
| `pending` | Pending | No decision made yet. Default for all new rows. |
| `cancelled_not_billed` | Issuance cancelled – not to be billed | The issuance was cancelled. Exclude from billing. Appears in the Cancelled stat card. |
| `cancelled_billed` | Issuance cancelled – already billed | The issuance was cancelled but has already been billed. Counts as Complete. |

**Persistence:** Changes are saved to Supabase immediately on selection (optimistic update — the UI reflects the change instantly, and the DB write happens in the background).

---

## CSV Export

The **Export** button on the Issuance tab downloads a CSV of all rows currently visible (respecting the active date filter, insurer filter, search query, and stat card filter).

Exported columns:

- Issue Date, Client Name, Vehicle No
- Sum Insured (RM), Premium, NCD, Total Base Premium, Total Extra Coverage, Gross Premium, Service Tax, Stamp Duty, Total Amount Payable (RM)
- Insurer
- **Verification Status** (human-readable: `Completed`, `Completed (Verified)`, `Issuance Cancelled`, `Verification Required`, or `Incomplete`)

---

## Audit Logging

All significant user actions are written to the `audit_logs` table in Supabase.

| Event Type | Trigger | Item Affected |
|---|---|---|
| **User** | A new user is added (via Admin → Users) | New user's email |
| **User** | A user's status is changed (active / deactivated) | User's display name + new status |
| **Workflow** | Insurer Billing CSV uploaded successfully | `{projectId} - N rows` |
| **Workflow** | OCR Data CSV uploaded successfully | `{projectId} - N rows` |
| **Workflow** | Issuance CSV exported | `{projectId} - N rows` |

> User changes are tracked automatically via a **PostgreSQL trigger** (`trigger_audit_profiles`) on the `profiles` table. Import and export events are recorded manually from the frontend after a successful operation.

### Audit Log RLS

- **Insert**: Any authenticated user can insert (required for frontend tracking).
- **Read**: Only users with the `admin` role in `user_roles` can view the audit log (enforced via RLS `EXISTS` check).

---

## Admin — Self-Deactivation Guard

On the Admin → Users page, the **Active / Deactivated** toggle for the currently logged-in user is permanently disabled. This prevents an administrator from accidentally locking themselves out of the system.
