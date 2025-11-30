// assets/js/checkout.js
// Shows auctions the current user has won and still needs to pay for.

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const tbody = document.getElementById("checkout-tbody");

  // helper from item.js
  function firstField(obj, names, fallback = null) {
    for (const n of names) {
      if (obj[n] !== undefined && obj[n] !== null) return obj[n];
    }
    return fallback;
  }

  function loadPaidIds() {
    try {
      const raw = localStorage.getItem("aaPaidItems");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("Could not parse aaPaidItems:", e);
      return [];
    }
  }

  async function loadCheckoutItems() {
    if (!tbody) return;
    tbody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";

    try {
      const ended = await AA.api("/items/ended");
      if (!Array.isArray(ended)) {
        tbody.innerHTML =
          "<tr><td colspan='6' class='aa-muted'>Unexpected response from server.</td></tr>";
        return;
      }

      const paidIds = loadPaidIds();

      // Only items:
      // - where this user is the current winner
      // - and whose ID is NOT in aaPaidItems
      const myWins = ended.filter((item) => {
        const winnerId =
          item.currentWinnerId ??
          item.current_winner_id ??
          item.winnerId ??
          item.winner_id;

        const id =
          item.itemId ?? item.id ?? item.item_id ?? item.auctionItemId;

        if (winnerId !== user.userId) return false;
        if (id == null) return true; // if no id, don't hide it
        return !paidIds.includes(id);
      });

      if (!myWins.length) {
        tbody.innerHTML =
          "<tr><td colspan='6' class='aa-muted'>You have no unpaid won auctions.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      myWins.forEach((item) => {
        const id =
          item.itemId ?? item.id ?? item.item_id ?? item.auctionItemId;

        const winningPrice =
          firstField(item, ["currentPrice", "finalPrice", "price"]) || 0;

        const baseShipping = firstField(
          item,
          [
            "ship_cost_std",
            "shipCostStd",
            "shippingCost",
            "shipping_cost",
            "shipping",
            "shippingRegular",
            "shipping_regular",
            "baseShipping",
          ],
          0
        );

        const expShipping = firstField(
          item,
          [
            "ship_cost_exp",
            "shipCostExp",
            "expeditedShippingCost",
            "expedited_shipping_cost",
            "expeditedShipping",
            "shippingExpedited",
            "shipping_expedited",
          ],
          0
        );

        const shippingDays = firstField(
          item,
          ["ship_days", "shipDays", "shippingDays", "shipping_time_days"],
          null
        );

        const paymentStatus =
          item.paymentStatus || item.payment_status || "UNPAID";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.title || "(no title)"}</td>
          <td>${AA.formatMoney(winningPrice)}</td>
          <td>${AA.formatMoney(baseShipping)}</td>
          <td>${paymentStatus}</td>
          <td>${AA.formatDateTime(item.endTime)}</td>
          <td></td>
        `;

        const actionCell = tr.lastElementChild;

        const btn = document.createElement("button");
        btn.className = "aa-btn primary small";
        btn.textContent = "Pay";
        btn.addEventListener("click", () => {
          const checkout = {
            itemId: id,
            title: item.title,
            winningPrice,
            baseShipping,
            expShipping,
            shippingDays,
            expeditedSelected: false,
          };
          sessionStorage.setItem("checkout", JSON.stringify(checkout));
          window.location.href = "pay.html";
        });
        actionCell.appendChild(btn);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Checkout load failed:", err);
      tbody.innerHTML =
        "<tr><td colspan='6' class='aa-muted'>Failed to load checkout items.</td></tr>";
      if (AA.showToast) {
        AA.showToast(
          "Failed to load checkout items: " + (err.message || "Error"),
          "error"
        );
      }
    }
  }

  loadCheckoutItems();
});
