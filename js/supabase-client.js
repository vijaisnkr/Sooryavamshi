/**
 * Sooryavamshi Solar Projects LLP - Supabase Client Interface
 * Handles database operations for customer enquiries and admin portal interactions.
 */

const SooryavamshiSupabase = (function() {
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
   * 
   * @param {Object} data
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
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

    const client = getClient();

    // 2. If Supabase is not yet configured, store safely in offline cache so no lead is lost
    if (!client) {
      console.warn("Supabase project is not yet configured with URL and Anon Key. Saving enquiry to local storage fallback.");
      const fallbackList = JSON.parse(localStorage.getItem("sooryavamshi_pending_enquiries") || "[]");
      const fallbackEntry = {
        ...payload,
        id: "local-" + Date.now(),
        created_at: new Date().toISOString(),
        _offline_pending: true
      };
      fallbackList.unshift(fallbackEntry);
      localStorage.setItem("sooryavamshi_pending_enquiries", JSON.stringify(fallbackList));
      return { success: true, id: fallbackEntry.id };
    }

    // 3. Insert into Supabase table
    try {
      const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
      const { data: insertedRows, error } = await client
        .from(cfg.tableName)
        .insert([payload])
        .select("id, created_at");

      if (error) {
        console.error("Supabase insert error:", error.message);
        return { success: false, error: "Database error occurred." };
      }

      const newId = insertedRows && insertedRows[0] ? insertedRows[0].id : null;
      return { success: true, id: newId };
    } catch (err) {
      console.error("Network or execution error during Supabase submission:", err);
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
  async function getEnquiries(options = {}) {
    const client = getClient();
    if (!client) {
      // Fallback: return pending enquiries stored in localStorage
      const offline = JSON.parse(localStorage.getItem("sooryavamshi_pending_enquiries") || "[]");
      return { data: offline };
    }

    try {
      const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
      let query = client
        .from(cfg.tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (options.status && options.status !== "All") {
        query = query.eq("status", options.status);
      }

      if (options.search && options.search.trim()) {
        const term = options.search.trim();
        query = query.or(`full_name.ilike.%${term}%,phone_number.ilike.%${term}%,city_location.ilike.%${term}%,pin_code.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) {
        return { data: [], error: error.message };
      }

      // Merge any pending offline enquiries that might not have been uploaded
      const offline = JSON.parse(localStorage.getItem("sooryavamshi_pending_enquiries") || "[]");
      const combined = [...offline, ...(data || [])];

      return { data: combined };
    } catch (err) {
      return { data: [], error: err.message };
    }
  }

  /**
   * Updates enquiry status (Authenticated staff only)
   */
  async function updateEnquiryStatus(id, newStatus) {
    // If it's a local offline item
    if (typeof id === "string" && id.startsWith("local-")) {
      const list = JSON.parse(localStorage.getItem("sooryavamshi_pending_enquiries") || "[]");
      const item = list.find(x => x.id === id);
      if (item) {
        item.status = newStatus;
        localStorage.setItem("sooryavamshi_pending_enquiries", JSON.stringify(list));
        return { success: true };
      }
    }

    const client = getClient();
    if (!client) return { success: false, error: "Supabase not connected." };

    try {
      const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
      const { error } = await client
        .from(cfg.tableName)
        .update({ status: newStatus })
        .eq("id", id);

      if (error) return { success: false, error: error.message };
      return { success: true };
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
