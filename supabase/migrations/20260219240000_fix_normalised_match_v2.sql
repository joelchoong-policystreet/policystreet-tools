-- Fix OCR matching v2: aggressive vehicle norm, more date formats, vehicle-only fallback.
-- JXK5096 etc may fail due to: vehicle chars (JXK-5096), date format, or project edge cases.

-- Strip ALL non-alphanumeric from vehicle (hyphens, dots, spaces, etc.)
CREATE OR REPLACE FUNCTION public.norm_vehicle(v text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT lower(regexp_replace(coalesce(trim(v), ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.parse_ocr_date_to_iso(d text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
AS $$
DECLARE
  s text;
  out_date date;
BEGIN
  s := trim(coalesce(d, ''));
  IF s = '' OR s IS NULL THEN RETURN NULL; END IF;
  BEGIN out_date := to_date(s, 'YYYY-MM-DD'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD/MM/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'D/MM/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD/M/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'D/M/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'MM/DD/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'M/DD/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD-MM-YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD Mon YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'FMDD Mon YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD Month YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'DD-Mon-YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'Mon DD, YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := (split_part(s, ' ', 1))::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'YYYY-MM-DD HH24:MI:SS')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'YYYY-MM-DD HH24:MI')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'DD/MM/YYYY HH24:MI')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := s::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
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
  proj_cond boolean;
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

  -- Try 1: vehicle + date match
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
    AND (
      (o.project IS NOT DISTINCT FROM NEW.project)
      OR ((NEW.project IS NULL OR trim(coalesce(NEW.project, '')) = '' OR NEW.project = 'imotorbike') AND (o.project IS NULL OR trim(coalesce(o.project, '')) = '' OR o.project = 'imotorbike'))
    )
    AND public.norm_vehicle(o.vehicle_no) = public.norm_vehicle(NEW.vehicle_no)
    AND public.parse_ocr_date_to_iso(o.date_issue) = billing_date_iso
  ORDER BY o.created_at DESC
  LIMIT 1;

  GET DIAGNOSTICS row_count = ROW_COUNT;

  -- Try 2 (fallback): vehicle only, same company - when date match fails
  IF row_count = 0 THEN
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
      AND (
        (o.project IS NOT DISTINCT FROM NEW.project)
        OR ((NEW.project IS NULL OR trim(coalesce(NEW.project, '')) = '' OR NEW.project = 'imotorbike') AND (o.project IS NULL OR trim(coalesce(o.project, '')) = '' OR o.project = 'imotorbike'))
      )
      AND public.norm_vehicle(o.vehicle_no) = public.norm_vehicle(NEW.vehicle_no)
    ORDER BY o.created_at DESC
    LIMIT 1;

    GET DIAGNOSTICS row_count = ROW_COUNT;
  END IF;

  -- No OCR match: insert billing data only
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

  FOR r IN
    SELECT b.id, b.company_id, b.project, b.issue_date, b.transaction_date, b.client_name, b.vehicle_no, b.sum_insured
    FROM public.insurer_billing_data b
    WHERE b.company_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END)
      AND public.norm_vehicle(b.vehicle_no) = public.norm_vehicle(CASE WHEN TG_OP = 'DELETE' THEN OLD.vehicle_no ELSE NEW.vehicle_no END)
      AND (
        ((CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IS NOT DISTINCT FROM b.project)
        OR ((b.project IN ('imotorbike') OR b.project IS NULL OR trim(coalesce(b.project, '')) = '') AND ((CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IN ('imotorbike') OR (CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END) IS NULL OR trim(coalesce(CASE WHEN TG_OP = 'DELETE' THEN OLD.project ELSE NEW.project END, '')) = ''))
      )
      AND (ocr_date_iso IS NOT NULL AND ocr_date_iso != '')
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

-- Rebuild with new matching logic (vehicle+date, then vehicle-only fallback)
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
  COALESCE(o1.stamp_duty, o2.stamp_duty)
FROM public.insurer_billing_data b
LEFT JOIN LATERAL (
  SELECT oy.total_amount_payable_rounded, oy.insured_ic_no, oy.insurer_contact_no, oy.insured_email,
         oy.vehicle_make_model, oy.type_of_cover, oy.premium, oy.ncd, oy.total_base_premium,
         oy.total_extra_coverage, oy.gross_premium, oy.service_tax, oy.stamp_duty
  FROM public.ocr_data_table oy
  WHERE oy.company_id = b.company_id
    AND ((oy.project IS NOT DISTINCT FROM b.project)
         OR ((b.project IS NULL OR trim(coalesce(b.project, '')) = '' OR b.project = 'imotorbike') AND (oy.project IS NULL OR trim(coalesce(oy.project, '')) = '' OR oy.project = 'imotorbike')))
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
    AND ((ox.project IS NOT DISTINCT FROM b.project)
         OR ((b.project IS NULL OR trim(coalesce(b.project, '')) = '' OR b.project = 'imotorbike') AND (ox.project IS NULL OR trim(coalesce(ox.project, '')) = '' OR ox.project = 'imotorbike')))
    AND public.norm_vehicle(ox.vehicle_no) = public.norm_vehicle(b.vehicle_no)
  ORDER BY ox.created_at DESC
  LIMIT 1
) o2 ON true
WHERE COALESCE(b.issue_date, b.transaction_date::date) IS NOT NULL;
