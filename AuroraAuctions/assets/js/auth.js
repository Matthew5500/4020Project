document.addEventListener("DOMContentLoaded", () => {
  AA.initNav();

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const form = new FormData(loginForm);
      const payload = {
        username: form.get("username"),
        password: form.get("password"),
      };

      try {
        const data = await AA.api("/auth/login", {
          method: "POST",
          body: payload,
        });
        if (data && data.user) {
          AA.setUser(data.user);
          window.location.href = "browse.html";
        } else {
          alert("Login failed – unexpected response.");
        }
      } catch (err) {
        alert("Login failed: " + err.message);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const form = new FormData(registerForm);

      const payload = {
        username: form.get("username"),
        password: form.get("password"),
        email: form.get("email"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        phone: form.get("phone"),
        // Address fields collected to satisfy UC1.1, but mid-tier/Python may ignore them.
        // You can extend the backend later to store them in user_addresses. 
        address: {
          street: form.get("street"),
          streetNo: form.get("streetNo"),
          city: form.get("city"),
          country: form.get("country"),
          postalCode: form.get("postalCode"),
        },
      };

      try {
        const data = await AA.api("/auth/register", {
          method: "POST",
          body: payload,
        });
        alert("Registration successful. You can log in now.");
        registerForm.reset();
      } catch (err) {
        alert("Registration failed: " + err.message);
      }
    });
  }
});