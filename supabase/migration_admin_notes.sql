-- Staff portal: private notes and a follow-up date on each enquiry.
-- Safe to run more than once. Existing rows get empty values.
ALTER TABLE public.site_assessment_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS follow_up_on DATE NULL;
