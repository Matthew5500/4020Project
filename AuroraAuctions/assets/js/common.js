// Shared config + helpers for both pages

// When served from 100.75.75.30 with Nginx proxying /api → 100.75.75.20:8080
const API_BASE = "/api";

function buildApiUrl(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return API_BASE.replace(/\/$/, "") + path;
}

async function callApi(path, options = {}) {
  const url = buildApiUrl(path);
  const init = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body, keep as text
  }

  if (!res.ok) {
    const err = { status: res.status, data };
    console.error("API error:", err);
    throw err;
  }

  return data;
}

// ===== user storage helpers =====

function saveUser(user) {
  if (user) {
    const json = JSON.stringify(user);
    // Requirement: store in sessionStorage under "user"
    sessionStorage.setItem("user", json);
    // Mirror to localStorage for older snippets that used localStorage
    localStorage.setItem("user", json);
  } else {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
  }
}

function getStoredUser() {
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn("Failed to parse stored user");
    return null;
  }
}

function clearStoredUser() {
  saveUser(null);
}

// Show base path in header on both pages
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("apiBaseDisplay");
  if (el) el.textContent = API_BASE;
});