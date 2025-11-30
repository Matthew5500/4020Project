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
    if (user) {
      sessionStorage.setItem("user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("user");
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
    let data = null;
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

  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function timeRemaining(iso) {
    if (!iso) return "—";
    const end = new Date(iso).getTime();
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
   * Place your image at:
   *   AuroraAuctions/assets/img/item-placeholder.png
   */
  AA.getItemImageUrl = function (item) {
    if (!item) {
      return "assets/img/item-placeholder.svg";
    }
  
    // Prefer coverImageUrl, but fall back to old imageUrl field if present
    const url = (item.coverImageUrl || item.imageUrl || "").trim();
  
    if (!url) {
      return "assets/img/item-placeholder.svg";
    }
    return url;
  };

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

    // Optional greeting link
    if (loginLink && user) {
      loginLink.textContent = `Hi, ${user.username}`;
    }

    // Hero button on the home page
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
        heroAuthBtn.setAttribute("href", "pages/login.html");
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
        card.className = "aa-card-small";

        const imgUrl = getItemImageUrl(item);
        const price = item.currentPrice ?? item.startingPrice;
        const itemId = item.id ?? item.itemId; // support both field names

        card.innerHTML = `
          <div class="aa-card-image aa-item-image" style="margin-bottom: 0.75rem;">
            <img src="${imgUrl}" alt="${item.title || "Item"}" />
          </div>
          <h3>${item.title || ""}</h3>
          <p>${item.description || ""}</p>
          <p><strong>${formatMoney(price)}</strong></p>
          <p class="aa-muted small">
            ${(item.auctionType || "").toUpperCase()} • ${(item.status || "").toUpperCase()}
          </p>
          <a class="aa-btn secondary" href="pages/item.html?id=${encodeURIComponent(
            itemId
          )}">View</a>
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

    if (toastTimer) clearTimeout(toastTimer);
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
