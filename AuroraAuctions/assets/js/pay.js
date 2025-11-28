// assets/js/pay.js

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
  } = checkout;

  // DOM refs
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

  // Fill static fields
  elItemTitle.textContent = title || `Item #${itemId}`;
  elWinningPrice.textContent = AA.formatMoney(winningPrice || 0);
  elShipRegular.textContent = AA.formatMoney(baseShipping || 0);

  const expRow = elExpCheckbox ? elExpCheckbox.closest("label") : null;
  const hasExp = expShipping && Number(expShipping) > 0;

  if (hasExp) {
    elExpLabel.textContent = `Expedited shipping (+${AA.formatMoney(
      expShipping
    )})`;
    if (expRow) {
      expRow.style.display = "block";
    }
  } else {
    // Hide the expedited option entirely if the seller did not configure it
    if (expRow) {
      expRow.style.display = "none";
    }
    if (elExpCheckbox) {
      elExpCheckbox.checked = false;
    }
  }

  if (typeof shippingDays === "number") {
    elShipTime.textContent = `The item will be shipped in approximately ${shippingDays} day(s).`;
  } else {
    elShipTime.textContent =
      "The item will be shipped in a few days (shipping time not specified).";
  }

  if (elUserName) {
    elUserName.textContent = `${user.firstName ?? user.fname ?? ""} ${
      user.lastName ?? user.lname ?? ""
    }`.trim() || `User #${user.userId}`;
  }

  if (elUserAddress) {
    elUserAddress.textContent =
      user.address ||
      user.shippingAddress ||
      "No address on file (from Sign-Up).";
  }

  // State
  const state = {
    winningPrice: Number(winningPrice || 0),
    baseShipping: Number(baseShipping || 0),
    expShipping: Number(expShipping || 0),
  };

  function computeTotals() {
    const shipBase = state.baseShipping;
    const useExp = elExpCheckbox && elExpCheckbox.checked;
    const shipExtra = useExp ? state.expShipping : 0;
    const shippingTotal = shipBase + shipExtra;
    const grandTotal = state.winningPrice + shippingTotal;

    elTotal.textContent = AA.formatMoney(grandTotal);
  }

  if (elExpCheckbox) {
    elExpCheckbox.addEventListener("change", computeTotals);
  }

  computeTotals();

  // ---- Client-side validation for fake card (UC5.2 – we don't hit real gateway) ----
  function luhnCheck(numStr) {
    const digits = numStr.replace(/\D+/g, "");
    if (!digits) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (alt) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      alt = !alt;
      sum += d;
    }
    return sum % 10 === 0;
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
  }

  if (form) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      showError("");

      const numRaw = cardNumber.value.trim();
      const nameRaw = cardName.value.trim();
      const expRaw = cardExpiry.value.trim();
      const cvvRaw = cardCvv.value.trim();

      if (!numRaw || !nameRaw || !expRaw || !cvvRaw) {
        showError("Please fill in all card fields.");
        return;
      }

      if (!luhnCheck(numRaw)) {
        showError("Card number appears invalid (Luhn check failed).");
        return;
      }

      if (!/^\d{2}\/\d{2}$/.test(expRaw)) {
        showError("Expiry must be in MM/YY format.");
        return;
      }

      if (!/^\d{3,4}$/.test(cvvRaw)) {
        showError("CVV must be 3–4 digits.");
        return;
      }

      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/pay`, {
          method: "POST",
          body: {
            userId: user.userId,
            expedited: elExpCheckbox ? elExpCheckbox.checked : false,
            total: state.winningPrice,
          },
        });

        AA.showToast("Payment successful! (simulated)", "success");
        sessionStorage.removeItem("checkout");
        window.location.href = "browse.html";
      } catch (err) {
        console.error("Payment failed:", err);
        showError(err.message || "Payment failed.");
        AA.showToast(
          "Payment failed: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }
});
