// Logic specific to index.html (login / register)

let toastEl, toastTitleEl, toastTextEl;

function showToast(title, text, ms = 3500) {
  toastTitleEl.textContent = title;
  toastTextEl.textContent = text;
  toastEl.classList.add("show");
  if (ms > 0) {
    setTimeout(() => toastEl.classList.remove("show"), ms);
  }
}

function authLog(message) {
  const logEl = document.getElementById("authLogText");
  const ts = new Date().toISOString();
  logEl.textContent += `[${ts}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  toastEl = document.getElementById("toast");
  toastTitleEl = document.getElementById("toastTitle");
  toastTextEl = document.getElementById("toastText");
  document.getElementById("toastClose").addEventListener("click", () =>
    toastEl.classList.remove("show")
  );

  // If user already logged in, go straight to app.html
  const existing = getStoredUser();
  if (existing && existing.userId) {
    window.location.href = "app.html";
    return;
  }

  // Tab switching
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  });

  tabRegister.addEventListener("click", () => {
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  });

  // Health check
  document.getElementById("healthBtn").addEventListener("click", async () => {
    try {
      const data = await callApi("/health"); // → /api/health (fixed)
      authLog("Health OK: " + JSON.stringify(data));
      showToast("Health OK", String(data));
    } catch (err) {
      authLog("Health failed: " + JSON.stringify(err.data));
      showToast("Health failed", JSON.stringify(err.data) || "Error");
    }
  });

  // Register
  document.getElementById("registerBtn").addEventListener("click", async () => {
    const body = {
      username: document.getElementById("regUsername").value.trim(),
      password: document.getElementById("regPassword").value,
      email: document.getElementById("regEmail").value.trim(),
      firstName: document.getElementById("regFirstName").value.trim(),
      lastName: document.getElementById("regLastName").value.trim(),
      phone: document.getElementById("regPhone").value.trim(),
    };

    if (!body.username || !body.password || !body.email) {
      showToast("Missing fields", "Username, password and email are required.");
      authLog("Register: missing required fields");
      return;
    }

    try {
      const data = await callApi("/auth/register", {
        method: "POST",
        body,
      });
      authLog("Register OK: " + JSON.stringify(data));
      showToast("Account created", "You can now sign in.");
      tabLogin.click();
    } catch (err) {
      authLog("Register failed: " + JSON.stringify(err.data));
      showToast(
        "Register failed",
        (err.data && err.data.error) || JSON.stringify(err.data) || "Unknown error"
      );
    }
  });

  // Login
  document.getElementById("loginBtn").addEventListener("click", async () => {
    const body = {
      username: document.getElementById("loginUsername").value.trim(),
      password: document.getElementById("loginPassword").value,
    };

    if (!body.username || !body.password) {
      showToast("Missing login info", "Enter username and password.");
      authLog("Login: missing username or password");
      return;
    }

    try {
      const data = await callApi("/auth/login", {
        method: "POST",
        body,
      });
      if (data && data.status === "ok" && data.user) {
        saveUser(data.user); // sessionStorage.setItem("user", JSON.stringify(user))
        authLog("Login successful for userId=" + data.user.userId);
        showToast("Welcome", "Signed in as " + data.user.username, 1500);
        setTimeout(() => (window.location.href = "app.html"), 900);
      } else {
        authLog("Login error: no user in response");
        showToast("Login error", "Response did not contain a user object.");
      }
    } catch (err) {
      authLog("Login failed: " + JSON.stringify(err.data));
      showToast(
        "Login failed",
        (err.data && err.data.error) || JSON.stringify(err.data) || "Invalid credentials?"
      );
    }
  });
});