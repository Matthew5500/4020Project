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
    { id: "btn-search", mode: "search" },
    { id: "tab-active", mode: "active" },
    { id: "tab-ended", mode: "ended" },
    { id: "tab-mine", mode: "mine" },
  ];

  function setActiveButton(activeId) {
    buttons.forEach(({ id }) => {
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

  function formatMoney(value) {
    if (value == null || isNaN(value)) return "$0.00";
    return `$${Number(value).toFixed(2)}`;
  }

  function timeDiffLabel(endTimeIso) {
    if (!endTimeIso) return "—";
    const end = new Date(endTimeIso);
    const now = new Date();
    const diffMs = end - now;

    if (isNaN(end.getTime())) return "—";
    if (diffMs <= 0) return "Ended";

    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const hh = hours.toString();
    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");

    return `${hh}h ${mm}m ${ss}s`;
  }

  function renderItems(items) {
    tbody.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
      msg.textContent = "No items found for this filter.";
      return;
    }

    msg.textContent = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      const imageTd = document.createElement("td");
      imageTd.className = "aa-col-image";
      const img = document.createElement("img");
      img.className = "aa-table-thumb";
      img.alt = item.title || "Item image";

      const url = (item.coverImageUrl || item.imageUrl || "").trim();
      img.src = url || "../assets/img/placeholder.png";
      img.onerror = () => {
        img.src = "../assets/img/placeholder.png";
      };
      imageTd.appendChild(img);

      const titleTd = document.createElement("td");
      titleTd.textContent = item.title || "(untitled)";

      const priceTd = document.createElement("td");
      priceTd.textContent = formatMoney(item.currentPrice);

      const typeTd = document.createElement("td");
      typeTd.textContent = item.auctionType || item.type || "";

      const statusTd = document.createElement("td");
      statusTd.textContent = item.status || "";

      const endsTd = document.createElement("td");
      const label = timeDiffLabel(item.endTime || item.end_time);
      endsTd.textContent = label;
      if (label === "Ended") {
        endsTd.classList.add("aa-time-danger");
      }

      const viewTd = document.createElement("td");
      viewTd.style.textAlign = "right";
      const viewBtn = document.createElement("button");
      viewBtn.className = "aa-btn secondary";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", () => {
        if (!item.itemId && !item.id) return;
        const id = item.itemId || item.id;
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
  }

  async function fetchItems(mode) {
    let url;

    switch (mode) {
      case "active":
        url = "/api/items/active";
        break;
      case "ended":
        url = "/api/items/ended";
        break;
      case "mine":
        url = "/api/items/mine";
        break;
      case "search":
      default: {
        const term = (searchInput?.value || "").trim();
        // If search is empty, default to active
        url = term
          ? `/api/items/search?keyword=${encodeURIComponent(term)}`
          : "/api/items/active";
        break;
      }
    }

    try {
      const data = await AA.api.get(url);
      renderItems(data || []);
    } catch (err) {
      console.error("Failed to load items", err);
      tbody.innerHTML = "";
      msg.textContent = "Error loading items from the server.";
    }
  }

  // Wire up buttons safely
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

  // Enter to search
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setActiveButton("btn-search");
      fetchItems("search");
    }
  });

  // Initial load – show active items
  setActiveButton("tab-active");
  fetchItems("active");
});
