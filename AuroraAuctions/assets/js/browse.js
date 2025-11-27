// assets/js/browse.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const tbody = document.getElementById("items-tbody");
  const searchForm = document.getElementById("search-form");
  const btnActive = document.getElementById("btn-show-active");
  const btnEnded = document.getElementById("btn-show-ended");
  const btnMine = document.getElementById("btn-show-mine");

  let countdownTimer = null;

  function updateCountdownCells() {
    if (!tbody) return;
    const cells = tbody.querySelectorAll("td[data-end-time]");
    const now = new Date();

    cells.forEach((cell) => {
      const iso = cell.getAttribute("data-end-time");
      if (!iso) {
        cell.textContent = "—";
        cell.classList.remove("aa-time-warning", "aa-time-danger");
        return;
      }
      const end = AA.parseAuctionTime ? AA.parseAuctionTime(iso) : new Date(iso);
      if (!end || isNaN(end.getTime())) {
        cell.textContent = "—";
        cell.classList.remove("aa-time-warning", "aa-time-danger");
        return;
      }

      const diffMs = end.getTime() - now.getTime();
      if (diffMs <= 0) {
        cell.textContent = "Ended";
        cell.classList.remove("aa-time-warning", "aa-time-danger");
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      cell.textContent = `${h}h ${m}m ${s}s`;

      const minutesLeft = totalSecs / 60;
      cell.classList.remove("aa-time-warning", "aa-time-danger");
      if (minutesLeft <= 5) {
        cell.classList.add("aa-time-danger");
      } else if (minutesLeft <= 10) {
        cell.classList.add("aa-time-warning");
      }
    });
  }

  function startCountdownTimer() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }
    updateCountdownCells();
    countdownTimer = setInterval(updateCountdownCells, 1000);
  }

  async function loadItems(mode) {
    // mode can be:
    //  - "active" | "ended" | "mine"
    //  - { q: "keyword" } for search
    //  - undefined for "all"

    tbody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";

    try {
      let items;

      if (typeof mode === "string") {
        if (mode === "active") {
          items = await AA.api("/items/active");
        } else if (mode === "ended") {
          items = await AA.api("/items/ended");
        } else if (mode === "mine") {
          // Load all items and filter client-side to the current seller.
          // This avoids depending on a specific query parameter name on the API.
          items = await AA.api("/items");
          items = (items || []).filter((item) => {
            const owner =
              item.sellerId ??
              item.ownerId ??
              item.owner_id ??
              item.seller_id;
            return owner != null && String(owner) === String(user.userId);
          });
        } else {
          items = await AA.api("/items");
        }
      } else if (mode && typeof mode === "object" && mode.q) {
        items = await AA.api(
          `/items/search?q=${encodeURIComponent(mode.q)}`
        );
      } else {
        items = await AA.api("/items");
      }

      if (!Array.isArray(items) || items.length === 0) {
        tbody.innerHTML =
          "<tr><td colspan='6' class='aa-muted small'>No items found.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      items.forEach((item) => {
        // Try several possible property names from the backend response
        const id = item.itemId ?? item.id ?? item.item_id;

        // If we still don't have an id, skip this item (it's malformed)
        if (!id) {
          console.warn("Item has no id field:", item);
          return;
        }

        const tr = document.createElement("tr");
        const price = item.currentPrice || item.startingPrice;

        tr.innerHTML = `
          <td>${item.title}</td>
          <td>${AA.formatMoney(price)}</td>
          <td>${item.auctionType}</td>
          <td>${item.status}</td>
          <td data-end-time="${item.endTime || ""}">${AA.timeRemaining(
          item.endTime
        )}</td>
          <td>
            <a class="aa-btn secondary"
               href="item.html?id=${encodeURIComponent(id)}">
              View
            </a>
          </td>
        `;

        tbody.appendChild(tr);
      });

      startCountdownTimer();
    } catch (err) {
      console.error("Browse loadItems error:", err);
      tbody.innerHTML =
        "<tr><td colspan='6' class='aa-muted small'>Failed to load items.</td></tr>";
      if (AA.showToast) {
        AA.showToast(
          `Failed to load items: ${err.message || "Unknown error"}`,
          "error"
        );
      }
    }
  }

  // Search form
  if (searchForm) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const q = document.getElementById("search-query").value.trim();
      if (!q) {
        loadItems();
      } else {
        loadItems({ q });
      }
    });
  }

  // Filter buttons (UC2.2 / UC2.3 / UC2.4)
  if (btnActive) {
    btnActive.addEventListener("click", () => loadItems("active"));
  }
  if (btnEnded) {
    btnEnded.addEventListener("click", () => loadItems("ended"));
  }
  if (btnMine) {
    btnMine.addEventListener("click", () => loadItems("mine"));
  }

  // Initial load: show active auctions
  loadItems("active");
});