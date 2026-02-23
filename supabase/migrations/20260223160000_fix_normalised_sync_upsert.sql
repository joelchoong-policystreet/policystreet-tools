-- Migration: Refactor imotorbike_billing_normalised sync to use UPSERT
-- This preserves manual user updates and auto-detects 'completed' status on matches.

CREATE OR REPLACE FUNCTION public.sync_billing_to_normalised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  billing_date_iso text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.imotorbike_billing_normalised WHERE billing_id = OLD.id;
    RETURN OLD;
  END IF;

  billing_date_iso := to_char(COALESCE(NEW.issue_date, NEW.transaction_date), 'YYYY-MM-DD');
  IF billing_date_iso IS NULL OR billing_date_iso = '' THEN
    RETURN NEW;
  END IF;

  -- Perform UPSERT to preserve manual fields and stable ID
  INSERT INTO public.imotorbike_billing_normalised (
    billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
    total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
    premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty,
    verification_status
  )
  SELECT
    NEW.id,
    NEW.company_id,
    NEW.project,
    COALESCE(NEW.issue_date, NEW.transaction_date::date),
    NEW.client_name,
    NEW.vehicle_no,
    NEW.sum_insured,
    o.total_amount_payable_rounded,
    o.insured_ic_no,
    o.insurer_contact_no,
    o.insured_email,
    o.vehicle_make_model,
    o.type_of_cover,
    o.premium,
    o.ncd,
    o.total_base_premium,
    o.total_extra_coverage,
    o.gross_premium,
    o.service_tax,
    o.stamp_duty,
    CASE 
      WHEN o.total_amount_payable_rounded IS NOT NULL AND o.total_amount_payable_rounded != '' THEN 'completed'
      ELSE 'pending'
    END
  FROM public.ocr_data_table o
  WHERE o.company_id = NEW.company_id
    AND (o.project IS NOT DISTINCT FROM NEW.project
         OR ((NEW.project = 'imotorbike' OR NEW.project IS NULL) AND (o.project = 'imotorbike' OR o.project IS NULL)))
    AND public.norm_vehicle(o.vehicle_no) = public.norm_vehicle(NEW.vehicle_no)
    AND public.norm_text(o.insured_name) = public.norm_text(NEW.client_name)
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

  -- If no OCR match was found (row_count is 0 for INSERT ... SELECT WITH WHERE), handle fallback
  IF NOT FOUND THEN
    INSERT INTO public.imotorbike_billing_normalised (
      billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured, verification_status
    )
    VALUES (
      NEW.id,
      NEW.company_id,
      NEW.project,
      COALESCE(NEW.issue_date, NEW.transaction_date::date),
      NEW.client_name,
      NEW.vehicle_no,
      NEW.sum_insured,
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
$$;

CREATE OR REPLACE FUNCTION public.sync_ocr_to_normalised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  ocr_date_iso text;
BEGIN
  ocr_date_iso := public.parse_ocr_date_to_iso(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.date_issue ELSE NEW.date_issue END
  );
  IF ocr_date_iso IS NULL OR ocr_date_iso = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only perform sync for matching insurer billing rows
  FOR r IN
    SELECT b.id, b.company_id, b.project, b.issue_date, b.transaction_date, b.client_name, b.vehicle_no, b.sum_insured
    FROM public.insurer_billing_data b
    WHERE b.company_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END)
      AND (b.project IS NOT DISTINCT FROM (CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END)
           OR ((CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IN ('imotorbike') OR (CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IS NULL))
      AND public.norm_vehicle(b.vehicle_no) = public.norm_vehicle(CASE WHEN TG_OP = 'DELETE' THEN OLD.vehicle_no ELSE NEW.vehicle_no END)
      AND public.norm_text(b.client_name) = public.norm_text(CASE WHEN TG_OP = 'DELETE' THEN OLD.insured_name ELSE NEW.insured_name END)
      AND to_char(COALESCE(b.issue_date, b.transaction_date::date), 'YYYY-MM-DD') = ocr_date_iso
  LOOP
    IF TG_OP = 'DELETE' THEN
      -- If OCR is deleted, we downgrade the normalised row back to "no OCR data"
      UPDATE public.imotorbike_billing_normalised
      SET 
        total_amount_payable = NULL, ic = NULL, contact_no = NULL, email = NULL,
        vehicle_make_model = NULL, type_of_cover = NULL, premium = NULL, ncd = NULL,
        total_base_premium = NULL, total_extra_coverage = NULL, gross_premium = NULL,
        service_tax = NULL, stamp_duty = NULL,
        -- If we lose the match, we set it back to pending IF it was completed auto-detected?
        -- For now, let's keep manual status if they set it.
        verification_status = CASE 
          WHEN verification_status = 'completed' THEN 'pending'
          ELSE verification_status
        END,
        updated_at = now()
      WHERE billing_id = r.id;
    ELSE
      -- OCR added/updated: use UPSERT logic
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
        CASE 
          WHEN NEW.total_amount_payable_rounded IS NOT NULL AND NEW.total_amount_payable_rounded != '' THEN 'completed'
          ELSE 'pending'
        END
      )
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
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;
