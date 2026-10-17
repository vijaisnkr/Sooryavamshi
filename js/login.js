/**
 * Suryavamshi Solar Projects LLP - Admin Login Controller
 * Handles user authentication, password toggle, Supabase session checks, and redirects.
 */

(function() {
  document.addEventListener("DOMContentLoaded", initLogin);

  async function initLogin() {
    setupPasswordToggle();
    setupLoginForm();
    await checkExistingSession();
  }

  /**
   * Checks if user is already authenticated.
   * If logged in, automatically redirects to the admin portal.
   */
  async function checkExistingSession() {
    try {
      const user = await SooryavamshiSupabase.getAdminUser();

      if (user && user.email) {
        console.log("Active session detected. Redirecting to Admin Dashboard...");
        window.location.href = "admin.html";
      } else {
        localStorage.removeItem("sooryavamshi_admin_session");
      }
    } catch (e) {
      console.warn("Session check error:", e);
    }
  }

  /**
   * Toggles password field visibility between text & password
   */
  function setupPasswordToggle() {
    const toggleBtn = document.getElementById("togglePasswordBtn");
    const passwordInput = document.getElementById("adminPassword");
    const icon = document.getElementById("passwordToggleIcon");

    if (toggleBtn && passwordInput && icon) {
      toggleBtn.addEventListener("click", function() {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        icon.setAttribute("href", isPassword ? "#i-eye-off" : "#i-eye");
        const label = isPassword ? "Hide password" : "Show password";
        toggleBtn.setAttribute("aria-label", label);
        toggleBtn.title = label;
      });
    }
  }

  /**
   * Sets up login form submit listener
   */
  function setupLoginForm() {
    const loginForm = document.getElementById("adminLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }
  }

  /**
   * Processes admin sign in
   */
  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const alertEl = document.getElementById("loginAlert");
    const alertText = document.getElementById("loginAlertText");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const btnSubmitText = document.getElementById("btnSubmitText");

    let redirecting = false;

    // Reset alert state
    alertEl.style.display = "none";
    submitBtn.disabled = true;
    btnSubmitText.textContent = "Signing in…";

    try {
      // 1. Attempt Supabase Auth Sign In
      const { data, error } = await SooryavamshiSupabase.signInAdmin(email, password);

      if (!error && data && data.user) {
        // Store explicit session flag for fast verification
        localStorage.setItem("sooryavamshi_admin_session", JSON.stringify({
          email: data.user.email,
          authType: "supabase",
          timestamp: Date.now()
        }));

        redirecting = true;
        btnSubmitText.textContent = "Opening dashboard…";
        setTimeout(() => {
          window.location.href = "admin.html";
        }, 500);
        return;
      }

      // 2. Supabase Auth refused the sign-in
      console.warn("Supabase Auth sign-in result:", error ? error.message : "No user data returned");

      // Display specific failure message
      let errMsg = "Invalid email or password. Please verify your credentials.";
      if (error && error.message) {
        errMsg = error.message;
      }
      showError(errMsg);

    } catch (err) {
      console.error("Login process exception:", err);
      showError("Connection error. Please check your Supabase credentials or network connection.");
    } finally {
      if (!redirecting) {
        submitBtn.disabled = false;
        btnSubmitText.textContent = "Sign in";
      }
    }
  }

  function showError(message) {
    const alertEl = document.getElementById("loginAlert");
    const alertText = document.getElementById("loginAlertText");
    if (alertEl && alertText) {
      alertText.textContent = message;
      alertEl.style.display = "flex";
    }
  }
})();
