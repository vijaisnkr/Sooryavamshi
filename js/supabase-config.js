/**
 * Sooryavamshi Solar Projects LLP - Supabase Configuration
 * 
 * Provides configuration parameters for connecting to Supabase.
 * Credentials can be set here directly, or supplied at runtime via
 * localStorage (e.g. via the Admin Portal Settings), or window overrides.
 * 
 * NOTE: The 'anon' key is public and protected by Row Level Security (RLS).
 * Never use or expose the Supabase 'service_role' secret key here.
 */

const SOORYAVAMSHI_SUPABASE_CONFIG = (function() {
  // Default project credentials (Replace with your live Supabase credentials)
  const DEFAULT_CONFIG = {
    url: window.__SOORYAVAMSHI_SUPABASE_URL__ || "",
    anonKey: window.__SOORYAVAMSHI_SUPABASE_ANON_KEY__ || "",
    tableName: "site_assessment_requests",
    notificationEmail: "suryavamshisolarprojects@gmail.com"
  };

  /**
   * Retrieves active Supabase configuration (localStorage override takes priority)
   */
  function getConfig() {
    const storedUrl = localStorage.getItem("sooryavamshi_supabase_url");
    const storedKey = localStorage.getItem("sooryavamshi_supabase_anon_key");

    return {
      url: (storedUrl && storedUrl.trim()) || DEFAULT_CONFIG.url,
      anonKey: (storedKey && storedKey.trim()) || DEFAULT_CONFIG.anonKey,
      tableName: DEFAULT_CONFIG.tableName,
      notificationEmail: DEFAULT_CONFIG.notificationEmail
    };
  }

  /**
   * Saves credentials into browser localStorage (useful for admin setup without modifying git files)
   */
  function setConfig(url, anonKey) {
    if (url) localStorage.setItem("sooryavamshi_supabase_url", url.trim());
    if (anonKey) localStorage.setItem("sooryavamshi_supabase_anon_key", anonKey.trim());
  }

  /**
   * Clears stored runtime credentials
   */
  function clearConfig() {
    localStorage.removeItem("sooryavamshi_supabase_url");
    localStorage.removeItem("sooryavamshi_supabase_anon_key");
  }

  /**
   * Checks if Supabase credentials have been configured
   */
  function isConfigured() {
    const cfg = getConfig();
    return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith("http"));
  }

  return {
    getConfig,
    setConfig,
    clearConfig,
    isConfigured
  };
})();
