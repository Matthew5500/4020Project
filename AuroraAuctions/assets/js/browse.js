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

  let currentFilter = "active"; // "active" | "ended" | "mine" | "search"
  let currentQuery = "";
  let countdownTimer = null;

  function setFilterSelected(mode) {
    currentFilter = mode;
    if (btnActive) {
      btnActive.classList.toggle("secondary", mode === "active");
      btnActive.classList.toggle("ghost", mode !== "active");
    }
    if (btnEnded) {
      btnEnded.classList.toggle("secondary", mode === "ended");
      btnEnded.classList.toggle("ghost", mode !== "ended");
    }
    if (btnMine) {
      btnMine.classList.toggle("secondary", mode === "mine");
      btnMine.classList.toggle("ghost", mode !== "mine");
    }
    // Search has no dedicated button, but we could style the search button
    if (searchButton) {
      const isSearch = mode === "search";
      searchButton.classList.toggle("secondary", isSearch);
      searchButton.classList.toggle("ghost", !isSearch);
    }
  }

  function renderRows(items) {
    tbody.innerHTML = "";

    if (!items || items.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="aa-muted">No items found.</td>`;
      tbody.appendChild(tr);
      return;
    }

    items.forEach((item) => {
      const tr = document.createElement("tr");

      const id = item.id ?? item.itemId ?? item.item_id ?? item.ID ?? item.ITEM_ID;
      const price =
        item.currentPrice ??
        item.startingPrice ??
        item.price ??
        item.minimumPrice ??
        0;

      const endTime = item.endTime || item.end_time || item.END_TIME || null;

      const status = item.status || item.STATUS || "ACTIVE";
      const auctionType = item.auctionType || item.AUCTION_TYPE || "FORWARD";

      // Ends/Remaining column content
      let endsHtml = "—";
      if (endTime) {
        if (status === "ENDED") {
          // Show fixed end time only
          endsHtml = AA.formatDateTime(endTime);
        } else {
          // For active auctions, show a live countdown
          const initial = AA.timeRemaining(endTime);
          endsHtml = `<span class="aa-end-countdown" data-end-time="${endTime}">${initial}</span>`;
        }
      }

      const imgUrl = AA.getItemImageUrl(item);
      const title = item.title || "Item";

      tr.innerHTML = `
        <td>
          <div class="aa-item-cell">
            <div class="aa-item-thumb">
              <img src="${imgUrl}" alt="${title}" />
            </div>
            <div class="aa-item-main">
              <div class="aa-item-title">${title}</div>
              <div class="aa-item-desc aa-muted small">
                ${item.description ? item.description.substring(0, 80) : ""}
              </div>
            </div>
          </div>
        </td>
        <td>${auctionType}</td>
        <td>${status}</td>
        <td>${AA.formatMoney(price)}</td>
        <td>${endsHtml}</td>
        <td>
          <a href="item.html?id=${encodeURIComponent(
            id
          )}" class="aa-btn aa-btn-sm secondary">View</a>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  async function loadItems(mode, query = "") {
    tbody.innerHTML = `<tr><td colspan="6" class="aa-muted">Loading…</td></tr>`;

    try {
      let items = [];
      if (mode === "active") {
        items = await AA.api("/items/active");
      } else if (mode === "ended") {
        items = await AA.api("/items/ended");
      } else if (mode === "search") {
        items = await AA.api(`/items/search?q=${encodeURIComponent(query)}`);
      } else if (mode === "mine") {
        // Load all then filter by sellerId = current user
        const all = await AA.api("/items");
        items = all.filter((it) => {
          const sellerId =
            it.sellerId ??
            it.seller_id ??
            it.ownerId ??
            it.owner_id ??
            it.userId ??
            it.user_id;
          return Number(sellerId) === Number(user.userId);
        });
      }

      renderRows(items);
      setupCountdown();
    } catch (err) {
      console.error("Failed to load items:", err);
      tbody.innerHTML = `<tr><td colspan="6" class="aa-muted">Failed to load items.</td></tr>`;
      AA.showToast(
        "Failed to load items",
        err && err.message ? err.message : String(err),
        "error"
      );
    }
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

        // Interpret endTime as local time (same convention as AA.parseServerDate)
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return;

        const end = d.getTime();
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
