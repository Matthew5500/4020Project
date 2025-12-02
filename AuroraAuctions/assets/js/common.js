// assets/js/common.js
window.AA = (function () {
  const API_BASE = "/api"; // via Nginx to mid-tier

  // ----------------- auth helpers -----------------

  function getUser() {
    const raw = sessionStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setUser(user) {
    if (user == null) {
      sessionStorage.removeItem("user");
    } else {
      sessionStorage.setItem("user", JSON.stringify(user));
    }
  }

  function requireLogin() {
    const user = getUser();
    if (!user) {
      // All protected pages live in /pages/
      window.location.href = "../pages/login.html";
      return null;
    }
    return user;
  }

  // ----------------- API helper -----------------

  async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const init = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    if (options.body) {
      init.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, init);
    const text = await res.text();

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && data.error) ||
        (typeof data === "string" ? data : "") ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  // ----------------- formatting helpers -----------------

  function formatMoney(n) {
    if (n == null) return "—";
    return `$${Number(n).toFixed(2)}`;
  }

  // Interpret server LocalDateTime values as *local* time.
  // The backend sends values like "2025-12-02T01:24:19" that are already
  // in the server's local timezone (Eastern for your environment), so we let
  // the browser treat them as local as well.
  function parseServerDate(iso) {
    if (!iso) return null;
    const str = String(iso).trim();
    if (!str) return null;

    const d = new Date(str); // no "Z" added – treat as local time
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d;
  }

  function formatDateTime(iso) {
    const d = parseServerDate(iso);
    if (!d) return "—";
    return d.toLocaleString();
  }

  function timeRemaining(iso) {
    const d = parseServerDate(iso);
    if (!d) return "—";

    const end = d.getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return "Ended";

    const sec = Math.floor(diff / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ----------------- image helper -----------------

  /**
   * Returns the best image URL for an item:
   * - If the backend provides item.coverImageUrl, use that.
   * - Otherwise, fall back to your uploaded placeholder image.
   *
   * On pages under /pages/, we need one extra "../" to reach /assets/.
   */
  function getItemImageUrl(item) {
    const url =
      (item && (item.coverImageUrl || item.imageUrl || item.image)) || null;
    const placeholder = "assets/img/item-placeholder.png";

    const isInPages = window.location.pathname.includes("/pages/");
    const basePrefix = isInPages ? "../" : "";

    if (!url) {
      return basePrefix + placeholder;
    }

    // If it's an absolute URL (http/https), just return it
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    // Otherwise treat it as relative to the site root
    if (url.startsWith("/")) {
      return url;
    }
    return basePrefix + url;
  }

  // ----------------- navigation -----------------

  function initNav() {
    const user = getUser();
    const logoutBtn = document.getElementById("nav-logout");
    const loginLink = document.getElementById("nav-login");
    const heroAuthBtn = document.getElementById("hero-auth-btn");

    // Show/hide the top-right Logout button
    if (logoutBtn) {
      if (user) {
        logoutBtn.classList.remove("hidden");
        logoutBtn.addEventListener("click", () => {
          setUser(null);
          window.location.href = "../pages/login.html";
        });
      } else {
        logoutBtn.classList.add("hidden");
      }
    }

    // Update the header nav "Login" link if present
    if (loginLink) {
      if (user) {
        loginLink.textContent = "Logout";
        loginLink.addEventListener("click", (e) => {
          e.preventDefault();
          setUser(null);
          window.location.href = "../pages/login.html";
        });
      } else {
        loginLink.textContent = "Login";
      }
    }

    // Update the home hero button:
    //  - Logged out  => "Sign In / Sign Up" goes to login page.
    //  - Logged in   => "Log Out" which logs out then goes to login page.
    if (heroAuthBtn) {
      if (user) {
        heroAuthBtn.textContent = "Log Out";
        heroAuthBtn.addEventListener("click", (e) => {
          e.preventDefault();
          setUser(null);
          window.location.href = "pages/login.html";
        });
      } else {
        heroAuthBtn.textContent = "Sign In / Sign Up";
        heroAuthBtn.addEventListener("click", (e) => {
          e.preventDefault();
          window.location.href = "pages/login.html";
        });
      }
    }
  }

  // ----------------- featured items on home -----------------

  async function loadFeatured() {
    const container = document.getElementById("featured-list");
    if (!container) return;

    try {
      const items = await api("/items/active");
      container.innerHTML = "";

      items.slice(0, 4).forEach((item) => {
        const card = document.createElement("article");
        card.className = "aa-card";

        const price =
          item.currentPrice ??
          item.startingPrice ??
          item.price ??
          item.minimumPrice ??
          0;

        const imgUrl = getItemImageUrl(item);

        card.innerHTML = `
          <a href="pages/item.html?id=${encodeURIComponent(
            item.id ?? item.itemId
          )}" class="aa-card-link">
            <div class="aa-card-image-wrap">
              <img src="${imgUrl}" alt="${item.title || "Item"}" />
            </div>
            <div class="aa-card-body">
              <h3>${item.title || "Item"}</h3>
              <p class="aa-muted small">
                ${item.description ? item.description.substring(0, 80) : ""}
              </p>
              <p><strong>${formatMoney(price)}</strong></p>
              <p class="aa-muted small">
                ${item.auctionType || "FORWARD"} • ${item.status || "ACTIVE"}
              </p>
            </div>
          </a>
        `;

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Featured load failed:", err);
      container.innerHTML =
        '<p class="aa-muted small">Unable to load featured items.</p>';
    }
  }

  // ----------------- toast helper -----------------

  let toastTimer = null;

  function showToast(title, detail = "", type = "info") {
    let el = document.getElementById("aa-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "aa-toast";
      document.body.appendChild(el);
    }
    el.className = `aa-toast aa-toast-${type}`;
    el.innerHTML = `<strong>${title}</strong>${
      detail ? `<div>${detail}</div>` : ""
    }`;
    el.style.opacity = "1";

    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
    }, 4000);
  }

  // ----------------- public API -----------------

  return {
    api,
    getUser,
    setUser,
    requireLogin,
    formatMoney,
    formatDateTime,
    timeRemaining,
    getQueryParam,
    initNav,
    loadFeatured,
    showToast,
    getItemImageUrl,
  };
})();
