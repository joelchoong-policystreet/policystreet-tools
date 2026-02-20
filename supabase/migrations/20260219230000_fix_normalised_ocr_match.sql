-- Fix OCR matching: match on vehicle_no + date only (drop client_name requirement).
-- Name variations between billing and OCR often prevent matches.
-- Add more date parse formats for OCR date_issue.

CREATE OR REPLACE FUNCTION public.parse_ocr_date_to_iso(d text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
AS $$
DECLARE
  s text;
  out_date date;
BEGIN
  s := trim(coalesce(d, ''));
  IF s = '' THEN RETURN NULL; END IF;
  BEGIN out_date := to_date(s, 'YYYY-MM-DD'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD/MM/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'MM/DD/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD-MM-YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD Mon YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'FMDD Mon YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD Month YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'FMDD Month YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD-Mon-YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'Mon DD, YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(split_part(s, ' ', 1), 'YYYY-MM-DD'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'YYYY-MM-DD HH24:MI:SS')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'YYYY-MM-DD HH24:MI')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_billing_to_normalised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  billing_date_iso text;
  row_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.imotorbike_billing_normalised WHERE billing_id = OLD.id;
    RETURN OLD;
  END IF;

  billing_date_iso := to_char(COALESCE(NEW.issue_date, NEW.transaction_date), 'YYYY-MM-DD');
  IF billing_date_iso IS NULL OR billing_date_iso = '' THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.imotorbike_billing_normalised WHERE billing_id = NEW.id;

  INSERT INTO public.imotorbike_billing_normalised (
    billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
    total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
    premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty
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
    o.stamp_duty
  FROM public.ocr_data_table o
  WHERE o.company_id = NEW.company_id
    AND (o.project IS NOT DISTINCT FROM NEW.project
         OR ((NEW.project = 'imotorbike' OR NEW.project IS NULL) AND (o.project = 'imotorbike' OR o.project IS NULL)))
    AND public.norm_vehicle(o.vehicle_no) = public.norm_vehicle(NEW.vehicle_no)
    AND public.parse_ocr_date_to_iso(o.date_issue) = billing_date_iso
  ORDER BY o.created_at DESC
  LIMIT 1;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count = 0 THEN
    INSERT INTO public.imotorbike_billing_normalised (
      billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured
    )
    VALUES (
      NEW.id,
      NEW.company_id,
      NEW.project,
      COALESCE(NEW.issue_date, NEW.transaction_date::date),
      NEW.client_name,
      NEW.vehicle_no,
      NEW.sum_insured
    );
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

  FOR r IN
    SELECT b.id, b.company_id, b.project, b.issue_date, b.transaction_date, b.client_name, b.vehicle_no, b.sum_insured
    FROM public.insurer_billing_data b
    WHERE b.company_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END)
      AND (b.project IS NOT DISTINCT FROM (CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END)
           OR ((CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IN ('imotorbike') OR (CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IS NULL))
      AND public.norm_vehicle(b.vehicle_no) = public.norm_vehicle(CASE WHEN TG_OP = 'DELETE' THEN OLD.vehicle_no ELSE NEW.vehicle_no END)
      AND to_char(COALESCE(b.issue_date, b.transaction_date::date), 'YYYY-MM-DD') = ocr_date_iso
  LOOP
    DELETE FROM public.imotorbike_billing_normalised WHERE billing_id = r.id;
    IF TG_OP = 'DELETE' THEN
      INSERT INTO public.imotorbike_billing_normalised (billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured)
      VALUES (r.id, r.company_id, r.project, COALESCE(r.issue_date, r.transaction_date::date), r.client_name, r.vehicle_no, r.sum_insured);
    ELSE
      INSERT INTO public.imotorbike_billing_normalised (
        billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
        total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
        premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty
      )
      VALUES (
        r.id, r.company_id, r.project, COALESCE(r.issue_date, r.transaction_date::date), r.client_name, r.vehicle_no, r.sum_insured,
        NEW.total_amount_payable_rounded, NEW.insured_ic_no, NEW.insurer_contact_no, NEW.insured_email,
        NEW.vehicle_make_model, NEW.type_of_cover, NEW.premium, NEW.ncd, NEW.total_base_premium,
        NEW.total_extra_coverage, NEW.gross_premium, NEW.service_tax, NEW.stamp_duty
      );
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Rebuild existing rows with relaxed match (vehicle + date only)
DELETE FROM public.imotorbike_billing_normalised;

INSERT INTO public.imotorbike_billing_normalised (
  billing_id, company_id, project, issue_date, client_name, vehicle_no, sum_insured,
  total_amount_payable, ic, contact_no, email, vehicle_make_model, type_of_cover,
  premium, ncd, total_base_premium, total_extra_coverage, gross_premium, service_tax, stamp_duty
)
SELECT
  b.id,
  b.company_id,
  b.project,
  COALESCE(b.issue_date, b.transaction_date::date),
  b.client_name,
  b.vehicle_no,
  b.sum_insured,
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
  o.stamp_duty
FROM public.insurer_billing_data b
LEFT JOIN LATERAL (
  SELECT o2.total_amount_payable_rounded, o2.insured_ic_no, o2.insurer_contact_no, o2.insured_email,
         o2.vehicle_make_model, o2.type_of_cover, o2.premium, o2.ncd, o2.total_base_premium,
         o2.total_extra_coverage, o2.gross_premium, o2.service_tax, o2.stamp_duty
  FROM public.ocr_data_table o2
  WHERE o2.company_id = b.company_id
    AND (o2.project IS NOT DISTINCT FROM b.project
         OR ((b.project = 'imotorbike' OR b.project IS NULL) AND (o2.project = 'imotorbike' OR o2.project IS NULL)))
    AND public.norm_vehicle(o2.vehicle_no) = public.norm_vehicle(b.vehicle_no)
    AND public.parse_ocr_date_to_iso(o2.date_issue) = to_char(COALESCE(b.issue_date, b.transaction_date::date), 'YYYY-MM-DD')
  ORDER BY o2.created_at DESC
  LIMIT 1
) o ON true
WHERE COALESCE(b.issue_date, b.transaction_date::date) IS NOT NULL;
