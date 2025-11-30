// assets/js/pay.js
// Handles UC5: payment for a won auction item.

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const rawCheckout = sessionStorage.getItem("checkout");
  if (!rawCheckout) {
    AA.showToast(
      "No item selected for payment. Redirecting to Browse.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  let checkout;
  try {
    checkout = JSON.parse(rawCheckout);
  } catch (e) {
    console.error("Failed to parse checkout object:", e);
    AA.showToast(
      "Something went wrong loading the checkout. Redirecting to Browse.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  // ------------ DOM elements ------------
  const elTitle = document.getElementById("pay-item-title");
  const elPrice = document.getElementById("pay-winning-price");
  const elShipRegular = document.getElementById("pay-ship-regular");
  const elShipExp = document.getElementById("pay-ship-expedited");
  const elTotal = document.getElementById("pay-total");
  const elShipDays = document.getElementById("pay-ship-days");

  const chkExpedited = document.getElementById("pay-expedited");
  const lblExpedited = document.getElementById("pay-expedited-label");

  const form = document.getElementById("pay-form");

  // ------------ Shipping overrides ------------
  // If the seller created the item via Sell page, we saved shipping settings
  // in localStorage["aaShippingOverrides"] keyed by itemId.
  try {
    const rawOverrides = localStorage.getItem("aaShippingOverrides") || "{}";
    const overrides = JSON.parse(rawOverrides);
    const key = String(checkout.itemId);
    const o = overrides[key];

    if (o) {
      // Override checkout values with seller-provided data
      if (typeof o.baseShipping === "number") checkout.baseShipping = o.baseShipping;
      if (typeof o.expShipping === "number") checkout.expShipping = o.expShipping;
      if (typeof o.shippingDays === "number") checkout.shippingDays = o.shippingDays;
    }
  } catch (err) {
    console.warn("Failed to load shipping overrides:", err);
  }

  // ------------ Helper: mark global 'paid' flag ------------
  function markItemPaid(itemId) {
    if (itemId == null) return;
    try {
      const raw = localStorage.getItem("aaPaidItems") || "[]";
      let arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
      const key = String(itemId);
      if (!arr.includes(key)) {
        arr.push(key);
      }
      localStorage.setItem("aaPaidItems", JSON.stringify(arr));
    } catch (err) {
      console.warn("Failed to mark item as paid:", err);
    }
  }

  // ------------ Display initial values ------------
  const winningPrice = Number(checkout.winningPrice || 0);
  let baseShipping = Number(checkout.baseShipping || 0);
  let expShipping = Number(checkout.expShipping || 0);
  const shippingDays = checkout.shippingDays ?? null;

  let useExpedited = Boolean(checkout.expeditedSelected);

  if (elTitle) elTitle.textContent = checkout.title || `Item #${checkout.itemId}`;
  if (elPrice) elPrice.textContent = AA.formatMoney(winningPrice);
  if (elShipRegular) elShipRegular.textContent = AA.formatMoney(baseShipping);
  if (elShipExp) elShipExp.textContent = AA.formatMoney(expShipping);

  // Disable expedited when there is no extra cost defined
  if (chkExpedited && lblExpedited) {
    if (!expShipping || expShipping <= 0) {
      chkExpedited.checked = false;
      chkExpedited.disabled = true;
      lblExpedited.classList.add("aa-muted");
    } else {
      chkExpedited.checked = useExpedited;
      chkExpedited.disabled = false;
      lblExpedited.classList.remove("aa-muted");
    }
  }

  if (elShipDays) {
    if (shippingDays == null || shippingDays === 0) {
      elShipDays.textContent = "Not specified";
    } else {
      elShipDays.textContent = `${shippingDays} day(s)`;
    }
  }

  function recalcTotal() {
    const ship = useExpedited ? expShipping : baseShipping;
    const total = winningPrice + ship;
    if (elTotal) {
      elTotal.textContent = AA.formatMoney(total);
    }
  }

  recalcTotal();

  if (chkExpedited) {
    chkExpedited.addEventListener("change", () => {
      useExpedited = chkExpedited.checked;
      checkout.expeditedSelected = useExpedited;
      sessionStorage.setItem("checkout", JSON.stringify(checkout));
      recalcTotal();
    });
  }

  // ------------ Form submit (fake payment) ------------
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const card = (formData.get("cardNumber") || "").toString().trim();
      const name = (formData.get("cardName") || "").toString().trim();
      const expiry = (formData.get("cardExpiry") || "").toString().trim();
      const cvv = (formData.get("cardCvv") || "").toString().trim();

      if (!card || !name || !expiry || !cvv) {
        AA.showToast("Missing fields", "Please fill in all card details.", "error");
        return;
      }

      try {
        const body = {
          payerId: user.userId,
          method: "CARD",
          note: useExpedited
            ? "Expedited shipping selected"
            : "Regular shipping selected",
        };

        await AA.api(`/items/${encodeURIComponent(checkout.itemId)}/pay`, {
          method: "POST",
          body,
        });

        // Mark this item as paid globally so Checkout hides it
        markItemPaid(checkout.itemId);

        // Build a small receipt snapshot for the receipt.html page
        const lastReceipt = {
          itemId: checkout.itemId,
          itemTitle: checkout.title,
          winningPrice,
          baseShipping,
          expShipping,
          shippingDays,
          expeditedSelected: useExpedited,
          paidAt: new Date().toISOString(),
        };
        sessionStorage.setItem("lastReceipt", JSON.stringify(lastReceipt));

        AA.showToast("Payment successful", "Redirecting to receipt…", "success");
        window.location.href = "receipt.html";
      } catch (err) {
        console.error("Payment failed:", err);
        AA.showToast("Payment failed", err.message || String(err), "error");
      }
    });
  }
});
