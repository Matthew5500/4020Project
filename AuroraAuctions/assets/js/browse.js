// assets/js/browse.js

document.addEventListener("DOMContentLoaded", () => {
  // Require login (UC1)
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  // --- DOM references -------------------------------------------------------
  const tbody = document.getElementById("browse-body");
  const msg = document.getElementById("browse-message");
  const searchInput = document.getElementById("browse-search");

  const btnSearch = document.getElementById("btn-search");
  const tabActive = document.getElementById("tab-active");
  const tabEnded = document.getElementById("tab-ended");
  const tabMine = document.getElementById("tab-mine");

  if (!tbody) {
    console.error("Browse: #browse-body not found");
    return;
  }

  // --- Utility helpers ------------------------------------------------------

  const filterButtons = [
    { id: "btn-search", mode: "search" },
    { id: "tab-active", mode: "active" },
    { id: "tab-ended", mode: "ended" },
    { id: "tab-mine", mode: "mine" },
  ];

  function setActiveButton(activeId) {
    filterButtons.forEach(({ id }) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (id === activeId) {
        btn.classList.remove("ghost");
        btn.classList.add("primary");
      } else {
        btn.classList.remove("primary");
        btn.classList.add("ghost");
      }
    });
  }

  function safeMoney(v) {
    if (typeof AA.formatMoney === "function") {
      return AA.formatMoney(v);
    }
    return `$${Number(v || 0).toFixed(2)}`;
  }

  // Compute label + colour class for Ends / Remaining
  function computeTimeMeta(endIso, rawStatus) {
    const status = (rawStatus || "").toUpperCase();
    const info = { label: "—", className: "" };

    if (!endIso) {
      if (status === "ENDED") {
        info.label = "Ended";
        info.className = "aa-time-danger";
      }
      return info;
    }

    const end = AA.parseAuctionTime
      ? AA.parseAuctionTime(endIso)
      : new Date(endIso);

    if (!end || isNaN(end.getTime())) return info;

    const now = new Date();
    const diffMs = end - now;

    if (diffMs <= 0 || status === "ENDED") {
      info.label = "Ended";
      info.className = "aa-time-danger";
      return info;
    }

    const minutesLeft = diffMs / 60000;

    // Prefer the shared helper for consistency with item page
    if (typeof AA.timeRemaining === "function") {
      info.label = AA.timeRemaining(endIso);
    } else {
      const totalSec = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      info.label = `${h}h ${m.toString().padStart(2, "0")}m ${s
        .toString()
        .padStart(2, "0")}s`;
    }

    if (minutesLeft <= 5) info.className = "aa-time-danger";
    else if (minutesLeft <= 10) info.className = "aa-time-warning";

    return info;
  }

  // Render a list of items into the table body
  function renderItems(items) {
    tbody.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
      msg.textContent = "No items found for this filter.";
      return;
    }

    msg.textContent = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      // Image column
      const imageTd = document.createElement("td");
      imageTd.className = "aa-col-image";
      const img = document.createElement("img");
      img.className = "aa-table-thumb";
      img.alt = item.title || "Item image";

      const imgUrl = (
        item.imageUrl ||
        item.coverImageUrl ||
        item.cover_image_url ||
        ""
      ).trim();

      img.src = imgUrl || "../assets/img/placeholder.png";
      img.onerror = () => {
        img.src = "../assets/img/placeholder.png";
      };

      imageTd.appendChild(img);
      tr.appendChild(imageTd);

      // Title
      const titleTd = document.createElement("td");
      titleTd.textContent = item.title || "(untitled item)";
      tr.appendChild(titleTd);

      // Price
      const priceTd = document.createElement("td");
      const price =
        item.currentPrice ??
        item.current_price ??
        item.startingPrice ??
        item.starting_price ??
        0;
      priceTd.textContent = safeMoney(price);
      tr.appendChild(priceTd);

      // Type
      const typeTd = document.createElement("td");
      typeTd.textContent =
        item.auctionType || item.auction_type || "FORWARD";
      tr.appendChild(typeTd);

      // Status
      const statusTd = document.createElement("td");
      statusTd.textContent = item.status || "";
      tr.appendChild(statusTd);

      // Ends / Remaining
      const endsTd = document.createElement("td");
      const endIso = item.endTime || item.end_time;
      const meta = computeTimeMeta(endIso, item.status);

      endsTd.textContent = meta.label;
      if (meta.className) endsTd.classList.add(meta.className);

      // Store for live countdown updates
      if (endIso) {
        endsTd.dataset.endTime = endIso;
        endsTd.dataset.status = item.status || "";
      }

      tr.appendChild(endsTd);

      // View button
      const viewTd = document.createElement("td");
      viewTd.style.textAlign = "right";

      const viewBtn = document.createElement("button");
      viewBtn.className = "aa-btn secondary";
      viewBtn.textContent = "View";

      const id = item.itemId ?? item.id ?? item.item_id;
      if (id == null) {
        viewBtn.disabled = true;
      } else {
        viewBtn.addEventListener("click", () => {
          window.location.href = `item.html?id=${encodeURIComponent(id)}`;
        });
      }

      viewTd.appendChild(viewBtn);
      tr.appendChild(viewTd);

      tbody.appendChild(tr);
    });
  }

  // Periodically update countdown cells without re-fetching (no flicker)
  function tickCountdowns() {
    const cells = tbody.querySelectorAll("td[data-end-time]");
    cells.forEach((td) => {
      const endIso = td.dataset.endTime;
      const status = td.dataset.status || "";
      const meta = computeTimeMeta(endIso, status);

      td.textContent = meta.label;
      td.classList.remove("aa-time-warning", "aa-time-danger");
      if (meta.className) td.classList.add(meta.className);
    });
  }

  setInterval(tickCountdowns, 1000);

  // --- Fetch helpers --------------------------------------------------------

  async function fetchItems(mode) {
    let path;

    switch (mode) {
      case "active":
        path = "/items/active";
        break;
      case "ended":
        path = "/items/ended";
        break;
      case "mine":
        // My Listings: filter by the current user's ID
        path = `/items?ownerId=${encodeURIComponent(user.userId)}`;
        break;
      case "search":
      default: {
        const term = (searchInput?.value || "").trim();
        path = term
          ? `/items/search?keyword=${encodeURIComponent(term)}`
          : "/items/active";
        break;
      }
    }

    try {
      const data = await AA.api(path); // AA.api already prefixes with /api
      renderItems(data || []);
    } catch (err) {
      console.error("Failed to load items", err);
      tbody.innerHTML = "";
      msg.textContent = "Error loading items from the server.";
    }
  }

  // --- Event wiring ---------------------------------------------------------

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

  // Hitting Enter in the search box = search
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setActiveButton("btn-search");
      fetchItems("search");
    }
  });

  // Initial load: active auctions (UC2)
  setActiveButton("tab-active");
  fetchItems("active");
});
