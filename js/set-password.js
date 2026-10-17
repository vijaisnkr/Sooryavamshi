/**
 * Suryavamshi Solar Projects LLP - Set Password Controller
 * Invite and password-reset emails from Supabase open the website with a
 * one-time sign-in in the address (#access_token=...&type=invite). The home
 * page forwards those links here, where the person chooses a password and
 * goes straight to the staff portal.
 */

(function() {
  // Read the link before the Supabase client picks it up and clears the address bar
  const link = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const linkType = link.get("type");
  const linkError = link.get("error_code") || link.get("error");
  const hadToken = link.has("access_token");

  const MIN_LENGTH = 8;
  let signedInUser = null;

  document.addEventListener("DOMContentLoaded", initSetPassword);

  async function initSetPassword() {
    setupPasswordToggles();
    document.getElementById("setPasswordForm").addEventListener("submit", handleSave);

    if (linkError) {
      clearAddress();
      showProblem(linkError === "otp_expired"
        ? "This link has expired or was already used. Links in these emails work once. Ask whoever invited you to send a new one."
        : "This link didn't work. Ask whoever invited you to send a new one.");
      return;
    }

    const client = SooryavamshiSupabase.getClient();
    if (!client) {
      showProblem("Couldn't connect. Check your internet connection and open the link from the email again.");
      return;
    }

    // The client signs in from the link in the address and then removes it
    try {
      const { data, error } = await client.auth.getSession();
      if (!error && data && data.session) signedInUser = data.session.user;
    } catch (e) {
      console.warn("Set password: session check error:", e);
    }

    if (!signedInUser) {
      clearAddress();
      showProblem(hadToken
        ? "This link has expired or was already used. Ask whoever invited you to send a new one."
        : "Open this page from the invite email. If you already have a password, sign in instead.");
      return;
    }

    if (linkType !== "invite") {
      document.getElementById("setTitle").textContent = "Choose a new password";
      document.getElementById("setLead").textContent = "Your old password stops working once you save this one.";
    }
    document.getElementById("accountEmail").textContent = signedInUser.email || "";
    document.getElementById("accountUsername").value = signedInUser.email || "";
    showState("stateForm");
    document.getElementById("newPassword").focus();
  }

  async function handleSave(e) {
    e.preventDefault();
    const password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    const submitBtn = document.getElementById("setSubmitBtn");
    const submitText = document.getElementById("setSubmitText");

    hideError();
    if (password.length < MIN_LENGTH) return showError("Use at least " + MIN_LENGTH + " characters.");
    if (password !== confirm) return showError("The two passwords don't match. Please type them again.");

    let saved = false;
    submitBtn.disabled = true;
    submitText.textContent = "Saving…";

    try {
      const { error } = await SooryavamshiSupabase.getClient().auth.updateUser({ password });
      if (error) {
        console.warn("Set password: update refused:", error.message);
        showError(friendlyError(error));
        return;
      }
      saved = true;
      showState("stateDone");
      setTimeout(() => { window.location.href = "admin.html"; }, 1200);
    } catch (err) {
      console.error("Set password: exception:", err);
      showError("Connection error. Please check your internet and try again.");
    } finally {
      if (!saved) {
        submitBtn.disabled = false;
        submitText.textContent = "Save password";
      }
    }
  }

  function friendlyError(error) {
    const code = error.code || "";
    if (code === "same_password") return "That's your current password. Please choose a different one.";
    if (code === "weak_password") return "That password is too easy to guess. Please choose a longer or less common one.";
    if (code === "session_not_found" || code === "bad_jwt" || error.status === 401 || error.status === 403) {
      return "This link has expired. Ask whoever invited you to send a new one.";
    }
    return error.message || "Couldn't save the password. Please try again.";
  }

  function setupPasswordToggles() {
    document.querySelectorAll("[data-eye-for]").forEach(function(btn) {
      const input = document.getElementById(btn.getAttribute("data-eye-for"));
      const icon = btn.querySelector("use");
      btn.addEventListener("click", function() {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        icon.setAttribute("href", show ? "#i-eye-off" : "#i-eye");
        const label = show ? "Hide password" : "Show password";
        btn.setAttribute("aria-label", label);
        btn.title = label;
      });
    });
  }

  function showState(id) {
    ["stateChecking", "stateForm", "stateDone", "stateProblem"].forEach(function(s) {
      document.getElementById(s).hidden = s !== id;
    });
  }

  function showProblem(message) {
    document.getElementById("setTitle").textContent = "This link can't be used";
    document.getElementById("setLead").textContent = "No password was changed.";
    document.getElementById("problemText").textContent = message;
    showState("stateProblem");
  }

  function showError(message) {
    document.getElementById("setAlertText").textContent = message;
    document.getElementById("setAlert").style.display = "flex";
  }

  function hideError() {
    document.getElementById("setAlert").style.display = "none";
  }

  // Keep error details from the email link out of the address bar and history
  function clearAddress() {
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  }
})();
