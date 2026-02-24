-- Fix OCR-to-issuance matching: drop client_name requirement.
-- Run each step separately in Supabase SQL editor. Wait for each to complete before the next.
--
-- STEP 1: Update sync functions (relaxed matching: vehicle+date only)
-- STEP 2: Backfill imotorbike_billing_normalised (one row per vehicle per year)

-- =============================================================================
-- STEP 1: Update sync functions (vehicle+date only, no client_name)
-- =============================================================================
-- New insurer/OCR uploads will use relaxed matching.

CREATE OR REPLACE FUNCTION public.sync_billing_to_normalised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $sync_billing$
DECLARE
  billing_date_iso text;
  row_count int := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.imotorbike_billing_normalised WHERE billing_id = OLD.id;
    RETURN OLD;
  END IF;

  billing_date_iso := to_char(COALESCE(NEW.issue_date, NEW.transaction_date), 'YYYY-MM-DD');
  IF billing_date_iso IS NULL OR billing_date_iso = '' THEN
    RETURN NEW;
  END IF;

  -- Try 1: vehicle + date match (no client_name)
  INSERT INTO public.imotorbike_billing_normalised (
    billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
    total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
    premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty,
    verification_status
  )
  SELECT
    NEW.id, NEW.company_id, NEW.project,
    COALESCE(NEW.issue_date, NEW.transaction_date::date),
    NEW.client_name, NEW.vehicle_no, NEW.sum_insured,
    o.total_amount_payable_rounded, o.insured_ic_no, o.insurer_contact_no, o.insured_email,
    o.vehicle_make_model, o.type_of_cover, o.premium, o.ncd, o.total_base_premium,
    o.total_extra_coverage, o.gross_premium, o.service_tax, o.stamp_duty,
    CASE
      WHEN o.total_amount_payable_rounded IS NOT NULL AND o.total_amount_payable_rounded != '' THEN 'completed'
      ELSE 'pending'
    END
  FROM public.ocr_data_table o
  WHERE o.company_id = NEW.company_id
    AND public.projects_match_imotorbike(o.project, NEW.project)
    AND public.norm_vehicle(o.vehicle_no) = public.norm_vehicle(NEW.vehicle_no)
    AND public.parse_ocr_date_to_iso(o.date_issue) = billing_date_iso
  ORDER BY o.created_at DESC
  LIMIT 1
  ON CONFLICT (billing_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    project = EXCLUDED.project,
    issue_date = EXCLUDED.issue_date,
    client_name = EXCLUDED.client_name,
    vehicle_no = EXCLUDED.vehicle_no,
    sum_insured = EXCLUDED.sum_insured,
    total_amount_payable = EXCLUDED.total_amount_payable,
    ic = EXCLUDED.ic,
    contact_no = EXCLUDED.contact_no,
    email = EXCLUDED.email,
    vehicle_make_model = EXCLUDED.vehicle_make_model,
    type_of_cover = EXCLUDED.type_of_cover,
    premium = EXCLUDED.premium,
    ncd = EXCLUDED.ncd,
    total_base_premium = EXCLUDED.total_base_premium,
    total_extra_coverage = EXCLUDED.total_extra_coverage,
    gross_premium = EXCLUDED.gross_premium,
    service_tax = EXCLUDED.service_tax,
    stamp_duty = EXCLUDED.stamp_duty,
    verification_status = CASE
      WHEN public.imotorbike_billing_normalised.verification_status = 'pending'
           AND EXCLUDED.total_amount_payable IS NOT NULL
           AND EXCLUDED.total_amount_payable != ''
      THEN 'completed'
      ELSE public.imotorbike_billing_normalised.verification_status
    END,
    updated_at = now();

  GET DIAGNOSTICS row_count = ROW_COUNT;

  -- Try 2 (fallback): vehicle only
  IF row_count = 0 THEN
    INSERT INTO public.imotorbike_billing_normalised (
      billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
      total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
      premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty,
      verification_status
    )
    SELECT
      NEW.id, NEW.company_id, NEW.project,
      COALESCE(NEW.issue_date, NEW.transaction_date::date),
      NEW.client_name, NEW.vehicle_no, NEW.sum_insured,
      o.total_amount_payable_rounded, o.insured_ic_no, o.insurer_contact_no, o.insured_email,
      o.vehicle_make_model, o.type_of_cover, o.premium, o.ncd, o.total_base_premium,
      o.total_extra_coverage, o.gross_premium, o.service_tax, o.stamp_duty,
      CASE
        WHEN o.total_amount_payable_rounded IS NOT NULL AND o.total_amount_payable_rounded != '' THEN 'completed'
        ELSE 'pending'
      END
    FROM public.ocr_data_table o
    WHERE o.company_id = NEW.company_id
      AND public.projects_match_imotorbike(o.project, NEW.project)
      AND public.norm_vehicle(o.vehicle_no) = public.norm_vehicle(NEW.vehicle_no)
    ORDER BY o.created_at DESC
    LIMIT 1
    ON CONFLICT (billing_id) DO UPDATE SET
      total_amount_payable = EXCLUDED.total_amount_payable,
      ic = EXCLUDED.ic,
      contact_no = EXCLUDED.contact_no,
      email = EXCLUDED.email,
      vehicle_make_model = EXCLUDED.vehicle_make_model,
      type_of_cover = EXCLUDED.type_of_cover,
      premium = EXCLUDED.premium,
      ncd = EXCLUDED.ncd,
      total_base_premium = EXCLUDED.total_base_premium,
      total_extra_coverage = EXCLUDED.total_extra_coverage,
      gross_premium = EXCLUDED.gross_premium,
      service_tax = EXCLUDED.service_tax,
      stamp_duty = EXCLUDED.stamp_duty,
      verification_status = CASE
        WHEN public.imotorbike_billing_normalised.verification_status = 'pending'
             AND EXCLUDED.total_amount_payable IS NOT NULL
             AND EXCLUDED.total_amount_payable != ''
        THEN 'completed'
        ELSE public.imotorbike_billing_normalised.verification_status
      END,
      updated_at = now();

    GET DIAGNOSTICS row_count = ROW_COUNT;
  END IF;

  -- Try 3: no OCR match - minimal row from billing only
  IF row_count = 0 THEN
    INSERT INTO public.imotorbike_billing_normalised (
      billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured, verification_status
    )
    VALUES (
      NEW.id, NEW.company_id, NEW.project,
      COALESCE(NEW.issue_date, NEW.transaction_date::date),
      NEW.client_name, NEW.vehicle_no, NEW.sum_insured,
      'pending'
    )
    ON CONFLICT (billing_id) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      project = EXCLUDED.project,
      issue_date = EXCLUDED.issue_date,
      client_name = EXCLUDED.client_name,
      vehicle_no = EXCLUDED.vehicle_no,
      sum_insured = EXCLUDED.sum_insured,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$sync_billing$;

CREATE OR REPLACE FUNCTION public.sync_ocr_to_normalised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $sync_ocr$
DECLARE
  r RECORD;
  ocr_date_iso text;
  ocr_company uuid;
  ocr_project text;
  ocr_vehicle text;
  phase1_count int := 0;
  candidate_count int;
BEGIN
  ocr_company := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
  ocr_project := CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END;
  ocr_vehicle := CASE WHEN TG_OP = 'DELETE' THEN OLD.vehicle_no ELSE NEW.vehicle_no END;
  ocr_date_iso := public.parse_ocr_date_to_iso(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.date_issue ELSE NEW.date_issue END
  );

  -- Phase 1: vehicle + date match (no client_name)
  IF ocr_date_iso IS NOT NULL AND ocr_date_iso != '' THEN
    FOR r IN
      SELECT b.id, b.company_id, b.project, b.issue_date, b.transaction_date, b.client_name, b.vehicle_no, b.sum_insured
      FROM public.insurer_billing_data b
      WHERE b.company_id = ocr_company
        AND public.projects_match_imotorbike(ocr_project, b.project)
        AND public.norm_vehicle(b.vehicle_no) = public.norm_vehicle(ocr_vehicle)
        AND to_char(COALESCE(b.issue_date, b.transaction_date::date), 'YYYY-MM-DD') = ocr_date_iso
    LOOP
      phase1_count := phase1_count + 1;
      IF TG_OP = 'DELETE' THEN
        UPDATE public.imotorbike_billing_normalised
        SET total_amount_payable = NULL, ic = NULL, contact_no = NULL, email = NULL,
            vehicle_make_model = NULL, type_of_cover = NULL, premium = NULL, ncd = NULL,
            total_base_premium = NULL, total_extra_coverage = NULL, gross_premium = NULL,
            service_tax = NULL, stamp_duty = NULL,
            verification_status = CASE WHEN verification_status = 'completed' THEN 'pending' ELSE verification_status END,
            updated_at = now()
        WHERE billing_id = r.id;
      ELSE
        INSERT INTO public.imotorbike_billing_normalised (
          billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
          total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
          premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty,
          verification_status
        )
        VALUES (
          r.id, r.company_id, r.project, COALESCE(r.issue_date, r.transaction_date::date), r.client_name, r.vehicle_no, r.sum_insured,
          NEW.total_amount_payable_rounded, NEW.insured_ic_no, NEW.insurer_contact_no, NEW.insured_email,
          NEW.vehicle_make_model, NEW.type_of_cover, NEW.premium, NEW.ncd, NEW.total_base_premium,
          NEW.total_extra_coverage, NEW.gross_premium, NEW.service_tax, NEW.stamp_duty,
          CASE WHEN NEW.total_amount_payable_rounded IS NOT NULL AND NEW.total_amount_payable_rounded != '' THEN 'completed' ELSE 'pending' END
        )
        ON CONFLICT (billing_id) DO UPDATE SET
          total_amount_payable = EXCLUDED.total_amount_payable,
          ic = EXCLUDED.ic, contact_no = EXCLUDED.contact_no, email = EXCLUDED.email,
          vehicle_make_model = EXCLUDED.vehicle_make_model, type_of_cover = EXCLUDED.type_of_cover,
          premium = EXCLUDED.premium, ncd = EXCLUDED.ncd,
          total_base_premium = EXCLUDED.total_base_premium, total_extra_coverage = EXCLUDED.total_extra_coverage,
          gross_premium = EXCLUDED.gross_premium, service_tax = EXCLUDED.service_tax, stamp_duty = EXCLUDED.stamp_duty,
          verification_status = CASE
            WHEN public.imotorbike_billing_normalised.verification_status = 'pending'
                 AND EXCLUDED.total_amount_payable IS NOT NULL AND EXCLUDED.total_amount_payable != ''
            THEN 'completed'
            ELSE public.imotorbike_billing_normalised.verification_status
          END,
          updated_at = now();
      END IF;
    END LOOP;
  END IF;

  -- Phase 2 (fallback): vehicle-only
  IF phase1_count = 0 AND TG_OP != 'DELETE' THEN
    SELECT count(*) INTO candidate_count
    FROM public.insurer_billing_data b
    JOIN public.imotorbike_billing_normalised n ON n.billing_id = b.id
    WHERE b.company_id = ocr_company
      AND public.projects_match_imotorbike(ocr_project, b.project)
      AND public.norm_vehicle(b.vehicle_no) = public.norm_vehicle(ocr_vehicle)
      AND n.ic IS NULL
      AND COALESCE(b.issue_date, b.transaction_date::date) IS NOT NULL;
    IF candidate_count = 1 THEN
      FOR r IN
        SELECT b.id, b.company_id, b.project, b.issue_date, b.transaction_date, b.client_name, b.vehicle_no, b.sum_insured
        FROM public.insurer_billing_data b
        JOIN public.imotorbike_billing_normalised n ON n.billing_id = b.id
        WHERE b.company_id = ocr_company
          AND public.projects_match_imotorbike(ocr_project, b.project)
          AND public.norm_vehicle(b.vehicle_no) = public.norm_vehicle(ocr_vehicle)
          AND n.ic IS NULL
          AND COALESCE(b.issue_date, b.transaction_date::date) IS NOT NULL
      LOOP
        INSERT INTO public.imotorbike_billing_normalised (
          billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
          total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
          premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty,
          verification_status
        )
        VALUES (
          r.id, r.company_id, r.project, COALESCE(r.issue_date, r.transaction_date::date), r.client_name, r.vehicle_no, r.sum_insured,
          NEW.total_amount_payable_rounded, NEW.insured_ic_no, NEW.insurer_contact_no, NEW.insured_email,
          NEW.vehicle_make_model, NEW.type_of_cover, NEW.premium, NEW.ncd, NEW.total_base_premium,
          NEW.total_extra_coverage, NEW.gross_premium, NEW.service_tax, NEW.stamp_duty,
          CASE WHEN NEW.total_amount_payable_rounded IS NOT NULL AND NEW.total_amount_payable_rounded != '' THEN 'completed' ELSE 'pending' END
        )
        ON CONFLICT (billing_id) DO UPDATE SET
          total_amount_payable = EXCLUDED.total_amount_payable,
          ic = EXCLUDED.ic, contact_no = EXCLUDED.contact_no, email = EXCLUDED.email,
          vehicle_make_model = EXCLUDED.vehicle_make_model, type_of_cover = EXCLUDED.type_of_cover,
          premium = EXCLUDED.premium, ncd = EXCLUDED.ncd,
          total_base_premium = EXCLUDED.total_base_premium, total_extra_coverage = EXCLUDED.total_extra_coverage,
          gross_premium = EXCLUDED.gross_premium, service_tax = EXCLUDED.service_tax, stamp_duty = EXCLUDED.stamp_duty,
          verification_status = CASE
            WHEN public.imotorbike_billing_normalised.verification_status = 'pending'
                 AND EXCLUDED.total_amount_payable IS NOT NULL AND EXCLUDED.total_amount_payable != ''
            THEN 'completed'
            ELSE public.imotorbike_billing_normalised.verification_status
          END,
          updated_at = now();
      END LOOP;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$sync_ocr$;


-- =============================================================================
-- STEP 2: Backfill imotorbike_billing_normalised
-- =============================================================================
-- One row per vehicle per year (unique_vehicle_year). When multiple billing rows
-- exist for same vehicle+year, pick the one with OCR data or most recent issue_date.
-- WARNING: Deletes all rows, then re-inserts. Manual verification statuses reset.

DELETE FROM public.imotorbike_billing_normalised;

INSERT INTO public.imotorbike_billing_normalised (
  billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
  total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
  premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty,
  verification_status
)
SELECT DISTINCT ON (b.vehicle_no, EXTRACT(year FROM COALESCE(b.issue_date, b.transaction_date::date)))
  b.id, b.company_id, b.project,
  COALESCE(b.issue_date, b.transaction_date::date),
  b.client_name, b.vehicle_no, b.sum_insured,
  COALESCE(o1.total_amount_payable_rounded, o2.total_amount_payable_rounded),
  COALESCE(o1.insured_ic_no, o2.insured_ic_no),
  COALESCE(o1.insurer_contact_no, o2.insurer_contact_no),
  COALESCE(o1.insured_email, o2.insured_email),
  COALESCE(o1.vehicle_make_model, o2.vehicle_make_model),
  COALESCE(o1.type_of_cover, o2.type_of_cover),
  COALESCE(o1.premium, o2.premium),
  COALESCE(o1.ncd, o2.ncd),
  COALESCE(o1.total_base_premium, o2.total_base_premium),
  COALESCE(o1.total_extra_coverage, o2.total_extra_coverage),
  COALESCE(o1.gross_premium, o2.gross_premium),
  COALESCE(o1.service_tax, o2.service_tax),
  COALESCE(o1.stamp_duty, o2.stamp_duty),
  CASE
    WHEN COALESCE(o1.total_amount_payable_rounded, o2.total_amount_payable_rounded) IS NOT NULL
         AND trim(coalesce(o1.total_amount_payable_rounded, o2.total_amount_payable_rounded, '')) != ''
    THEN 'completed'
    ELSE 'pending'
  END
FROM public.insurer_billing_data b
LEFT JOIN LATERAL (
  SELECT oy.total_amount_payable_rounded, oy.insured_ic_no, oy.insurer_contact_no, oy.insured_email,
         oy.vehicle_make_model, oy.type_of_cover, oy.premium, oy.ncd, oy.total_base_premium,
         oy.total_extra_coverage, oy.gross_premium, oy.service_tax, oy.stamp_duty
  FROM public.ocr_data_table oy
  WHERE oy.company_id = b.company_id
    AND public.projects_match_imotorbike(oy.project, b.project)
    AND public.norm_vehicle(oy.vehicle_no) = public.norm_vehicle(b.vehicle_no)
    AND public.parse_ocr_date_to_iso(oy.date_issue) = to_char(COALESCE(b.issue_date, b.transaction_date::date), 'YYYY-MM-DD')
  ORDER BY oy.created_at DESC
  LIMIT 1
) o1 ON true
LEFT JOIN LATERAL (
  SELECT ox.total_amount_payable_rounded, ox.insured_ic_no, ox.insurer_contact_no, ox.insured_email,
         ox.vehicle_make_model, ox.type_of_cover, ox.premium, ox.ncd, ox.total_base_premium,
         ox.total_extra_coverage, ox.gross_premium, ox.service_tax, ox.stamp_duty
  FROM public.ocr_data_table ox
  WHERE ox.company_id = b.company_id
    AND public.projects_match_imotorbike(ox.project, b.project)
    AND public.norm_vehicle(ox.vehicle_no) = public.norm_vehicle(b.vehicle_no)
  ORDER BY ox.created_at DESC
  LIMIT 1
) o2 ON true
WHERE COALESCE(b.issue_date, b.transaction_date::date) IS NOT NULL
ORDER BY b.vehicle_no, EXTRACT(year FROM COALESCE(b.issue_date, b.transaction_date::date)),
  -- Prefer row with OCR data, then most recent issue_date
  (CASE WHEN o1.total_amount_payable_rounded IS NOT NULL AND trim(coalesce(o1.total_amount_payable_rounded, '')) != '' THEN 0 ELSE 1 END),
  (CASE WHEN o2.total_amount_payable_rounded IS NOT NULL AND trim(coalesce(o2.total_amount_payable_rounded, '')) != '' THEN 0 ELSE 1 END),
  COALESCE(b.issue_date, b.transaction_date::date) DESC NULLS LAST;
