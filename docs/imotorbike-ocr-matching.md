# iMotorbike OCR-to-Issuance Matching

## How it works

The **issuance table** (`imotorbike_billing_normalised`) is built from **insurer billing data** and optionally enriched with **OCR data**:

1. **insurer_billing_data** – Rows from insurer CSV/XLS uploads (vehicle_no, client_name, issue_date, sum_insured, etc.)
2. **ocr_data_table** – Rows from OCR CSV/XLS uploads (vehicle_no, insured_name, date_issue, premium, total_amount_payable, etc.)
3. **imotorbike_billing_normalised** – One row per billing record, with OCR fields (premium, total_amount_payable, etc.) merged in when there’s a match

**Important:** Every issuance row must have a corresponding row in `insurer_billing_data`. OCR data only enriches existing billing rows; it does not create issuance rows by itself.

## Matching rules (after migration 20260224110000)

Matching is done on **vehicle_no + date** only. The client name (insured_name / client_name) is **not** used, to allow for name variations between billing and OCR.

1. **Primary:** `vehicle_no` (normalised: lowercase, no spaces) + `date` (issue_date vs date_issue, parsed to YYYY-MM-DD)
2. **Fallback:** `vehicle_no` only, when there is exactly one billing row with no OCR data for that vehicle

## Why OCR data may not appear in the issuance table

| Cause | Explanation |
|-------|-------------|
| **No billing data** | The vehicle has OCR data but no row in `insurer_billing_data`. Upload the insurer billing CSV/XLS first. |
| **Date mismatch** | OCR `date_issue` could not be parsed. Supported formats: `M/DD/YYYY`, `MM/DD/YYYY`, `M/D/YYYY`, `YYYY-MM-DD`, `YYYY/MM/DD`. Check `parse_ocr_date_to_iso(date_issue)`. |
| **Vehicle format mismatch** | Plate numbers differ after normalisation (e.g. spaces, special chars). `norm_vehicle()` lowercases and strips spaces. |
| **Company/project mismatch** | OCR and billing use different `company_id` or `project`. Both must match (or both imotorbike/null). |

## Diagnostic queries

### OCR rows with no matching billing data (will never appear in issuance until billing is uploaded)

```sql
SELECT o.vehicle_no, o.date_issue, o.insured_name, o.company_id, o.project
FROM ocr_data_table o
WHERE NOT EXISTS (
  SELECT 1 FROM insurer_billing_data b
  WHERE b.company_id = o.company_id
    AND (b.project IS NOT DISTINCT FROM o.project
         OR ((o.project = 'imotorbike' OR o.project IS NULL) AND (b.project = 'imotorbike' OR b.project IS NULL)))
    AND lower(regexp_replace(coalesce(trim(b.vehicle_no), ''), '\s+', '', 'g'))
      = lower(regexp_replace(coalesce(trim(o.vehicle_no), ''), '\s+', '', 'g'))
    AND to_char(COALESCE(b.issue_date, b.transaction_date::date), 'YYYY-MM-DD')
      = public.parse_ocr_date_to_iso(o.date_issue)
);
```

### OCR rows with unparseable dates

```sql
SELECT vehicle_no, date_issue, insured_name, company_id
FROM ocr_data_table
WHERE parse_ocr_date_to_iso(date_issue) IS NULL
  AND date_issue IS NOT NULL AND trim(date_issue) != '';
```

### Re-run backfill manually

If you add data and triggers don’t run as expected, you can re-run the backfill logic. See migration `20260224110000_fix_ocr_matching_relax_client_name.sql` for the full `DELETE` + `INSERT` pattern.

**Note:** A full backfill wipes `imotorbike_billing_normalised` and rebuilds it. Manual verification statuses (e.g. cancelled, completed) and any field edits will be reset.

## Clean data checklist

1. Upload **insurer billing data** first (CSV/XLS from Allianz, Generali, etc.).
2. Upload **OCR data** second. Triggers will match and merge automatically.
3. If matching still fails, check the diagnostic queries above.
4. Apply migration `20260224110000` to relax matching (remove client_name requirement) and run the backfill:
   ```bash
   supabase db push
   # or: supabase migration up
   ```

**Note:** The backfill in this migration does a full rebuild of `imotorbike_billing_normalised`. Manual verification statuses and field edit history will be reset. Re-verify rows if needed after running.
