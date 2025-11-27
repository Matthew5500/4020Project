// assets/js/pay.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  // --- 1. Load checkout context from sessionStorage ---

  const rawCheckout = sessionStorage.getItem("checkout");
  if (!rawCheckout) {
    if (AA.showToast) {
      AA.showToast(
        "No item selected for payment. Redirecting to Browse.",
        "error"
      );
    }
    window.location.href = "browse.html";
    return;
  }

  let checkout;
  try {
    checkout = JSON.parse(rawCheckout);
  } catch {
    sessionStorage.removeItem("checkout");
    AA.showToast("Payment data corrupted. Please retry from item page.", "error");
    window.location.href = "browse.html";
    return;
  }

  const {
    itemId,
    title,
    winningPrice,
    baseShipping,
    expShipping,
    shippingDays,
    expeditedSelected,
  } = checkout;

  // --- 2. DOM references ---

  const elItemTitle = document.getElementById("pay-item-title");
  const elWinningPrice = document.getElementById("pay-winning-price");
  const elShipRegular = document.getElementById("pay-ship-regular");
  const elExpCheckbox = document.getElementById("pay-expedited");
  const elExpLabel = document.getElementById("pay-expedited-label");
  const elTotal = document.getElementById("pay-total");
  const elShipTime = document.getElementById("pay-shipping-time");

  const elUserName = document.getElementById("pay-user-name");
  const elUserAddress = document.getElementById("pay-user-address");

  const form = document.getElementById("pay-form");
  const cardNumber = document.getElementById("card-number");
  const cardName = document.getElementById("card-name");
  const cardExpiry = document.getElementById("card-expiry");
  const cardCvv = document.getElementById("card-cvv");
  const errorBox = document.getElementById("pay-error");

  // --- 3. Populate static info (order summary + user info) ---

  elItemTitle.textContent = title || `Item #${itemId}`;
  elWinningPrice.textContent = AA.formatMoney(winningPrice || 0);
  elShipRegular.textContent = AA.formatMoney(baseShipping || 0);

  if (expShipping && expShipping > 0) {
    elExpLabel.textContent = `Expedited shipping (+${AA.formatMoney(
      expShipping
    )})`;
  } else {
    elExpLabel.textContent = "Expedited shipping (+$0 – not configured)";
  }

  if (typeof shippingDays === "number") {
    elShipTime.textContent = `The item will be shipped in ${shippingDays} day(s).`;
  } else {
    elShipTime.textContent =
      "The item will be shipped in a few days (shipping time not specified).";
  }

  // User info (we just stitch together any fields the backend gave us)
  const parts = [];
  if (user.firstName || user.lastName) {
    elUserName.textContent = `${user.firstName || ""} ${
      user.lastName || ""
    }`.trim();
  } else {
    elUserName.textContent = user.username || `User #${user.userId}`;
  }

  if (user.street) parts.push(user.street);
  if (user.city) parts.push(user.city);
  if (user.country) parts.push(user.country);
  if (user.postalCode) parts.push(user.postalCode);
  elUserAddress.textContent =
    parts.length > 0
      ? parts.join(", ")
      : "No address on file (from Sign-Up).";

  // --- 4. Shipping + total calculation ---

  elExpCheckbox.checked = !!expeditedSelected;

  function computeTotals() {
    const base = Number(winningPrice || 0);
    const shipBase = Number(baseShipping || 0);
    const useExp = elExpCheckbox.checked;
    const shipExtra = useExp ? Number(expShipping || 0) : 0;

    const shippingTotal = shipBase + shipExtra;
    const grandTotal = base + shippingTotal;

    return { shippingTotal, grandTotal, expedited: useExp };
  }

  function renderTotals() {
    const { grandTotal } = computeTotals();
    elTotal.textContent = AA.formatMoney(grandTotal);
  }

  elExpCheckbox.addEventListener("change", renderTotals);
  renderTotals();

  // --- 5. Credit-card validation (stricter, but still fake gateway) ---

  function validateCard() {
    errorBox.textContent = "";

    // Strip spaces and dashes from card number
    const num = cardNumber.value.replace(/[\s-]+/g, "");
    const name = cardName.value.trim();
    const exp = cardExpiry.value.trim();
    const cvv = cardCvv.value.trim();

    // Card number: exactly 16 digits
    if (!/^\d{16}$/.test(num)) {
      errorBox.textContent =
        "Card number must be exactly 16 digits (numbers only).";
      return false;
    }

    if (!name) {
      errorBox.textContent = "Please enter the name on the card.";
      return false;
    }

    // Expiry: MM/YY with month 01–12
    const match = /^(\d{2})\/(\d{2})$/.exec(exp);
    if (!match) {
      errorBox.textContent = "Please use expiry format MM/YY.";
      return false;
    }
    const mm = parseInt(match[1], 10);
    if (mm < 1 || mm > 12) {
      errorBox.textContent = "Expiry month must be between 01 and 12.";
      return false;
    }

    // CVV: 3 or 4 digits
    if (!/^\d{3,4}$/.test(cvv)) {
      errorBox.textContent = "CVV must be 3 or 4 digits.";
      return false;
    }

    return true;
  }

  // --- 6. Submit handler → POST /api/items/{id}/pay, then save receipt ---

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errorBox.textContent = "";

    if (!validateCard()) return;

    const { shippingTotal, grandTotal, expedited } = computeTotals();

    try {
      const note = `Shipping: ${
        expedited ? "EXPEDITED" : "REGULAR"
      }, shippingTotal=${shippingTotal}`;

      // Backend still sees a normal JSON payment request
      const receiptFromServer = await AA.api(
        `/items/${encodeURIComponent(itemId)}/pay`,
        {
          method: "POST",
          body: {
            payerId: user.userId,
            method: "FAKE_CARD",
            note,
          },
        }
      );

      // Save everything we want for the UC6 receipt page
      const lastReceipt = {
        itemId,
        title,
        winningPrice,
        baseShipping,
        expShipping,
        shippingTotal,
        grandTotal,
        expedited,
        shippingDays,
        payerId: user.userId,
        backend: receiptFromServer,
        paidAt: new Date().toISOString(),
      };

      sessionStorage.setItem("lastReceipt", JSON.stringify(lastReceipt));
      sessionStorage.removeItem("checkout");

      if (AA.showToast) {
        AA.showToast("Payment successful. Showing receipt.", "success");
      }

      window.location.href = "receipt.html";
    } catch (err) {
      console.error("Payment failed:", err);
      errorBox.textContent =
        err.message || "Payment failed. Please try again.";
      if (AA.showToast) {
        AA.showToast(
          "Payment failed: " + (err.message || "Bad Request"),
          "error"
        );
      }
    }
  });
});
