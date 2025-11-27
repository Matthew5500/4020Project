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

  function startCountdown() {
    if (!tbody) return;

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    const update = () => {
      const cells = tbody.querySelectorAll("td[data-end-time]");
      const now = Date.now();

      cells.forEach((cell) => {
        const iso = cell.dataset.endTime;
        if (!iso) return;

        const end = new Date(iso).getTime();
        if (Number.isNaN(end)) {
          cell.textContent = "—";
          return;
        }

        const diff = end - now;

        cell.classList.remove("aa-time-warning", "aa-time-danger");

        if (diff <= 0) {
          cell.textContent = "Ended";
          return;
        }

        const sec = Math.floor(diff / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;

        cell.textContent = `${h}h ${m}m ${s}s`;

        if (diff <= 5 * 60 * 1000) {
          cell.classList.add("aa-time-danger");
        } else if (diff <= 10 * 60 * 1000) {
          cell.classList.add("aa-time-warning");
        }
      });
    };

    update();
    countdownTimer = setInterval(update, 1000);
  }

  async function loadItems(mode) {
    // mode can be:
    //  - "active" | "ended" | "mine"
    //  - { q: "keyword" } for search
    //  - undefined for "all"

    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";

    try {
      let items;

      if (typeof mode === "string") {
        if (mode === "active") {
          items = await AA.api("/items/active");
        } else if (mode === "ended") {
          items = await AA.api("/items/ended");
        } else if (mode === "mine") {
          // FIX: My Listings now uses sellerId instead of ownerId
          items = await AA.api(
            `/items?sellerId=${encodeURIComponent(user.userId)}`
          );
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
          "<tr><td colspan='7' class='aa-muted small'>No items found.</td></tr>";
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
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
        const price = item.currentPrice || item.startingPrice || item.price;
        const endIso = item.endTime || item.end_time;
        const imgSrc =
          item.imageUrl ||
          item.coverImageUrl ||
          item.cover_image_url ||
          "https://picsum.photos/seed/aurora-thumb/120/80";

        tr.innerHTML = `
          <td>
            <img
              src="${imgSrc}"
              alt="${item.title}"
              class="aa-list-thumb"
              onerror="this.src='https://picsum.photos/seed/aurora-thumb/120/80'"
            />
          </td>
          <td>${item.title}</td>
          <td>${AA.formatMoney(price)}</td>
          <td>${item.auctionType}</td>
          <td>${item.status}</td>
          <td
            class="aa-ends-cell"
            data-end-time="${endIso || ""}"
          >
            ${AA.timeRemaining(endIso)}
          </td>
          <td>
            <a class="aa-btn secondary"
               href="item.html?id=${encodeURIComponent(id)}">
              View
            </a>
          </td>
        `;

        tbody.appendChild(tr);
      });

      // Start / restart countdown after rows are rendered
      startCountdown();
    } catch (err) {
      console.error("Browse loadItems error:", err);
      tbody.innerHTML =
        "<tr><td colspan='7' class='aa-muted small'>Failed to load items.</td></tr>";
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      if (AA.showToast) {
        AA.showToast(
          `Failed to load items: ${err.message || "Unknown error"}`,
          "error"
        );
      }
    }
  }

  // Search form (UC2.1)
  if (searchForm) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const q = document.getElementById("search-query").value.trim();
      if (q) loadItems({ q });
      else loadItems("active");
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