# Google Apps Script Setup Guide – Suryavamshi Solar Projects LLP

This guide walks you through deploying the automatic Google Sheets lead synchronization script.

---

## 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Rename the spreadsheet to:
   `Suryavamshi Solar Site Assessment Leads`
3. Rename the active worksheet tab at the bottom to:
   `Site Assessment Leads`

---

## 2. Add Script Code to Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**.
2. Delete any default code in `Code.gs`.
3. Copy the complete code from [`google-apps-script/Code.gs`](./Code.gs) and paste it into `Code.gs`.
4. Click **Save** (💾 icon or `Ctrl + S`).

---

## 3. Set Up Script Properties (Webhook Secret)

1. In the left sidebar of the Apps Script Editor, click **Project Settings** (⚙️ gear icon).
2. Scroll down to **Script Properties**.
3. Click **Edit script properties** → **Add script property**:
   - **Property**: `WEBHOOK_SECRET`
   - **Value**: a long random secret of your own (never put it in this repository)
4. Click **Save script properties**.

### Changing the secret (or updating Code.gs)

The script only accepts requests that carry the secret. To change it:

1. Make a new long random secret.
2. **Project Settings > Script Properties**: set `WEBHOOK_SECRET` to the new value.
3. Paste the latest `Code.gs`, then **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**. This keeps the same `/exec` web address.
4. In Supabase, change `?secret=` at the end of the webhook URL to the new value (see `supabase/README.md`, step 6).
5. Send one test enquiry and check that the row appears in the Sheet. The script always answers with HTTP 200, so read the reply's JSON or the Apps Script **Executions** log if a row is missing.

---

## 4. Run One-Click Worksheet Setup

1. In the Apps Script Editor, switch back to the **Editor** (< > icon).
2. Select `setupSheet` from the function dropdown menu in the toolbar.
3. Click **Run**.
4. Grant permissions if prompted by Google.
5. Check your Google Sheet tab — Row 1 will automatically be styled with Navy headers (`Supabase ID` to `Rooftop Photo Path`).

---

## 5. Deploy as Web App

1. Click **Deploy** (top right) → **New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in configuration:
   - **Description**: `Suryavamshi Solar Supabase Lead Sync`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Copy the generated **Web App URL**:
   `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`

---

## 6. Verify Deployment

Paste your Web App URL into your web browser. You should see a response like:
```json
{
  "success": true,
  "status": 200,
  "message": "Suryavamshi Solar Webhook Service is active",
  "timestamp": "2026-09-10T00:39:40.000Z",
  "data": {
    "service": "Supabase to Google Sheets Lead Integration",
    "status": "online"
  }
}
```
