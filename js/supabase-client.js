/**
 * Sooryavamshi Solar Projects LLP - Supabase Client Interface
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
      console.warn("Supabase JS SDK (@supabase/supabase-js) is not loaded on this page.");
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
      monthly_consumption: typeof data.monthly_consumption === "number" ? 
        data.monthly_consumption : 
        parseFloat(data.monthly_consumption) || null,
      kseb_consumer_number: data.kseb_consumer_number && data.kseb_consumer_number.trim() ? 
        data.kseb_consumer_number.trim() : null,
      rooftop_details: data.rooftop_details && data.rooftop_details.trim() ? 
        data.rooftop_details.trim() : null,
      status: "New",
      source: "Website"
    };

    // Basic assertion on required fields
    if (!payload.full_name || !payload.phone_number || !payload.city_location || payload.monthly_consumption === null) {
      return { success: false, error: "Validation failed: missing required fields." };
    }

    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();

    // 2. Execute via direct native fetch to guarantee compatibility with all adblockers & browsers
    try {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tableName}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "apikey": cfg.anonKey,
          "Authorization": `Bearer ${cfg.anonKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 201) {
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error("Supabase REST insert error:", response.status, errorText);
        return { success: false, error: `Server response status ${response.status}` };
      }
    } catch (err) {
      console.error("Network error during Supabase submission:", err);
      return { success: false, error: "Network communication failure." };
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
   * Fetches enquiries using native fetch
   * 
   * @param {Object} [options]
   * @returns {Promise<{data: Array, error?: string}>}
   */
  async function getEnquiries(options = {}) {
    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
    try {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tableName}?select=*&order=created_at.desc`;
      
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "apikey": cfg.anonKey,
          "Authorization": `Bearer ${cfg.anonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { data: data || [] };
      } else {
        console.error("Fetch enquiries failed:", response.status);
        return { data: [] };
      }
    } catch (err) {
      console.error("Error fetching enquiries:", err);
      return { data: [] };
    }
  }

  /**
   * Updates enquiry status using native fetch
   */
  async function updateEnquiryStatus(id, newStatus) {
    if (typeof id === "string" && id.startsWith("local-")) {
      return { success: true };
    }

    const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
    try {
      const endpoint = `${cfg.url}/rest/v1/${cfg.tableName}?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "apikey": cfg.anonKey,
          "Authorization": `Bearer ${cfg.anonKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok || response.status === 204) {
        return { success: true };
      } else {
        return { success: false, error: `Status ${response.status}` };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
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
    updateEnquiryStatus,
    deleteEnquiry,
    signInAdmin,
    signOutAdmin,
    getAdminUser
  };
})();
