// assets/js/common.js
window.AA = (function () {
  const API_BASE = "/api"; // via Nginx to mid-tier

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

  async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    if (options.body) {
      opts.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    const resp = await fetch(url, opts);
    if (!resp.ok) {
      let msg = `${resp.status} ${resp.statusText}`;
      try {
        const data = await resp.json();
        if (data && data.message) msg = data.message;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    if (resp.status === 204) return null;
    return resp.json();
  }

  function requireLogin() {
    const user = getUser();
    if (!user) {
      if (window.location.pathname.endsWith("index.html") ||
          window.location.pathname === "/" ) {
        // On the home page just let them stay but they will see sign in CTA.
        return null;
      }
      window.location.href = "../pages/login.html";
      return null;
    }
    return user;
  }

  function formatMoney(v) {
    if (v == null || Number.isNaN(Number(v))) return "$0.00";
    return `$${Number(v).toFixed(2)}`;
  }

  function parseAuctionTime(iso) {
    if (!iso) return null;
    if (iso instanceof Date) return iso;
    const str = String(iso).trim();
    if (!str) return null;
    let normalized = str;
    // If the backend sends UTC timestamps (ending in 'Z'),
    // treat them as local by stripping the 'Z' to avoid auctions
    // appearing to end earlier due to timezone shifts.
    if (normalized.endsWith("Z")) {
      normalized = normalized.slice(0, -1);
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function formatDateTime(iso) {
    const d = parseAuctionTime(iso);
    if (!d) return "—";
    return d.toLocaleString();
  }

  function timeRemaining(iso) {
    const end = parseAuctionTime(iso);
    if (!end) return "—";
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Ended";
    const sec = Math.floor(diff / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  }

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function initNav() {
    const user = getUser();
    const logoutBtn = document.getElementById("nav-logout");
    const loginLink = document.getElementById("nav-login");
    const heroAuthBtn = document.getElementById("hero-auth-btn");

    // Figure out correct relative path to the login page
    const inPages = window.location.pathname.includes("/pages/");
    const loginHref = inPages ? "login.html" : "pages/login.html";

    if (logoutBtn) {
      if (user) {
        logoutBtn.classList.remove("hidden");
        logoutBtn.addEventListener("click", () => {
          setUser(null);
          window.location.href = loginHref;
        });
      } else {
        logoutBtn.classList.add("hidden");
      }
    }

    if (heroAuthBtn) {
      if (user) {
        heroAuthBtn.textContent = "Log Out";
        heroAuthBtn.href = "#";
        heroAuthBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          setUser(null);
          window.location.href = loginHref;
        });
      } else {
        heroAuthBtn.textContent = "Sign In / Sign Up";
        heroAuthBtn.href = loginHref;
      }
    }

    if (loginLink) {
      if (user) {
        loginLink.textContent = `Hi, ${user.username}`;
      }
    }
  }

  async function loadFeatured() {
    const container = document.getElementById("featured-list");
    if (!container) return;
    try {
      const items = await api("/items/active");
      container.innerHTML = "";
      items.slice(0, 4).forEach((item) => {
        const card = document.createElement("article");
        card.className = "aa-card-small";

        const id = item.itemId ?? item.id ?? item.item_id;
        const imgSrc =
          item.imageUrl ||
          item.coverImageUrl ||
          item.cover_image_url ||
          "https://picsum.photos/seed/placeholder/600/400";
        const safeTitle = String(item.title || "Auction item").replace(
          /"/g,
          "&quot;"
        );

        card.innerHTML = `
          <img class="aa-card-image" src="${imgSrc}" alt="${safeTitle}" />
          <h3>${item.title}</h3>
          <p>${item.description || ""}</p>
          <p><strong>${formatMoney(
            item.currentPrice || item.startingPrice
          )}</strong></p>
          <p class="aa-muted small">
            ${item.auctionType} • ${item.status}
          </p>
          <a class="aa-btn secondary" href="pages/item.html?id=${encodeURIComponent(
            id
          )}">View</a>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML =
        '<p class="aa-muted small">Unable to load featured items.</p>';
      console.error("Featured load failed:", err.message);
    }
  }

  // --- simple toast popup ---

  let toastTimer = null;

  function showToast(message, detail, type = "info") {
    const el = document.getElementById("aa-toast");
    if (!el) return;
    const msgEl = el.querySelector(".aa-toast-message");
    const detailEl = el.querySelector(".aa-toast-detail");

    msgEl.textContent = message || "";
    detailEl.textContent = detail || "";
    el.dataset.type = type;

    el.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
  }

  return {
    api,
    getUser,
    setUser,
    requireLogin,
    formatMoney,
    parseAuctionTime,
    formatDateTime,
    timeRemaining,
    getQueryParam,
    initNav,
    loadFeatured,
    showToast,
  };
})();