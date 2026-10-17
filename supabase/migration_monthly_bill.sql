-- Suryavamshi Solar Projects LLP - store the monthly bill separately from units
--
-- The enquiry form lets visitors give their monthly KSEB bill (in rupees) or their units.
-- A bill goes in monthly_bill_inr, and monthly_consumption holds the units estimated from it
-- (bill / 7.2, the calculator's Kerala tariff). Visitors who give units leave monthly_bill_inr empty.
-- Run once in the Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.site_assessment_requests
    ADD COLUMN IF NOT EXISTS monthly_bill_inr NUMERIC NULL;
