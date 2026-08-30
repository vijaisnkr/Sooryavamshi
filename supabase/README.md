# Supabase Backend Setup Guide – Sooryavamshi Solar Projects LLP

This guide walks you through connecting your Supabase project to the **Request Free Site Assessment** form and the **Admin Portal** on `https://suryavamshi.com`.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Set your project details:
   - **Name**: `Sooryavamshi Solar`
   - **Database Password**: Choose a secure password (save it safely).
   - **Region**: `South Asia (Mumbai)` or closest to India.
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## 2. Execute Database Schema & Security Rules

1. In your Supabase Dashboard, click on the **SQL Editor** tab in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of [`supabase/schema.sql`](./schema.sql) and paste it into the editor.
4. Click **Run** (or press `Ctrl + Enter`).

### What this creates:
- **Table**: `site_assessment_requests` with all required columns and constraints.
- **Indexes**: Fast search on `created_at`, `phone_number`, `status`, and `pin_code`.
- **Row Level Security (RLS)**:
  - **`anon` (Website visitors)**: Allowed to **INSERT only**. Cannot view, read, update, or delete any customer records.
  - **`authenticated` (Staff)**: Allowed to **SELECT**, **UPDATE**, and **DELETE** customer records when logged into the Admin Portal.
  - **Customer Data Privacy**: Customer phone numbers and details can never be queried publicly.

---

## 3. Connect Credentials to Your Website

1. In your Supabase Dashboard, click **Project Settings** (gear icon) → **API**.
2. Copy two values:
   - **Project URL** (e.g. `https://your-project-id.supabase.co`)
   - **Project API Keys** → `anon` `public` key (e.g. `eyJhbGci...`)

### Option A: Zero-Code Setup via Admin Portal (Recommended)
1. Open [`admin.html`](../admin.html) in your browser (or at `https://suryavamshi.com/admin.html`).
2. Click the **"Supabase Setup"** button in the top right.
3. Paste your **Project URL** and **Anon Key**, then click **Save & Connect**.
4. These credentials are saved in your browser's secure local storage, meaning your website works without needing to commit sensitive keys to public Git.

### Option B: Set Defaults in Code
Alternatively, you can open [`js/supabase-config.js`](../js/supabase-config.js) and insert your values into `DEFAULT_CONFIG`:
```javascript
const DEFAULT_CONFIG = {
  url: "https://your-project-id.supabase.co",
  anonKey: "eyJhbGciOi...",
  tableName: "site_assessment_requests",
  notificationEmail: "suryavamshisolarprojects@gmail.com"
};
```

---

## 4. Create an Admin Account for Staff

To sign into the Admin Portal (`admin.html`) to view and manage enquiries:
1. In Supabase Dashboard, navigate to **Authentication** → **Users**.
2. Click **Add User** → **Create user**.
3. Enter staff email (e.g. `suryavamshisolarprojects@gmail.com` or your admin email) and a strong password.
4. Toggle **Auto Confirm User?** to **ON**.
5. Click **Create User**.
6. You can now log into [`admin.html`](../admin.html) with this email and password!

---

## 5. Enable Email Notifications to `suryavamshisolarprojects@gmail.com`

When a customer submits an assessment enquiry, you can receive instant email notifications:

### Method: Resend via Supabase Edge Function (Recommended)
1. Sign up for free at [Resend](https://resend.com) and get an API key.
2. In Supabase Dashboard, navigate to **Edge Functions** → Deploy `send-site-assessment-email` (from [`supabase/functions/send-site-assessment-email`](./functions/send-site-assessment-email)).
   ```bash
   supabase functions deploy send-site-assessment-email
   supabase secrets set RESEND_API_KEY="re_123456789"
   ```
3. Set up a Database Webhook in **Database** → **Webhooks**:
   - **Name**: `Send Assessment Email`
   - **Table**: `site_assessment_requests`
   - **Events**: `INSERT`
   - **Type**: `Supabase Edge Function` → select `send-site-assessment-email`.
4. Every new enquiry will automatically trigger an email to `suryavamshisolarprojects@gmail.com` with the customer name, phone, rooftop details, and monthly consumption.

---

## 6. Testing Your Setup

1. **Website Form**:
   - Go to `https://suryavamshi.com/#contact`
   - Fill in:
     - Name: `Test Customer`
     - Phone: `9876543210`
     - City: `Cherthala`
     - Monthly Consumption: `350`
   - Click **REQUEST CONSULTATION**.
   - You should see:
     > *"Thank you! Your site assessment request has been received. A Sooryavamshi solar specialist will contact you shortly."*

2. **Admin Portal**:
   - Open `https://suryavamshi.com/admin.html`
   - Sign in with your admin credentials.
   - You will see the new lead in the table with one-click **Call** and **WhatsApp** buttons.
   - Change the status dropdown from `New` to `Contacted` or `Site Visit Scheduled`.
