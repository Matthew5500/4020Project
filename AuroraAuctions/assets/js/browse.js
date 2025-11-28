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

  const filterButtons = [btnActive, btnEnded, btnMine];

  function setFilterActive(activeBtn) {
    filterButtons.forEach((btn) => {
      if (!btn) return;
      btn.classList.remove("primary");
      btn.classList.add("ghost");
    });
    if (activeBtn) {
      activeBtn.classList.remove("ghost");
      activeBtn.classList.add("primary");
    }
  }

  function buildTimeCell(endIso) {
    const td = document.createElement("td");
    if (!endIso) {
      td.textContent = "—";
      return td;
    }

    const endTs = new Date(endIso).getTime();
    const now = Date.now();
    const diff = endTs - now;

    if (diff <= 0) {
      td.textContent = "Ended";
      td.classList.add("aa-time-danger");
      return td;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const remaining = AA.timeRemaining(endIso);

    td.textContent = remaining;

    if (mins <= 5) {
      td.classList.add("aa-time-danger");
    } else if (mins <= 10) {
      td.classList.add("aa-time-warning");
    }

    return td;
  }

  async function loadItems(mode) {
    tbody.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";

    try {
      let allItems = await AA.api("/items");
      if (!Array.isArray(allItems)) allItems = [];

      let items = allItems;

      if (mode === "active") {
        items = allItems.filter((it) => {
          const endIso = it.endTime || it.end_time;
          const ended = endIso && AA.timeRemaining(endIso) === "Ended";
          const status = (it.status || "ACTIVE").toUpperCase();
          return status === "ACTIVE" && !ended;
        });
      } else if (mode === "ended") {
        items = allItems.filter((it) => {
          const endIso = it.endTime || it.end_time;
          const ended = endIso && AA.timeRemaining(endIso) === "Ended";
          const status = (it.status || "").toUpperCase();
          return ended || status === "ENDED";
        });
      } else if (mode === "mine") {
        items = allItems.filter((it) => {
          const owner =
            it.sellerId ??
            it.ownerId ??
            it.owner_id ??
            it.seller_id ??
            null;
          return owner != null && String(owner) === String(user.userId);
        });
      } else if (mode && typeof mode === "object" && mode.q) {
        const q = mode.q.toLowerCase();
        items = allItems.filter((it) => {
          const haystack =
            (it.title || "") +
            " " +
            (it.description || "") +
            " " +
            (it.keywords || "");
          return haystack.toLowerCase().includes(q);
        });
      }

      if (!items.length) {
        tbody.innerHTML =
          "<tr><td colspan='7' class='aa-muted'>No items found.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      items.forEach((item) => {
        const id = item.itemId ?? item.id ?? item.item_id;
        if (!id) return;

        const tr = document.createElement("tr");

        // image cell
        const imgTd = document.createElement("td");
        imgTd.classList.add("aa-col-image");
        const img = document.createElement("img");
        img.className = "aa-table-thumb";
        img.src =
          item.imageUrl ||
          item.coverImageUrl ||
          item.image_url ||
          "https://picsum.photos/seed/placeholder/200/200";
        img.alt = item.title || "Listing image";
        imgTd.appendChild(img);

        const titleTd = document.createElement("td");
        titleTd.textContent = item.title || `Item #${id}`;

        const price =
          item.currentPrice ??
          item.curPrice ??
          item.current_price ??
          item.startingPrice ??
          item.start_price ??
          0;
        const priceTd = document.createElement("td");
        priceTd.textContent = AA.formatMoney(price);

        const typeTd = document.createElement("td");
        typeTd.textContent = item.auctionType || item.type || "";

        // status: if time says ended, override to ENDED
        const endIso = item.endTime || item.end_time;
        const ended = endIso && AA.timeRemaining(endIso) === "Ended";
        const statusText = ended
          ? "ENDED"
          : item.status || "ACTIVE";
        const statusTd = document.createElement("td");
        statusTd.textContent = statusText;

        const timeTd = buildTimeCell(endIso);

        const actionTd = document.createElement("td");
        actionTd.innerHTML = `
          <a class="aa-btn secondary"
             href="item.html?id=${encodeURIComponent(id)}">
            View
          </a>
        `;

        tr.appendChild(imgTd);
        tr.appendChild(titleTd);
        tr.appendChild(priceTd);
        tr.appendChild(typeTd);
        tr.appendChild(statusTd);
        tr.appendChild(timeTd);
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Failed to load items:", err);
      tbody.innerHTML =
        "<tr><td colspan='7' class='aa-muted'>Failed to load items.</td></tr>";
    }
  }

  // Search form
  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const q = searchInput.value.trim();
      if (!q) {
        setFilterActive(btnActive);
        loadItems("active");
      } else {
        setFilterActive(null); // clear highlight when doing text search
        loadItems({ q });
      }
    });
  }

  // Filter buttons
  if (btnActive) {
    btnActive.addEventListener("click", () => {
      setFilterActive(btnActive);
      loadItems("active");
    });
  }

  if (btnEnded) {
    btnEnded.addEventListener("click", () => {
      setFilterActive(btnEnded);
      loadItems("ended");
    });
  }

  if (btnMine) {
    btnMine.addEventListener("click", () => {
      setFilterActive(btnMine);
      loadItems("mine");
    });
  }

  // Initial load
  setFilterActive(btnActive);
  loadItems("active");
});
