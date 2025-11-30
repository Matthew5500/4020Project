// assets/js/checkout.js

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

  async function loadCheckoutItems() {
    tbody.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";

    try {
      const ended = await AA.api("/items/ended");

      // 🔧 FIX: only show items the user won AND that are still UNPAID
      const myWins = ended.filter((i) => {
        const paymentStatus = i.paymentStatus || i.payment_status || "UNPAID";
        return i.currentWinnerId === user.userId && paymentStatus !== "PAID";
      });

      if (!myWins.length) {
        tbody.innerHTML =
          "<tr><td colspan='6' class='aa-muted'>You have not won any auctions yet, or all of your won auctions are already paid.</td></tr>";
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
            // exact DB / typical entity names
            "ship_cost_std",
            "shipCostStd",
            // older generic guesses (keep as fallbacks)
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
            // exact DB / typical entity names
            "ship_cost_exp",
            "shipCostExp",
            // generic fallbacks
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
          [
            "ship_days", // DB column
            "shipDays", // typical entity name
            "shippingDays",
            "shipping_time_days",
          ],
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

        if (paymentStatus === "PAID") {
          // In theory we filtered these OUT above, but keep this
          // just in case the API changes in the future.
          actionCell.innerHTML =
            "<span class='aa-tag success'>Paid</span>";
        } else {
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
            sessionStorage.setItem(
              "checkout",
              JSON.stringify(checkout)
            );
            window.location.href = "pay.html";
          });
          actionCell.appendChild(btn);
        }

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
