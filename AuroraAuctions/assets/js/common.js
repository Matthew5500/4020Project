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

  function requireLogin() {
    const user = getUser();
    if (!user) {
      window.location.href = "../pages/login.html";
      return null;
    }
    return user;
  }

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

  function initNav() {
    const user = getUser();
    const logoutBtn = document.getElementById("nav-logout");
    const loginLink = document.getElementById("nav-login");

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
        card.innerHTML = `
          <h3>${item.title}</h3>
          <p>${item.description || ""}</p>
          <p><strong>${formatMoney(
            item.currentPrice || item.startingPrice
          )}</strong></p>
          <p class="aa-muted small">
            ${item.auctionType} • ${item.status}
          </p>
          <a class="aa-btn secondary" href="pages/item.html?id=${encodeURIComponent(
            item.itemId
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
  };
})();
