// assets/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  AA.initNav();

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // ---- LOGIN ----
  if (loginForm) {
    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const form = new FormData(loginForm);
      const username = form.get("username");
      const password = form.get("password");

      if (!username || !password) {
        AA.showToast(
          "Missing fields",
          "Please enter both username and password.",
          "error"
        );
        return;
      }

      // Be generous for backend: send both username and usernameOrEmail
      const payload = {
        usernameOrEmail: username,
        username: username,
        password: password,
      };

      try {
        const data = await AA.api("/auth/login", {
          method: "POST",
          body: payload,
        });

        if (!data || !data.user) {
          AA.showToast(
            "Login failed",
            "Server response did not include a user object.",
            "error"
          );
          console.error("Unexpected login response:", data);
          return;
        }

        AA.setUser(data.user);
        AA.showToast("Login successful", `Welcome back, ${data.user.username}!`, "success");
        window.location.href = "browse.html";
      } catch (err) {
        AA.showToast("Login failed", err.message, "error");
        console.error("Login error:", err);
      }
    });
  }

  // ---- REGISTER ----
  if (registerForm) {
    registerForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const form = new FormData(registerForm);

      const payload = {
        username: form.get("username"),
        email: form.get("email"),
        password: form.get("password"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        phone: form.get("phone"),
        // Address fields are collected for UC1.1 but not sent,
        // because current backend schema doesn't take them in RegisterRequest.
      };

      if (!payload.username || !payload.email || !payload.password) {
        AA.showToast(
          "Missing fields",
          "Username, email, and password are required.",
          "error"
        );
        return;
      }

      try {
        await AA.api("/auth/register", {
          method: "POST",
          body: payload,
        });
        AA.showToast(
          "Registration complete",
          "You can now sign in with your new account.",
          "success"
        );
        registerForm.reset();
      } catch (err) {
        AA.showToast("Registration failed", err.message, "error");
        console.error("Register error:", err);
      }
    });
  }
});
