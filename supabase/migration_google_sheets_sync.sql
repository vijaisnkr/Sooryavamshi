-- ============================================================================
-- Sooryavamshi Solar Projects LLP - Database Migration
-- Task: Supabase to Google Sheets Lead Integration
-- Description: Adds new columns to public.site_assessment_requests, configures
-- RLS policies, and defines the pg_net database webhook trigger function.
-- ============================================================================

-- 1. Ensure new columns exist on site_assessment_requests table
ALTER TABLE public.site_assessment_requests 
  ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS estimated_solar_capacity NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS rooftop_photo_path TEXT NULL;

-- 2. Enable RLS and recreate anon INSERT policy
ALTER TABLE public.site_assessment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_assessment_requests_anon_insert" ON public.site_assessment_requests;
DROP POLICY IF EXISTS "Allow public insert for site_assessment_requests" ON public.site_assessment_requests;
CREATE POLICY "Allow public insert for site_assessment_requests" 
    ON public.site_assessment_requests FOR INSERT TO public WITH CHECK (true);

-- 3. Enable Database Webhook schema & pg_net extension
CREATE SCHEMA IF NOT EXISTS supabase_functions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 4. Define generic Database Webhook HTTP Request function
CREATE OR REPLACE FUNCTION supabase_functions.http_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  url text := TG_ARGV[0];
  headers jsonb := COALESCE(TG_ARGV[2]::jsonb, '{"Content-Type": "application/json"}'::jsonb);
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', NULL
  );
  PERFORM net.http_post(url := url, headers := headers, body := payload);
  RETURN NEW;
END;
$$;

-- ============================================================================
-- NOTE: WEBHOOK TRIGGER CONFIGURATION
-- Option A (Recommended via Supabase Dashboard):
-- Navigate to Database -> Webhooks -> Add Webhook:
--   - Name: Google Sheets Sync Webhook
--   - Table: site_assessment_requests
--   - Events: INSERT
--   - Type: HTTP Request / Webhook
--   - Method: POST
--   - URL: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?secret=suryavamshi_sec_2026_x9k2m7
--   - HTTP Headers: Content-Type: application/json
--
-- Option B (Direct SQL Trigger):
-- Replace YOUR_DEPLOYMENT_ID below and uncomment to create the SQL trigger:
--
-- DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON public.site_assessment_requests;
-- CREATE TRIGGER trigger_google_sheets_sync
--   AFTER INSERT ON public.site_assessment_requests
--   FOR EACH ROW
--   EXECUTE FUNCTION supabase_functions.http_request(
--     'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?secret=suryavamshi_sec_2026_x9k2m7',
--     'POST',
--     '{"Content-Type": "application/json"}'
--   );
-- ============================================================================
