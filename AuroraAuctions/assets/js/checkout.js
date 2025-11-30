// assets/js/checkout.js
// Lists ended auctions that the current user has won but not yet paid for.

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const tbody = document.getElementById("checkout-tbody");
  if (!tbody) return;

  async function loadCheckoutItems() {
    tbody.innerHTML = `<tr><td colspan="6" class="aa-muted">Loading…</td></tr>`;

    // Load list of item IDs that we've already paid
    let paidKeys = [];
    try {
      const raw = localStorage.getItem("aaPaidItems") || "[]";
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        paidKeys = arr.map((v) => String(v));
      }
    } catch (err) {
      console.warn("Failed to parse aaPaidItems:", err);
    }

    try {
      const ended = await AA.api("/items/ended");

      const rows = [];

      ended.forEach((item) => {
        const id =
          item.id ??
          item.itemId ??
          item.item_id ??
          item.ID ??
          item.ITEM_ID;

        if (id == null) {
          return;
        }

        const key = String(id);

        // Skip items we've already paid for
        if (paidKeys.includes(key)) {
          return;
        }

        const winnerId =
          item.currentWinnerId ??
          item.current_winner_id ??
          item.winnerId ??
          item.winner_id;

        if (winnerId == null || Number(winnerId) !== Number(user.userId)) {
          return;
        }

        const winningPrice =
          item.currentPrice ??
          item.finalPrice ??
          item.price ??
          item.startingPrice ??
          0;

        // Try to infer shipping info from any of the possible field names
        const baseShipping =
          item.ship_cost_std ??
          item.shipCostStd ??
          item.shippingStandard ??
          item.shippingRegular ??
          0;

        const expShipping =
          item.ship_cost_exp ??
          item.shipCostExp ??
          item.shippingExpedited ??
          0;

        const shippingDays =
          item.ship_days ?? item.shipDays ?? item.shippingDays ?? null;

        const title = item.title || `Item #${id}`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${title}</td>
          <td>${AA.formatMoney(winningPrice)}</td>
          <td>${AA.formatMoney(baseShipping || 0)}</td>
          <td>${AA.formatMoney(expShipping || 0)}</td>
          <td>${
            shippingDays == null || shippingDays === 0
              ? "Not specified"
              : `${shippingDays} day(s)`
          }</td>
          <td>
            <button class="aa-btn primary aa-btn-sm" data-item-id="${key}">
              Pay
            </button>
          </td>
        `;

        const btn = tr.querySelector("button[data-item-id]");
        if (btn) {
          btn.addEventListener("click", () => {
            startCheckoutFromItem({
              id,
              title,
              winningPrice,
              baseShipping: Number(baseShipping || 0),
              expShipping: Number(expShipping || 0),
              shippingDays,
            });
          });
        }

        rows.push(tr);
      });

      tbody.innerHTML = "";

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="aa-muted">No unpaid winnings found.</td></tr>`;
      } else {
        rows.forEach((tr) => tbody.appendChild(tr));
      }
    } catch (err) {
      console.error("Failed to load checkout items:", err);
      tbody.innerHTML = `<tr><td colspan="6" class="aa-muted">Failed to load checkout items.</td></tr>`;
      AA.showToast("Failed to load checkout items", err.message || String(err), "error");
    }
  }

  function startCheckoutFromItem(info) {
    const checkout = {
      itemId: info.id,
      title: info.title,
      winningPrice: info.winningPrice,
      baseShipping: info.baseShipping || 0,
      expShipping: info.expShipping || 0,
      shippingDays: info.shippingDays ?? null,
      expeditedSelected: false,
    };

    sessionStorage.setItem("checkout", JSON.stringify(checkout));
    window.location.href = "pay.html";
  }

  loadCheckoutItems();
});
