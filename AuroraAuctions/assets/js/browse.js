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

  /**
   * Loads items from the backend based on mode:
   *  - "active": GET /api/items/active
   *  - "ended":  GET /api/items/ended
   *  - "search": GET /api/items/search?q=...
   *  - "mine":   same as "active", then filtered by sellerId on the client
   */
  async function loadItems(mode, query) {
    let path = "/items/active";
    const params = new URLSearchParams();

    switch (mode) {
      case "search":
        path = "/items/search";
        if (query) params.set("q", query);
        break;
      case "ended":
        path = "/items/ended";
        break;
      case "mine":
        // We'll filter by sellerId on the client side.
        path = "/items/active";
        break;
      case "active":
      default:
        path = "/items/active";
        break;
    }

    try {
      const fullPath = params.toString() ? `${path}?${params}` : path;
      let items = await AA.api(fullPath);

      // My Listings = items where this user is the seller
      if (mode === "mine") {
        items = items.filter((it) => it.sellerId === user.userId);
      }

      renderItems(items);
    } catch (err) {
      console.error("Failed to load items:", err);
      AA.showToast("Failed to load items", err.message || "", "error");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="aa-muted">Error loading items.</td></tr>';
      }
    }
  }

  function renderItems(items) {
    if (!tbody) return;

    if (!Array.isArray(items) || items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="aa-muted">No items found.</td></tr>';
      return;
    }

    tbody.innerHTML = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      const imgUrl = AA.getItemImageUrl(item);
      const price = item.currentPrice ?? item.startingPrice;
      const itemId = item.id ?? item.itemId;

      // If status is ENDED, show the end date; otherwise, show a countdown
      const endsText =
        item.status === "ENDED"
          ? AA.formatDateTime(item.endTime)
          : AA.timeRemaining(item.endTime);

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div class="aa-item-image" style="width:56px; flex-shrink:0;">
              <img src="${imgUrl}" alt="${item.title || "Item"}" />
            </div>
            <span>${item.title || ""}</span>
          </div>
        </td>
        <td>${AA.formatMoney(price)}</td>
        <td>${(item.auctionType || "").toUpperCase()}</td>
        <td>${(item.status || "").toUpperCase()}</td>
        <td>${endsText}</td>
        <td>
          <a class="aa-btn secondary small" href="item.html?id=${encodeURIComponent(
            itemId
          )}">View</a>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // ----------------- event wiring -----------------

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (searchInput ? searchInput.value : "").trim();
      if (!q) {
        loadItems("active");
      } else {
        loadItems("search", q);
      }
    });
  }

  if (btnActive) {
    btnActive.addEventListener("click", () => loadItems("active"));
  }
  if (btnEnded) {
    btnEnded.addEventListener("click", () => loadItems("ended"));
  }
  if (btnMine) {
    btnMine.addEventListener("click", () => loadItems("mine"));
  }

  // Initial load: active auctions
  loadItems("active");
});
