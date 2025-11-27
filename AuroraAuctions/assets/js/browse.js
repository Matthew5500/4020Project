document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const tbody = document.getElementById("items-tbody");
  const searchForm = document.getElementById("search-form");
  const btnActive = document.getElementById("btn-show-active");
  const btnEnded = document.getElementById("btn-show-ended");
  const btnMine = document.getElementById("btn-show-mine");

  async function loadItems(mode) {
    tbody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";
    try {
      let items;
      if (mode === "active") {
        items = await AA.api("/items/active");
      } else if (mode === "ended") {
        items = await AA.api("/items/ended");
      } else if (mode === "mine") {
        items = await AA.api(`/items?ownerId=${encodeURIComponent(user.userId)}`);
      } else if (mode && mode.q) {
        items = await AA.api(`/items/search?q=${encodeURIComponent(mode.q)}`);
      } else {
        items = await AA.api("/items");
      }

      if (!items.length) {
        tbody.innerHTML =
          "<tr><td colspan='6' class='aa-muted small'>No items found.</td></tr>";
        return;
      }

      tbody.innerHTML = "";
      items.forEach((item) => {
        const tr = document.createElement("tr");
        const price = item.currentPrice || item.startingPrice;
        tr.innerHTML = `
          <td>${item.title}</td>
          <td>${AA.formatMoney(price)}</td>
          <td>${item.auctionType}</td>
          <td>${item.status}</td>
          <td>${AA.timeRemaining(item.endTime)}</td>
          <td>
            <a class="aa-btn secondary" href="item.html?id=${encodeURIComponent(
              item.itemId
            )}">View</a>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="aa-muted small">Error: ${err.message}</td></tr>`;
      console.error("Browse error:", err.message);
    }
  }

  searchForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const q = document.getElementById("search-query").value.trim();
    if (q) loadItems({ q });
    else loadItems();
  });

  btnActive.addEventListener("click", () => loadItems("active"));
  btnEnded.addEventListener("click", () => loadItems("ended"));
  btnMine.addEventListener("click", () => loadItems("mine"));

  // initial load: active auctions (UC2.2)
  loadItems("active");
});