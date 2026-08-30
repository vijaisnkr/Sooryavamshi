-- ============================================================================
-- Sooryavamshi Solar Projects LLP - Supabase Database Schema
-- Table: site_assessment_requests
-- Description: Stores customer enquiries submitted via "Request Free Site Assessment"
-- ============================================================================

-- 1. Create the site_assessment_requests table
CREATE TABLE IF NOT EXISTS public.site_assessment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NULL,
    pin_code TEXT NULL,
    city_location TEXT NOT NULL,
    monthly_consumption NUMERIC NOT NULL,
    kseb_consumer_number TEXT NULL,
    rooftop_details TEXT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (
        status IN (
            'New',
            'Contacted',
            'Site Visit Scheduled',
            'Site Visit Completed',
            'Proposal Sent',
            'Converted',
            'Closed'
        )
    ),
    source TEXT NOT NULL DEFAULT 'Website'
);

-- 2. Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_site_assessment_created_at 
    ON public.site_assessment_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_assessment_phone 
    ON public.site_assessment_requests (phone_number);

CREATE INDEX IF NOT EXISTS idx_site_assessment_status 
    ON public.site_assessment_requests (status);

CREATE INDEX IF NOT EXISTS idx_site_assessment_pin 
    ON public.site_assessment_requests (pin_code);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.site_assessment_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Anonymous Website Visitors
-- Allow public visitors to INSERT their site assessment request
CREATE POLICY "site_assessment_requests_anon_insert" 
    ON public.site_assessment_requests 
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- Deny public / anonymous users from reading, updating, or deleting customer records
-- (Implicitly denied by RLS when no SELECT/UPDATE/DELETE policy is granted to anon)

-- 5. RLS Policy: Authenticated Admin / Staff
-- Allow authenticated staff full access to view, update status, or manage enquiries
CREATE POLICY "site_assessment_requests_auth_select" 
    ON public.site_assessment_requests 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "site_assessment_requests_auth_update" 
    ON public.site_assessment_requests 
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "site_assessment_requests_auth_delete" 
    ON public.site_assessment_requests 
    FOR DELETE 
    TO authenticated 
    USING (true);

-- ============================================================================
-- OPTIONAL: Database Webhook / Function Trigger for Automated Email Notification
-- This trigger can invoke a Supabase Edge Function to email suryavamshisolarprojects@gmail.com
-- ============================================================================

-- Function to notify email webhook upon new assessment request
CREATE OR REPLACE FUNCTION public.notify_new_site_assessment()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload := jsonb_build_object(
        'record', row_to_json(NEW),
        'recipient', 'suryavamshisolarprojects@gmail.com',
        'subject', 'New Solar Site Assessment Request – ' || NEW.full_name
    );
    
    -- Supabase pg_net or Database Webhook can be configured to consume this payload
    -- Alternatively, Supabase Dashboard -> Database -> Webhooks can trigger the Edge Function directly.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_site_assessment ON public.site_assessment_requests;
CREATE TRIGGER trigger_new_site_assessment
    AFTER INSERT ON public.site_assessment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_site_assessment();
