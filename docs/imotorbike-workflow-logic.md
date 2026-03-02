# iMotorbike Workflow — Business Logic Reference

This document describes the rules and logic governing the iMotorbike project view: how data is imported, how rows are processed into the iMotorbike Issuance table, how filtering works, and how verification statuses behave.

---

## 1. Data Architecture Overview

The workflow uses three core tables:

| Table | Purpose |
|-------|---------|
| **insurer_billing_data** | Raw billing CSV uploads (manual) |
| **ocr_data_table** | Raw OCR CSV uploads (automated) |
| **imotorbike_billing_normalised** | Derived issuance table (drives Issuance tab) |

The **Issuance tab** reads only from `imotorbike_billing_normalised`.

This table is automatically maintained via **two** PostgreSQL triggers:

1. **`trg_insurer_billing_sync_normalised`** — fires on `insurer_billing_data` INSERT/UPDATE
2. **`trg_ocr_sync_normalised`** — fires on `ocr_data_table` INSERT/UPDATE/DELETE

**Upload order does not matter.** OCR can be uploaded first (e.g. automated), then insurer billing later (manual). When billing is uploaded, the trigger finds existing OCR matches and merges them. Similarly, if billing is uploaded first and OCR later, the OCR trigger enriches existing issuance rows.

**Important:** Every issuance row has a corresponding row in `insurer_billing_data`. OCR data only enriches existing billing rows; it never creates issuance rows by itself.

---

## 2. CSV Import — Rejection Rules

When a CSV is uploaded, rows are validated before insertion. Rejected rows are written to the **Errors tab** with a specific reason.

### 2.1 Insurer Billing Upload

| Rejection Reason | When it triggers |
|------------------|-----------------|
| **Issuance cancelled** | The TRX status column (e.g. "TRX status", "trx_status") has value "cancelled" — row is logged to Errors tab only |
| **No valid date** | The issue date column is blank or cannot be parsed into a valid date |
| **Missing insurer** | The insurer column is blank or absent |
| **No valid date; Missing insurer** | Both conditions apply |
| **Duplicate vehicle + date** | The same `vehicle_no` + `issue_date` already exists in `insurer_billing_data` for this company, **or** appears more than once in the same upload batch |

**Date parsing** accepts multiple formats including: `DD/MM/YYYY`, `d/M/yyyy`, `YYYY-MM-DD`, `DD-Mon-YYYY`, `d/M/yyyy HH:mm`, etc. A date is invalid only if no format can parse it.

### 2.2 OCR Data Upload

| Rejection Reason | When it triggers |
|------------------|-----------------|
| **Missing insurer** | The insurer column is blank or absent |
| **Duplicate** | The same `vehicle_no` + `date_issue` already exists in `ocr_data_table` for this company, **or** appears more than once in the same upload batch |
| **Date out of range** | The `date_issue` value cannot be parsed (OCR uses US-style formats: `M/d/yyyy`, `yyyy-MM-dd`, etc.) |

### 2.3 Duplicate Detection Logic (both uploads)

1. Existing `vehicle_no` + date combinations are fetched for the current company (and project for OCR).
2. Vehicle numbers are normalised (lowercase + whitespace stripped).
3. A `seenInBatch` set tracks accepted rows within the same upload.
4. If a duplicate appears: **already in DB** → rejected; **already in current CSV** → rejected.

---

## 3. Billing → Normalised Sync Logic

The `imotorbike_billing_normalised` table is updated by **two triggers**.

### 3.1 Trigger 1: Insurer Billing (`sync_billing_to_normalised`)

**Fires:** `AFTER INSERT OR UPDATE` on `insurer_billing_data`

| Event | Action |
|-------|--------|
| INSERT | Evaluate and sync record |
| UPDATE | Re-evaluate and replace if required |
| DELETE | Handled by `ON DELETE CASCADE` (no trigger) — normalised row is cascade-deleted |

**Sync flow** when billing is inserted/updated:

| Attempt | Matching Criteria | Outcome |
|---------|-------------------|---------|
| **1 (Strict)** | `company_id` + `project` + `vehicle_no` (normalised) + exact `issue_date` | Use latest matching OCR record; set `verification_status = 'completed'` if OCR has `total_amount_payable` |
| **2 (Fallback)** | `company_id` + `project` + `vehicle_no` (normalised) only | Use latest OCR record by `created_at`; same verification logic |
| **3 (No match)** | — | Insert billing-only data; OCR fields empty; `verification_status = 'pending'` |

Uses `ON CONFLICT (billing_id) DO UPDATE` for upsert behaviour.

### 3.2 Trigger 2: OCR Data (`sync_ocr_to_normalised`)

**Fires:** `AFTER INSERT OR UPDATE OR DELETE` on `ocr_data_table`

| Event | Action |
|-------|--------|
| INSERT / UPDATE | Find matching billing rows and merge OCR data into issuance |
| DELETE | Clear OCR-derived fields on matching issuance row; downgrade `verification_status` from `completed` to `pending` if applicable |

**Sync flow** when OCR is inserted/updated:

| Phase | Matching Criteria | Outcome |
|-------|-------------------|---------|
| **1 (Strict)** | `company_id` + `project` + `vehicle_no` + exact date | Update/create issuance row with OCR data |
| **2 (Fallback)** | `company_id` + `project` + `vehicle_no` only; exactly ONE billing row with no OCR data for that vehicle | Merge OCR into that single issuance row |

When OCR is **deleted**: matching issuance rows have OCR fields cleared; billing fields remain.

### 3.3 Matching Rules

| Rule | Billing | OCR |
|------|---------|-----|
| **Vehicle** | `norm_vehicle(vehicle_no)` — lowercase, no spaces |
| **Date** | `issue_date` or `transaction_date` (YYYY-MM-DD) | `parse_ocr_date_to_iso(date_issue)` — US formats |
| **Client name** | Not used (relaxed matching) |
| **Project** | `projects_match_imotorbike(b.project, o.project)` — matches imotorbike / NULL / empty |
| **Company** | Must match `company_id` |

---

## 4. Stat Cards — Filter Definitions

The four clickable cards at the top of the Issuance tab act as filters.

| Card | What it shows |
|------|---------------|
| **Complete** | Rows where `total_amount_payable` is **not empty** OR `verification_status = completed`. Excludes cancelled variants. |
| **Incomplete** | Rows where `total_amount_payable` **is empty** AND `verification_status = pending` |
| **Cancelled** | Rows where `verification_status = cancelled` or `cancelled_but_billed` |
| **Total** | All rows within the active date/insurer filters — not affected by the stat card filter |

> The default view loads with **Complete** active.

---

## 5. Verification Status

Each issuance row has an **Action** dropdown. Status is persisted to `imotorbike_billing_normalised.verification_status`.

| Status Value | Label | Meaning |
|--------------|-------|---------|
| `pending` | Pending | No decision yet (default) |
| `completed` | Completed | Verified; counts as Complete |
| `cancelled` | Issuance cancelled – not to be billed | Excluded from billing |
| `cancelled_but_billed` | Issuance cancelled – already billed | Counts as Complete |

**Persistence:** Changes are saved to Supabase immediately (optimistic UI update; no page reload required).

---

## 6. CSV Export

The **Export** button downloads all currently visible rows.

Export respects: date filter, insurer filter, search query, active stat card filter.

Exported columns include: Issue Date, Client Name, Vehicle No, Sum Insured (RM), Premium, NCD, Total Base Premium, Total Extra Coverage, Gross Premium, Service Tax, Stamp Duty, Total Amount Payable (RM), Insurer, Verification Status (human-readable).

---

## 7. Audit Logging

All significant user actions are written to `audit_logs`.

| Event Type | Trigger | Item Affected |
|------------|---------|---------------|
| **User** | New user added | User email |
| **User** | User activated/deactivated | Display name + new status |
| **Workflow** | Insurer Billing CSV uploaded | `{projectId} - N rows` |
| **Workflow** | OCR Data CSV uploaded | `{projectId} - N rows` |
| **Workflow** | Issuance CSV exported | `{projectId} - N rows` |

### 7.1 Audit Implementation

| Type | Method |
|------|--------|
| User changes | PostgreSQL trigger (`trigger_audit_profiles`) on `profiles` |
| Import/export events | Frontend event logging after success |

### 7.2 Audit Log RLS

| Operation | Access Rule |
|-----------|-------------|
| Insert | Any authenticated user |
| Read | Admin role only (RLS `EXISTS` check on `user_roles`) |

---

## 8. Admin — Self-Deactivation Guard

On the Admin → Users page, the currently logged-in user's **Active / Deactivated** toggle is permanently disabled. This prevents accidental self-lockout.

---

## Final System Guarantees

- No duplicate `vehicle_no` + date entries in raw tables
- Real-time sync via two database triggers (billing and OCR)
- Upload order does not matter (OCR first or billing first both work)
- OCR enriches billing; never creates issuance rows
- Full audit traceability
- Deterministic filtering logic
