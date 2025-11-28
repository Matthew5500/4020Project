// assets/js/browse.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const tbody = document.getElementById("items-tbody");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-query");
  const btnActive = document.getElementById("btn-show-active");
  const btnEnded = document.getElementById("btn-show-ended");
  const btnMine = document.getElementById("btn-show-mine");

  let countdownTimer = null;

  function clearCountdownTimer() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function updateCountdownCells() {
    const cells = tbody.querySelectorAll("td[data-end-time]");
    const now = new Date();

    cells.forEach((cell) => {
      const iso = cell.getAttribute("data-end-time");
      if (!iso) {
        cell.textContent = "—";
        cell.classList.remove("aa-time-warning", "aa-time-danger");
        return;
      }

      const end = AA.parseAuctionTime
        ? AA.parseAuctionTime(iso)
        : new Date(iso);

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
    clearCountdownTimer();
    updateCountdownCells();
    countdownTimer = setInterval(updateCountdownCells, 1000);
  }

  function firstField(obj, names, fallback = null) {
    for (const n of names) {
      if (obj[n] !== undefined && obj[n] !== null) return obj[n];
    }
    return fallback;
  }

  async function loadItems(mode) {
    if (!tbody) return;

    clearCountdownTimer();
    tbody.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";

    try {
      let items;

      if (typeof mode === "string") {
        if (mode === "active") {
          items = await AA.api("/items/active");
        } else if (mode === "ended") {
          items = await AA.api("/items/ended");
        } else if (mode === "mine") {
          // Load all and filter based on seller/owner id
          const all = await AA.api("/items");
          items = (all || []).filter((item) => {
            const owner = firstField(item, [
              "sellerId",
              "ownerId",
              "owner_id",
              "seller_id",
            ]);
            return owner != null && String(owner) === String(user.userId);
          });
        } else {
          items = await AA.api("/items");
        }
      } else if (mode && typeof mode === "object" && mode.q) {
        items = await AA.api(`/items/search?q=${encodeURIComponent(mode.q)}`);
      } else {
        items = await AA.api("/items");
      }

      if (!Array.isArray(items) || !items.length) {
        tbody.innerHTML =
          "<tr><td colspan='7' class='aa-muted small'>No items found.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      items.forEach((item) => {
        const id = firstField(item, ["itemId", "id", "item_id"]);
        if (!id) {
          console.warn("Item missing id:", item);
          return;
        }

        const tr = document.createElement("tr");

        const title = item.title || "Auction item";
        const safeTitle = String(title).replace(/"/g, "&quot;");

        const imgSrc =
          item.imageUrl ||
          item.coverImageUrl ||
          item.cover_image_url ||
          "https://picsum.photos/seed/placeholder/120/120";

        const price =
          item.currentPrice != null ? item.currentPrice : item.startingPrice;

        const endTime = item.endTime || item.end_time || "";

        tr.innerHTML = `
          <td class="aa-col-image">
            <img src="${imgSrc}" alt="${safeTitle}" class="aa-table-thumb">
          </td>
          <td>${title}</td>
          <td>${AA.formatMoney(price)}</td>
          <td>${item.auctionType || ""}</td>
          <td>${item.status || ""}</td>
          <td data-end-time="${endTime}">${
          AA.timeRemaining ? AA.timeRemaining(endTime) : "—"
        }</td>
          <td>
            <a class="aa-btn secondary" href="item.html?id=${encodeURIComponent(
              id
            )}">View</a>
          </td>
        `;

        tbody.appendChild(tr);
      });

      startCountdownTimer();
    } catch (err) {
      console.error("Browse loadItems error:", err);
      tbody.innerHTML =
        "<tr><td colspan='7' class='aa-muted small'>Failed to load items.</td></tr>";
      if (AA.showToast) {
        AA.showToast(
          "Failed to load items: " + (err.message || "Unknown error"),
          "error"
        );
      }
    }
  }

  // Search form
  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const q = searchInput.value.trim();
      if (!q) {
        loadItems("active");
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
