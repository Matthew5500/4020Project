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
    AA.showToast(
      "Payment data corrupted. Please retry from item page.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  const {
    title,
    winningPrice,
    baseShipping = 0,
    expShipping = 0,
    shippingDays = null,
    expeditedSelected = false,
  } = checkout;

  // summary DOM
  const elItemTitle = document.getElementById("pay-item-title");
  const elWinningPrice = document.getElementById("pay-winning-price");
  const elShipRegular = document.getElementById("pay-ship-regular");
  const elShipExpText = document.getElementById("pay-ship-exp-text");
  const elShipExpCheckbox = document.getElementById("pay-ship-exp-check");
  const elTotal = document.getElementById("pay-total");
  const elShipNote = document.getElementById("pay-ship-note");

  const form = document.getElementById("pay-form");

  function computeTotal() {
    const ship = elShipExpCheckbox && elShipExpCheckbox.checked
      ? expShipping
      : baseShipping;
    return (winningPrice || 0) + (ship || 0);
  }

  function renderSummary() {
    if (elItemTitle) elItemTitle.textContent = title || "Unknown item";
    if (elWinningPrice)
      elWinningPrice.textContent = AA.formatMoney(winningPrice || 0);

    if (elShipRegular)
      elShipRegular.textContent = AA.formatMoney(baseShipping || 0);

    if (elShipExpText && elShipExpCheckbox) {
      // Always show the expedited line (like your old version)
      if (expShipping > 0) {
        elShipExpText.textContent = `Expedited shipping (+${AA.formatMoney(
          expShipping
        )})`;
        elShipExpCheckbox.disabled = false;
      } else {
        elShipExpText.textContent =
          "Expedited shipping (+$0 – not configured)";
        elShipExpCheckbox.disabled = true;
      }
      elShipExpCheckbox.checked = expeditedSelected && expShipping > 0;
    }

    if (elTotal) elTotal.textContent = AA.formatMoney(computeTotal());

    if (elShipNote) {
      if (shippingDays) {
        elShipNote.textContent = `The item will be shipped in about ${shippingDays} day(s).`;
      } else {
        elShipNote.textContent =
          "The item will be shipped in a few days (shipping time not specified).";
      }
    }
  }

  elShipExpCheckbox &&
    elShipExpCheckbox.addEventListener("change", () => {
      checkout.expeditedSelected = elShipExpCheckbox.checked;
      sessionStorage.setItem("checkout", JSON.stringify(checkout));
      if (elTotal) elTotal.textContent = AA.formatMoney(computeTotal());
    });

  form &&
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();

      // This is a mock payment – we just show success + redirect
      AA.showToast("Payment submitted successfully. Thank you!", "success");

      // Clear checkout so you can't refresh pay page by accident
      sessionStorage.removeItem("checkout");

      setTimeout(() => {
        window.location.href = "browse.html";
      }, 800);
    });

  renderSummary();
});
