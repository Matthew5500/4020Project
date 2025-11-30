// assets/js/receipt.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const raw = sessionStorage.getItem("lastReceipt");
  if (!raw) {
    // Fallback: nothing in session, tell user and send them back
    AA.showToast(
      "No recent payment found. Redirecting to catalogue.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  let receipt;
  try {
    receipt = JSON.parse(raw);
  } catch (e) {
    console.error("Could not parse lastReceipt:", e);
    AA.showToast(
      "Something went wrong loading your receipt.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  // DOM elements
  const elTitle = document.getElementById("rcpt-item-title");
  const elWinningPrice = document.getElementById(
    "rcpt-winning-price"
  );
  const elShipRegular = document.getElementById(
    "rcpt-ship-regular"
  );
  const elShipExp = document.getElementById("rcpt-ship-exp");
  const elShipMethod = document.getElementById("rcpt-ship-method");
  const elTotalPaid = document.getElementById("rcpt-total-paid");
  const elShipDays = document.getElementById("rcpt-ship-days");
  const elPaidAt = document.getElementById("rcpt-paid-at");
  const elBack = document.getElementById("rcpt-back-btn");

  // Values from lastReceipt (set in pay.js)
  const itemTitle = receipt.itemTitle || "(no title)";
  const winningPrice = Number(receipt.finalPrice || 0);
  const baseShipping = Number(receipt.baseShipping || 0);
  const expShipping = Number(receipt.expShipping || 0);
  const shippingDays =
    typeof receipt.shippingDays === "number"
      ? receipt.shippingDays
      : null;
  const expeditedSelected = !!receipt.expeditedSelected;
  const usedExp = expeditedSelected && expShipping > 0;
  const usedShipping = usedExp ? expShipping : baseShipping;
  const totalPaid = winningPrice + usedShipping;

  if (elTitle) elTitle.textContent = itemTitle;
  if (elWinningPrice)
    elWinningPrice.textContent = AA.formatMoney(winningPrice);
  if (elShipRegular)
    elShipRegular.textContent = AA.formatMoney(baseShipping);
  if (elShipExp)
    elShipExp.textContent = AA.formatMoney(expShipping);
  if (elShipMethod)
    elShipMethod.textContent = usedExp ? "Expedited" : "Standard";
  if (elTotalPaid)
    elTotalPaid.textContent = AA.formatMoney(totalPaid);

  if (elShipDays) {
    if (shippingDays != null) {
      elShipDays.textContent = `${shippingDays} day(s)`;
    } else {
      elShipDays.textContent = "Not specified";
    }
  }

  if (elPaidAt) {
    if (receipt.paidAt) {
      const d = new Date(receipt.paidAt);
      if (!isNaN(d.getTime())) {
        elPaidAt.textContent = d.toLocaleString();
      } else {
        elPaidAt.textContent = "Not available";
      }
    } else {
      elPaidAt.textContent = "Not available";
    }
  }

  if (elBack) {
    elBack.addEventListener("click", () => {
      window.location.href = "browse.html";
    });
  }
});
