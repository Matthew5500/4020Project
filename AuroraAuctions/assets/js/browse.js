// assets/js/browse.js
document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const elSearchInput = document.getElementById("search-keyword");
  const elTableBody = document.getElementById("items-tbody");

  // --- find the four filter buttons by their visible label (robust to ID changes) ---
  const allButtons = Array.from(document.querySelectorAll("button, a"));
  const findBtn = (label) =>
    allButtons.find(
      (b) => b.textContent && b.textContent.trim().toLowerCase() === label
    );

  const elBtnSearch = findBtn("search");
  const elBtnActive = findBtn("active");
  const elBtnEnded = findBtn("ended");
  const elBtnMine = findBtn("my listings");

  let currentTab = "active";
  let items = [];
  let countdownTimer = null;

  function setActiveTab(tab, clickedBtn) {
    currentTab = tab;

    const filterButtons = [elBtnSearch, elBtnActive, elBtnEnded, elBtnMine].filter(
      Boolean
    );
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    if (clickedBtn) clickedBtn.classList.add("active");
  }

  // ---- helpers for images + time ----

  function getImageUrl(item) {
    // Try multiple possible JSON fields, then fallback to default
    return (
      item.coverImageUrl ||
      item.cover_image_url ||
      item.imageUrl ||
      item.image_url ||
      "../assets/img/no-image.png"
    );
  }

  function renderTable() {
    elTableBody.innerHTML = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      // image col
      const imgTd = document.createElement("td");
      imgTd.className = "aa-col-image";
      const img = document.createElement("img");
      img.className = "aa-table-thumb";
      img.src = getImageUrl(item);
      img.alt = item.title || "Item image";
      imgTd.appendChild(img);
      tr.appendChild(imgTd);

      // title
      const tdTitle = document.createElement("td");
      tdTitle.textContent = item.title || "(Untitled)";
      tr.appendChild(tdTitle);

      // current price
      const tdPrice = document.createElement("td");
      const price = item.currentPrice ?? item.current_price ?? 0;
      tdPrice.textContent = AA.formatMoney(price);
      tr.appendChild(tdPrice);

      // type
      const tdType = document.createElement("td");
      tdType.textContent = item.auctionType || item.auction_type || "FORWARD";
      tr.appendChild(tdType);

      // status
      const tdStatus = document.createElement("td");
      tdStatus.textContent = (item.status || "ACTIVE").toUpperCase();
      tr.appendChild(tdStatus);

      // ends / remaining
      const tdEnds = document.createElement("td");
      const endTime = item.endTime || item.end_time || item.endsAt;
      tdEnds.dataset.endTime = endTime || "";
      if (!endTime) {
        tdEnds.textContent = "—";
      } else {
        const txt = AA.timeRemaining(endTime);
        tdEnds.textContent = txt === "Ended" ? "Ended" : txt;
        if (txt === "Ended") {
          tdEnds.classList.add("aa-time-danger");
          tdStatus.textContent = "ENDED";
          tdStatus.classList.add("aa-time-danger");
        }
      }
      tr.appendChild(tdEnds);

      // action
      const tdAction = document.createElement("td");
      tdAction.style.textAlign = "right";
      const btn = document.createElement("button");
      btn.className = "aa-btn secondary";
      btn.textContent = "View";
      btn.addEventListener("click", () => {
        window.location.href = `item.html?id=${encodeURIComponent(
          item.itemId ?? item.id
        )}`;
      });
      tdAction.appendChild(btn);
      tr.appendChild(tdAction);

      elTableBody.appendChild(tr);
    });
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      const rows = elTableBody.querySelectorAll("tr");
      rows.forEach((tr) => {
        const tdStatus = tr.children[4];
        const tdEnds = tr.children[5];
        const endIso = tdEnds.dataset.endTime;
        if (!endIso) return;

        const text = AA.timeRemaining(endIso);
        tdEnds.textContent = text === "Ended" ? "Ended" : text;
        tdEnds.classList.remove("aa-time-danger", "aa-time-warning");

        const diffMs = new Date(endIso).getTime() - Date.now();
        const mins = diffMs / 60000;

        if (mins <= 0) {
          tdEnds.classList.add("aa-time-danger");
          tdStatus.textContent = "ENDED";
          tdStatus.classList.add("aa-time-danger");
        } else if (mins <= 5) {
          tdEnds.classList.add("aa-time-danger");
        } else if (mins <= 10) {
          tdEnds.classList.add("aa-time-warning");
        }
      });
    }, 1000);
  }

  // ---- API loaders (back to /api/items/...) ----

  async function loadActive(clickedBtn) {
    try {
      const data = await AA.api("/api/items/active");
      items = data || [];
      renderTable();
      startCountdown();
      setActiveTab("active", clickedBtn || elBtnActive);
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load active items.", "error");
    }
  }

  async function loadEnded(clickedBtn) {
    try {
      const data = await AA.api("/api/items/ended");
      items = data || [];
      renderTable();
      startCountdown();
      setActiveTab("ended", clickedBtn || elBtnEnded);
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load ended items.", "error");
    }
  }

  async function loadMine(clickedBtn) {
    try {
      const all = await AA.api("/api/items");
      items = (all || []).filter(
        (it) => (it.sellerId ?? it.seller_id) === user.userId
      );
      renderTable();
      startCountdown();
      setActiveTab("mine", clickedBtn || elBtnMine);
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load your listings.", "error");
    }
  }

  async function doSearch(clickedBtn) {
    const query = (elSearchInput?.value || "").trim();
    try {
      const path = query
        ? `/api/items/search?q=${encodeURIComponent(query)}`
        : "/api/items/active";

      const data = await AA.api(path);
      items = data || [];
      renderTable();
      startCountdown();
      setActiveTab("search", clickedBtn || elBtnSearch);
    } catch (err) {
      console.error(err);
      AA.showToast("Search failed.", "error");
    }
  }

  // ---- wire up events ----

  elBtnSearch &&
    elBtnSearch.addEventListener("click", (e) => {
      e.preventDefault();
      doSearch(e.currentTarget);
    });

  elBtnActive &&
    elBtnActive.addEventListener("click", (e) => {
      e.preventDefault();
      loadActive(e.currentTarget);
    });

  elBtnEnded &&
    elBtnEnded.addEventListener("click", (e) => {
      e.preventDefault();
      loadEnded(e.currentTarget);
    });

  elBtnMine &&
    elBtnMine.addEventListener("click", (e) => {
      e.preventDefault();
      loadMine(e.currentTarget);
    });

  elSearchInput &&
    elSearchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        doSearch(elBtnSearch || null);
      }
    });

  // initial load – same as “Active” tab
  loadActive(elBtnActive || null);
});
