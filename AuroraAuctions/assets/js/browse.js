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

    const end = new Date(endIso).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      td.textContent = "Ended";
      td.classList.add("aa-time-danger");
      return td;
    }

    const sec = Math.floor(diff / 1000);
    const mins = Math.floor(sec / 60);

    const remText = AA.timeRemaining(endIso);
    td.textContent = remText;

    if (mins <= 5) {
      td.classList.add("aa-time-danger");
    } else if (mins <= 10) {
      td.classList.add("aa-time-warning");
    }

    return td;
  }

  async function loadItems(mode) {
    // mode can be:
    //  - "active" | "ended" | "mine"
    //  - { q: "keyword" } for search
    //  - undefined for "all"

    tbody.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";

    try {
      let items;

      if (typeof mode === "string") {
        if (mode === "active") {
          items = await AA.api("/items/active");
        } else if (mode === "ended") {
          items = await AA.api("/items/ended");
        } else if (mode === "mine") {
          items = await AA.api("/items/mine");
        } else {
          items = await AA.api("/items");
        }
      } else if (mode && typeof mode === "object" && mode.q) {
        items = await AA.api(`/items/search?q=${encodeURIComponent(mode.q)}`);
      } else {
        items = await AA.api("/items");
      }

      if (!Array.isArray(items) || items.length === 0) {
        tbody.innerHTML =
          "<tr><td colspan='7' class='aa-muted'>No items found.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      items.forEach((item) => {
        const id = item.itemId ?? item.id ?? item.item_id;
        if (!id) {
          console.warn("Item has no id field:", item);
          return;
        }

        const tr = document.createElement("tr");

        const price =
          item.currentPrice ??
          item.curPrice ??
          item.current_price ??
          item.startingPrice ??
          item.start_price ??
          0;

        const endIso = item.endTime;
        const status =
          item.status ||
          (endIso && AA.timeRemaining(endIso) === "Ended"
            ? "ENDED"
            : "ACTIVE");

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

        const priceTd = document.createElement("td");
        priceTd.textContent = AA.formatMoney(price);

        const typeTd = document.createElement("td");
        typeTd.textContent = item.auctionType || item.type || "";

        const statusTd = document.createElement("td");
        statusTd.textContent = status;

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
      console.error("Load items failed:", err);
      tbody.innerHTML = `<tr><td colspan='7' class='aa-muted'>Failed to load items.</td></tr>`;
    }
  }

  // Search (UC2.1)
  if (searchForm) {
    searchForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const qInput = searchForm.querySelector("input[name='q']");
      const q = qInput ? qInput.value.trim() : "";
      if (!q) {
        loadItems("active");
        setFilterActive(btnActive);
      } else {
        loadItems({ q });
        setFilterActive(null);
      }
    });
  }

  // Filter buttons (UC2.2 / UC2.3 / UC2.4)
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

  // Initial load: show active auctions
  setFilterActive(btnActive);
  loadItems("active");
});
