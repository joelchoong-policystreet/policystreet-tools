
-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by everyone"
  ON public.departments FOR SELECT USING (true);

-- Companies table (a company belongs to a department)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, department_id)
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone"
  ON public.companies FOR SELECT USING (true);

-- Issuances table with all the detail columns from the CSV
CREATE TABLE public.issuances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchased_date TIMESTAMP WITH TIME ZONE,
  plate_no TEXT,
  customer TEXT,
  instant_quotation TEXT,
  insurer TEXT,
  coverage TEXT,
  time_lapsed TEXT,
  partner TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuances are viewable by everyone"
  ON public.issuances FOR SELECT USING (true);

CREATE POLICY "Issuances can be inserted by authenticated users"
  ON public.issuances FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Issuances can be updated by authenticated users"
  ON public.issuances FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Issuances can be deleted by authenticated users"
  ON public.issuances FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed the initial department and company
INSERT INTO public.departments (name) VALUES ('Affiliates');

INSERT INTO public.companies (name, department_id)
VALUES ('iMotorbike', (SELECT id FROM public.departments WHERE name = 'Affiliates'));

-- Index for filtering issuances by company
CREATE INDEX idx_issuances_company_id ON public.issuances(company_id);
CREATE INDEX idx_issuances_purchased_date ON public.issuances(purchased_date);
