// assets/js/receipt.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const box = document.getElementById("receipt-box");
  const meta = document.getElementById("receipt-meta");

  const raw = sessionStorage.getItem("lastReceipt");
  if (!raw) {
    if (box) {
      box.innerHTML =
        "<p class='aa-muted'>No recent payment found. Go to Browse to pick an item.</p>";
    }
    if (AA.showToast) {
      AA.showToast("No recent payment to show.", "info");
    }
    return;
  }

  let r;
  try {
    r = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem("lastReceipt");
    if (box) {
      box.innerHTML =
        "<p class='aa-muted'>Receipt data was corrupted. Please try paying again.</p>";
    }
    if (AA.showToast) {
      AA.showToast("Could not read saved receipt.", "error");
    }
    return;
  }

  const {
    itemId,
    title,
    winningPrice,
    baseShipping,
    expShipping,
    shippingTotal,
    grandTotal,
    expedited,
    shippingDays,
    payerId,
    paidAt,
  } = r;

  const shipType = expedited ? "Expedited" : "Regular";

  if (box) {
    box.innerHTML = `
      <h3>Payment receipt</h3>
      <p><strong>Item ID:</strong> ${itemId}</p>
      <p><strong>Item:</strong> ${title || "(no title)"} </p>
      <p><strong>Payer ID:</strong> ${payerId ?? user.userId}</p>

      <p><strong>Item price:</strong> ${AA.formatMoney(winningPrice || 0)}</p>
      <p><strong>Shipping (${shipType}):</strong> ${AA.formatMoney(
        shippingTotal || 0
      )}</p>
      <p class="aa-muted small">
        (Base shipping: ${AA.formatMoney(baseShipping || 0)}${
      expShipping
        ? `, expedited extra: ${AA.formatMoney(expShipping)}`
        : ""
    })
      </p>

      <p><strong>Total paid:</strong> ${AA.formatMoney(grandTotal || 0)}</p>

      <h3>Shipping details</h3>
      <p>
        ${
          typeof shippingDays === "number"
            ? `The item will be shipped in ${shippingDays} day(s).`
            : "The item will be shipped in a few days (shipping time not specified)."
        }
      </p>
    `;
  }

  if (meta) {
    const when = paidAt
      ? AA.formatDateTime(paidAt)
      : new Date().toLocaleString();
    meta.textContent = `Paid on: ${when}`;
  }
});
