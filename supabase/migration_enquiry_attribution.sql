-- Enquiry source attribution for posters, ads and referral partners.
-- Safe to run more than once. Existing rows stay empty.
-- The website already sends this JSON. Until this column exists, the form
-- saves the enquiry without it (the extra field is dropped and the insert is retried).

ALTER TABLE public.site_assessment_requests
  ADD COLUMN IF NOT EXISTS attribution JSONB NULL;

COMMENT ON COLUMN public.site_assessment_requests.attribution IS
  'First-touch and last-touch campaign captured by the website: utm_source, utm_medium, utm_campaign, utm_content, ref, landing page and referrer. No name, phone or email.';
