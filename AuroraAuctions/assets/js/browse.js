// assets/js/browse.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const tbody = document.getElementById("browse-body");
  const msg = document.getElementById("browse-message");
  const searchInput = document.getElementById("browse-search");

  const btnSearch = document.getElementById("btn-search");
  const tabActive = document.getElementById("tab-active");
  const tabEnded = document.getElementById("tab-ended");
  const tabMine = document.getElementById("tab-mine");

  const buttons = [
    { id: "btn-search", el: btnSearch, mode: "search" },
    { id: "tab-active", el: tabActive, mode: "active" },
    { id: "tab-ended", el: tabEnded, mode: "ended" },
    { id: "tab-mine", el: tabMine, mode: "mine" },
  ];

  let refreshTimerId = null;

  function setActiveButton(activeId) {
    buttons.forEach(({ id, el }) => {
      if (!el) return;
      if (id === activeId) {
        el.classList.remove("ghost");
        el.classList.add("primary");
      } else {
        el.classList.remove("primary");
        el.classList.add("ghost");
      }
    });
  }

  function formatMoney(value) {
    return AA.formatMoney(value);
  }

  /**
   * Return { label, className } where:
   *  - label: human friendly "1h 3m", "4m 10s", "Ended", etc.
   *  - className: "", "aa-time-warn", or "aa-time-danger"
   */
  function computeTimeMeta(item) {
    const rawEnd = item.endTime || item.end_time;
    const status = (item.status || "").toUpperCase();

    const end = AA.parseAuctionTime(rawEnd);
    if (!end) {
      return { label: "—", className: "" };
    }

    const now = new Date();
    const diffMs = end.getTime() - now.getTime();

    if (Number.isNaN(end.getTime()) || diffMs <= 0 || status === "ENDED") {
      return { label: "Ended", className: "aa-time-danger" };
    }

    const label = AA.timeRemaining(rawEnd);

    const minutes = diffMs / 60000;
    let className = "";
    if (minutes <= 5) {
      className = "aa-time-danger";
    } else if (minutes <= 10) {
      className = "aa-time-warn";
    }

    return { label, className };
  }

  /**
   * Decide which image URL to use for a row.
   * Supports different backend field names.
   */
  function safeImageUrl(item) {
    const url =
      (item.coverImageUrl ||
        item.cover_image_url ||
        item.imageUrl ||
        item.image_url ||
        "").trim();

    if (!url) return "../assets/img/placeholder.png";
    return url;
  }

  /**
   * Render table rows and start the countdown timer.
   */
  function renderItems(items) {
    // stop any previous countdown
    if (refreshTimerId) {
      clearInterval(refreshTimerId);
      refreshTimerId = null;
    }

    tbody.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
      msg.textContent = "No items found for this filter.";
      return;
    }

    msg.textContent = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      // --- Image column ---
      const imageTd = document.createElement("td");
      imageTd.className = "aa-col-image";
      const img = document.createElement("img");
      img.className = "aa-table-thumb";
      img.alt = item.title || "Item image";
      img.src = safeImageUrl(item);
      img.onerror = () => {
        img.src = "../assets/img/placeholder.png";
      };
      imageTd.appendChild(img);

      // --- Title ---
      const titleTd = document.createElement("td");
      titleTd.textContent = item.title || "(untitled)";

      // --- Current price (fallback to startingPrice if needed) ---
      const priceTd = document.createElement("td");
      const price =
        item.currentPrice ??
        item.current_price ??
        item.startingPrice ??
        item.starting_price ??
        0;
      priceTd.textContent = formatMoney(price);

      // --- Type ---
      const typeTd = document.createElement("td");
      typeTd.textContent = item.auctionType || item.type || "";

      // --- Status ---
      const statusTd = document.createElement("td");
      statusTd.textContent = item.status || "";

      // --- Ends / Remaining (this will tick down) ---
      const endsTd = document.createElement("td");
      endsTd.classList.add("aa-col-ends");

      const { label, className } = computeTimeMeta(item);
      endsTd.textContent = label;
      if (className) {
        endsTd.classList.add(className);
      }

      // store for countdown updates
      tr.dataset.endTime = item.endTime || item.end_time || "";
      tr.dataset.status = item.status || "";
      tr.dataset.itemId = item.itemId || item.id;

      // --- View button ---
      const viewTd = document.createElement("td");
      viewTd.style.textAlign = "right";
      const viewBtn = document.createElement("button");
      viewBtn.className = "aa-btn secondary";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", () => {
        const id = item.itemId || item.id;
        if (!id) return;
        window.location.href = `item.html?id=${encodeURIComponent(id)}`;
      });
      viewTd.appendChild(viewBtn);

      tr.appendChild(imageTd);
      tr.appendChild(titleTd);
      tr.appendChild(priceTd);
      tr.appendChild(typeTd);
      tr.appendChild(statusTd);
      tr.appendChild(endsTd);
      tr.appendChild(viewTd);

      tbody.appendChild(tr);
    });

    // live countdown for Ends/Remaining column
    refreshTimerId = setInterval(() => {
      const rows = tbody.querySelectorAll("tr");
      rows.forEach((row) => {
        const endIso = row.dataset.endTime;
        const status = row.dataset.status;
        const cell = row.querySelector(".aa-col-ends");
        if (!endIso || !cell) return;

        const { label, className } = computeTimeMeta({
          endTime: endIso,
          status,
        });

        cell.textContent = label;
        cell.classList.remove("aa-time-warn", "aa-time-danger");
        if (className) cell.classList.add(className);
      });
    }, 1000);
  }

  /**
   * Fetch items from the server according to the selected mode.
   * Uses AA.api (NOT AA.api.get).
   */
  async function fetchItems(mode) {
    let path = "/items";

    if (mode === "active") {
      path = "/items/active";
    } else if (mode === "ended") {
      path = "/items/ended";
    } else if (mode === "mine") {
      // My Listings = filter by seller / owner id
      path = `/items?ownerId=${encodeURIComponent(user.userId)}`;
    } else if (mode === "search") {
      const q = (searchInput?.value || "").trim();
      if (q) {
        path = `/items/search?q=${encodeURIComponent(q)}`;
      } else {
        path = "/items";
      }
    }

    tbody.innerHTML =
      "<tr><td colspan='7' class='aa-muted'>Loading items…</td></tr>";
    msg.textContent = "";

    try {
      const data = await AA.api(path); // <-- fixed from AA.api.get
      renderItems(data || []);
    } catch (err) {
      console.error("Failed to load items", err);
      tbody.innerHTML = "";
      msg.textContent = "Error loading items from the server.";
    }
  }

  // --- Wire up buttons / search ---

  btnSearch?.addEventListener("click", () => {
    setActiveButton("btn-search");
    fetchItems("search");
  });

  tabActive?.addEventListener("click", () => {
    setActiveButton("tab-active");
    fetchItems("active");
  });

  tabEnded?.addEventListener("click", () => {
    setActiveButton("tab-ended");
    fetchItems("ended");
  });

  tabMine?.addEventListener("click", () => {
    setActiveButton("tab-mine");
    fetchItems("mine");
  });

  // Press Enter in the search box to search
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setActiveButton("btn-search");
      fetchItems("search");
    }
  });

  // Initial load – active auctions
  setActiveButton("tab-active");
  fetchItems("active");
});
