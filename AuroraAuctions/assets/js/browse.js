// assets/js/browse.js
document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const elSearchInput = document.getElementById("search-keyword");
  const elBtnSearch = document.getElementById("tab-search");
  const elBtnActive = document.getElementById("tab-active");
  const elBtnEnded = document.getElementById("tab-ended");
  const elBtnMine = document.getElementById("tab-mine");
  const elTableBody = document.getElementById("items-tbody");

  let currentTab = "active"; // 'search' | 'active' | 'ended' | 'mine'
  let items = [];
  let countdownTimer = null;

  function setActiveTab(tab) {
    currentTab = tab;
    [elBtnSearch, elBtnActive, elBtnEnded, elBtnMine].forEach((btn) =>
      btn && btn.classList.remove("active")
    );
    if (tab === "search" && elBtnSearch) elBtnSearch.classList.add("active");
    if (tab === "active" && elBtnActive) elBtnActive.classList.add("active");
    if (tab === "ended" && elBtnEnded) elBtnEnded.classList.add("active");
    if (tab === "mine" && elBtnMine) elBtnMine.classList.add("active");
  }

  function renderTable() {
    elTableBody.innerHTML = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      const imgTd = document.createElement("td");
      imgTd.className = "aa-col-image";
      const img = document.createElement("img");
      img.className = "aa-table-thumb";
      img.src = item.coverImageUrl || "../assets/img/no-image.png";
      img.alt = item.title || "Item image";
      imgTd.appendChild(img);
      tr.appendChild(imgTd);

      const tdTitle = document.createElement("td");
      tdTitle.textContent = item.title || "(Untitled)";
      tr.appendChild(tdTitle);

      const tdPrice = document.createElement("td");
      tdPrice.textContent = AA.formatMoney(item.currentPrice);
      tr.appendChild(tdPrice);

      const tdType = document.createElement("td");
      tdType.textContent = item.auctionType || "FORWARD";
      tr.appendChild(tdType);

      const tdStatus = document.createElement("td");
      const remainingText = AA.timeRemaining(item.endTime);
      const ended = remainingText === "Ended";
      tdStatus.textContent = ended ? "ENDED" : (item.status || "ACTIVE");
      if (ended) tdStatus.classList.add("aa-time-danger");
      tr.appendChild(tdStatus);

      const tdEnds = document.createElement("td");
      tdEnds.dataset.endTime = item.endTime || "";
      tdEnds.textContent =
        !item.endTime
          ? "—"
          : (remainingText === "Ended"
              ? "Ended"
              : remainingText);
      if (remainingText === "Ended") {
        tdEnds.classList.add("aa-time-danger");
      }
      tr.appendChild(tdEnds);

      const tdAction = document.createElement("td");
      tdAction.style.textAlign = "right";
      const btn = document.createElement("button");
      btn.className = "aa-btn secondary";
      btn.textContent = "View";
      btn.addEventListener("click", () => {
        window.location.href = `item.html?id=${encodeURIComponent(
          item.itemId
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
        const tdEnds = tr.children[5]; // ends / remaining col
        const tdStatus = tr.children[4]; // status col
        const endIso = tdEnds.dataset.endTime;
        if (!endIso) return;
        const text = AA.timeRemaining(endIso);
        const ended = text === "Ended";

        tdEnds.textContent = ended ? "Ended" : text;
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

  async function loadActive() {
    setActiveTab("active");
    try {
      items = await AA.api("/items/active");
      renderTable();
      startCountdown();
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load active items.", "error");
    }
  }

  async function loadEnded() {
    setActiveTab("ended");
    try {
      items = await AA.api("/items/ended");
      renderTable();
      startCountdown();
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load ended items.", "error");
    }
  }

  async function loadMine() {
    setActiveTab("mine");
    try {
      const all = await AA.api("/items");
      items = all.filter((it) => it.sellerId === user.userId);
      renderTable();
      startCountdown();
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load your listings.", "error");
    }
  }

  async function doSearch() {
    const query = elSearchInput.value.trim();
    setActiveTab("search");
    try {
      const path = query
        ? `/items/search?q=${encodeURIComponent(query)}`
        : "/items/active";
      items = await AA.api(path);
      renderTable();
      startCountdown();
    } catch (err) {
      console.error(err);
      AA.showToast("Search failed.", "error");
    }
  }

  // ---------- Wire up UI ----------

  if (elBtnSearch) {
    elBtnSearch.addEventListener("click", (e) => {
      e.preventDefault();
      doSearch();
    });
  }

  if (elBtnActive) {
    elBtnActive.addEventListener("click", (e) => {
      e.preventDefault();
      loadActive();
    });
  }

  if (elBtnEnded) {
    elBtnEnded.addEventListener("click", (e) => {
      e.preventDefault();
      loadEnded();
    });
  }

  if (elBtnMine) {
    elBtnMine.addEventListener("click", (e) => {
      e.preventDefault();
      loadMine();
    });
  }

  // Enter to search
  if (elSearchInput) {
    elSearchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        doSearch();
      }
    });
  }

  // Initial load: active tab
  loadActive();
});
