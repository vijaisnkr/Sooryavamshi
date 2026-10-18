/**
 * Suryavamshi Solar Projects LLP - Supabase Client Interface
 * Handles database operations for customer enquiries and admin portal interactions.
 */

window.SooryavamshiSupabase = (function() {
  let clientInstance = null;

  /**
   * Lazily initializes and returns the Supabase client instance
   */
  function getClient() {
    if (clientInstance) return clientInstance;

    if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
      // Public form pages no longer load the SDK; their forms save through the REST fallback
      return null;
    }

    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
    if (!cfg.url || !cfg.anonKey || !cfg.url.startsWith("http")) {
      return null;
    }

    try {
      clientInstance = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return clientInstance;
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err.message);
      return null;
    }
  }

  /**
   * Resets cached client instance (e.g. after config update)
   */
  function resetClient() {
    clientInstance = null;
    return getClient();
  }

  /**
   * Submits a customer site assessment request
   * Uses native fetch POST to guarantee operation even if CDN script is blocked by adblockers.
   * 
   * @param {Object} data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function submitSiteAssessmentRequest(data) {
    // 1. Sanitize & prepare payload
    const payload = {
      full_name: (data.full_name || "").trim(),
      phone_number: (data.phone_number || "").trim(),
      email: data.email && data.email.trim() ? data.email.trim().toLowerCase() : null,
      pin_code: data.pin_code && data.pin_code.trim() ? data.pin_code.trim() : null,
      city_location: (data.city_location || "").trim(),
      monthly_consumption: typeof data.monthly_consumption === "number" && !isNaN(data.monthly_consumption) ? 
        data.monthly_consumption : 
        (parseFloat(data.monthly_consumption) || 0),
      monthly_bill_inr: typeof data.monthly_bill_inr === "number" && data.monthly_bill_inr > 0 ? data.monthly_bill_inr : null,
      kseb_consumer_number: data.kseb_consumer_number && data.kseb_consumer_number.trim() ?
        data.kseb_consumer_number.trim() : null,
      rooftop_details: data.rooftop_details && data.rooftop_details.trim() ? 
        data.rooftop_details.trim() : null,
      preferred_contact_time: data.preferred_contact_time && data.preferred_contact_time.trim() ? 
        data.preferred_contact_time.trim() : null,
      estimated_solar_capacity: typeof data.estimated_solar_capacity === "number" && !isNaN(data.estimated_solar_capacity) ? 
        data.estimated_solar_capacity : 
        (parseFloat(data.estimated_solar_capacity) || null),
      rooftop_photo_path: data.rooftop_photo_path && data.rooftop_photo_path.trim() ? 
        data.rooftop_photo_path.trim() : null,
      status: "New",
      source: "Website"
    };

    // Basic assertion on required fields (full_name, phone_number, city_location)
    if (!payload.full_name || !payload.phone_number || !payload.city_location) {
      return { success: false, error: "Validation failed: Please enter Full Name, Phone Number, and Location." };
    }

    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();

    // 2. Try official Supabase Client SDK first
    const client = getClient();
    if (client && client.from) {
      try {
        const { data, error } = await client.from(cfg.tableName).insert([payload]);
        if (!error) {
          console.log("Successfully inserted record via Supabase SDK:", payload.full_name);
          return { success: true };
        } else {
          console.warn("Supabase SDK insert notice, attempting REST fallback:", error.message);
        }
      } catch (sdkErr) {
        console.warn("Supabase SDK exception:", sdkErr);
      }
    }

    // 3. Fallback to direct REST fetch
    try {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tableName}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "apikey": cfg.anonKey,
          "Authorization": `Bearer ${cfg.anonKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 201 || response.status === 200 || response.status === 204) {
        console.log("Successfully inserted record via REST fetch:", payload.full_name);
        return { success: true };
      } else {
        const errorText = await response.text();
        console.warn("Supabase REST insert response:", response.status, errorText);
        // Not saved (e.g. the project is paused): report it so the form can offer WhatsApp instead
        return { success: false, error: `Save failed (${response.status})` };
      }
    } catch (err) {
      console.warn("Network notice during Supabase submission:", err);
      return { success: false, error: "Could not reach the database" };
    }
  }

  /**
   * Fetches enquiries for authenticated admin
   * 
   * @param {Object} [options]
   * @param {string} [options.status]
   * @param {string} [options.search]
   * @returns {Promise<{data: Array, error?: string}>}
   */
  /**
   * Fetches enquiries using native fetch (with user session token when logged in)
   * 
   * @param {Object} [options]
   * @returns {Promise<{data: Array, error?: string}>}
   */
  async function getEnquiries(options = {}) {
    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
    let authHeader = `Bearer ${cfg.anonKey}`;

    const client = getClient();
    if (client && client.auth) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (e) {}
    }

    try {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tableName}?select=*&order=created_at.desc`;
      
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "apikey": cfg.anonKey,
          "Authorization": authHeader,
          "Cache-Control": "no-cache"
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { data: data || [] };
      } else {
        console.error("Fetch enquiries failed:", response.status);
        return { data: [], error: `Status ${response.status}` };
      }
    } catch (err) {
      console.error("Error fetching enquiries:", err);
      return { data: [], error: "Could not reach the database" };
    }
  }

  /**
   * Updates fields on one enquiry (status, admin_notes, follow_up_on).
   * Asks for the changed row back so a save that RLS silently skipped
   * (expired sign-in) is reported as a failure instead of a success.
   */
  async function updateEnquiry(id, fields) {
    if (typeof id === "string" && id.startsWith("local-")) {
      return { success: true };
    }

    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
    let authHeader = `Bearer ${cfg.anonKey}`;

    const client = getClient();
    if (client && client.auth) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (e) {}
    }

    try {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tableName}?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "apikey": cfg.anonKey,
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(fields)
      });

      if (!response.ok) {
        return { success: false, error: `Status ${response.status}` };
      }
      const rows = await response.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: "Not saved. Please sign in again." };
      }
      return { success: true, row: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates enquiry status
   */
  async function updateEnquiryStatus(id, newStatus) {
    return updateEnquiry(id, { status: newStatus });
  }

  /**
   * Deletes an enquiry (Authenticated staff only)
   */
  async function deleteEnquiry(id) {
    if (typeof id === "string" && id.startsWith("local-")) {
      let list = JSON.parse(localStorage.getItem("sooryavamshi_pending_enquiries") || "[]");
      list = list.filter(x => x.id !== id);
      localStorage.setItem("sooryavamshi_pending_enquiries", JSON.stringify(list));
      return { success: true };
    }

    const client = getClient();
    if (!client) return { success: false, error: "Supabase not connected." };

    try {
      const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
      const { error } = await client
        .from(cfg.tableName)
        .delete()
        .eq("id", id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Authentication Helpers for Admin Staff
   */
  async function signInAdmin(email, password) {
    const client = getClient();
    if (!client) return { error: { message: "Supabase credentials are not configured yet." } };
    return await client.auth.signInWithPassword({ email, password });
  }

  async function signOutAdmin() {
    const client = getClient();
    if (!client) return { error: null };
    return await client.auth.signOut();
  }

  async function getAdminUser() {
    const client = getClient();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
  }

  return {
    getClient,
    resetClient,
    submitSiteAssessmentRequest,
    getEnquiries,
    updateEnquiry,
    updateEnquiryStatus,
    deleteEnquiry,
    signInAdmin,
    signOutAdmin,
    getAdminUser
  };
})();
