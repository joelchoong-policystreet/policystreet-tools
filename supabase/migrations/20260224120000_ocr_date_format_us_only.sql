-- Restrict OCR date parsing to US formats only (month before day).
-- Slash formats: M/DD/YYYY, MM/DD/YYYY, M/D/YYYY only.
-- Removes DD/MM/YYYY, D/MM/YYYY, DD/M/YYYY, D/M/YYYY and other day-first formats.

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
  -- ISO / unambiguous
  BEGIN out_date := to_date(s, 'YYYY-MM-DD'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'YYYY/MM/DD'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  -- US slash formats only (month before day)
  BEGIN out_date := to_date(s, 'MM/DD/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'M/DD/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_date(s, 'M/D/YYYY'); RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Timestamps (US format)
  BEGIN out_date := to_timestamp(s, 'YYYY-MM-DD HH24:MI:SS')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'YYYY-MM-DD HH24:MI')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'MM/DD/YYYY HH24:MI')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN out_date := to_timestamp(s, 'M/DD/YYYY HH24:MI')::date; RETURN to_char(out_date, 'YYYY-MM-DD'); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END;
$$;
