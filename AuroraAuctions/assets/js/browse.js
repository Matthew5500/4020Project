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
  const searchButton = searchForm ? searchForm.querySelector('button[type="submit"]') : null;

  // Global timer handle for the countdown loop so we can reset it
  let countdownTimer = null;

  /**
   * Sets the visual "selected" state for the filter buttons.
   * We swap their style between `aa-btn secondary` (highlighted)
   * and `aa-btn ghost` (muted).
   */
  function setFilterSelected(mode) {
    const allButtons = [searchButton, btnActive, btnEnded, btnMine];
    allButtons.forEach((btn) => {
      if (!btn) return;
      // keep base .aa-btn class, just toggle secondary/ghost
      btn.classList.remove("secondary", "ghost");
      btn.classList.add("ghost");
    });

    let selectedBtn = null;
    if (mode === "search") selectedBtn = searchButton;
    else if (mode === "active") selectedBtn = btnActive;
    else if (mode === "ended") selectedBtn = btnEnded;
    else if (mode === "mine") selectedBtn = btnMine;

    if (selectedBtn) {
      selectedBtn.classList.remove("ghost");
      selectedBtn.classList.add("secondary");
    }
  }

  /**
   * Loads items from the backend based on mode:
   *  - "active": GET /api/items/active
   *  - "ended":  GET /api/items/ended
   *  - "search": GET /api/items/search?q=...
   *  - "mine":   GET /api/items, then filter by sellerId on the client
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
        path = "/items"; // all items, will filter by sellerId client-side
        break;
      case "active":
      default:
        path = "/items/active";
        break;
    }

    try {
      const fullPath = params.toString() ? `${path}?${params}` : path;
      let items = await AA.api(fullPath);

      if (mode === "mine") {
        items = items.filter((it) => it.sellerId === user.userId);
      }

      renderItems(items);
      setupCountdown(); // start / restart live countdown after rendering
    } catch (err) {
      console.error("Failed to load items:", err);
      AA.showToast("Failed to load items", err.message || "", "error");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="aa-muted">Error loading items.</td></tr>';
      }
      // stop any running countdown if we had an error
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
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

      // Build the Ends / Remaining cell content
      const isEnded = item.status === "ENDED";
      let endsHtml = "—";

      if (item.endTime) {
        if (isEnded) {
          // For ended auctions, just show the final end date/time
          endsHtml = AA.formatDateTime(item.endTime);
        } else {
          // For active auctions, show a live countdown
          const initial = AA.timeRemaining(item.endTime);
          endsHtml = `<span class="aa-end-countdown" data-end-time="${item.endTime}">${initial}</span>`;
        }
      }

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
        <td>${endsHtml}</td>
        <td>
          <a class="aa-btn secondary small" href="item.html?id=${encodeURIComponent(
            itemId
          )}">View</a>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  /**
   * Sets up a 1-second interval to update all countdown cells.
   * Changes color at:
   *  - <= 10 minutes  -> orange
   *  - <= 5 minutes   -> red
   */
  function setupCountdown() {
    // Clear any previous countdown loop
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    const spans = document.querySelectorAll(".aa-end-countdown");
    if (spans.length === 0) {
      return; // nothing to count down
    }

    function tick() {
      const now = Date.now();

      spans.forEach((span) => {
        const iso = span.dataset.endTime;
        if (!iso) return;

        const end = new Date(iso).getTime();
        const diff = end - now;

        if (diff <= 0) {
          // Auction is over
          span.textContent = "Ended";
          span.style.color = ""; // reset any color
          return;
        }

        // Update the text (Hh Mm Ss)
        const sec = Math.floor(diff / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        span.textContent = `${h}h ${m}m ${s}s`;

        // Default color
        span.style.color = "";

        // <= 5 min -> red
        if (diff <= 5 * 60 * 1000) {
          span.style.color = "#f56565";
        }
        // between 5 and 10 min -> orange
        else if (diff <= 10 * 60 * 1000) {
          span.style.color = "#f6ad55";
        }
      });
    }

    // Run once immediately so it looks live right away,
    // then every second.
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ----------------- event wiring -----------------

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (searchInput ? searchInput.value : "").trim();
      if (!q) {
        setFilterSelected("active");
        loadItems("active");
      } else {
        setFilterSelected("search");
        loadItems("search", q);
      }
    });
  }

  if (btnActive) {
    btnActive.addEventListener("click", () => {
      setFilterSelected("active");
      loadItems("active");
    });
  }
  if (btnEnded) {
    btnEnded.addEventListener("click", () => {
      setFilterSelected("ended");
      loadItems("ended");
    });
  }
  if (btnMine) {
    btnMine.addEventListener("click", () => {
      setFilterSelected("mine");
      loadItems("mine");
    });
  }

  // Initial load: active auctions, highlight Active filter
  setFilterSelected("active");
  loadItems("active");
});
