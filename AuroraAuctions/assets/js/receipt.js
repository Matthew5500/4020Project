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
    AA.showToast(
      "No receipt",
      "There is no recent payment to show.",
      "info"
    );
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem("lastReceipt");
    if (box) {
      box.innerHTML =
        "<p class='aa-muted'>Receipt data was corrupted. Please try paying again.</p>";
    }
    AA.showToast("Receipt error", "Could not read saved receipt.", "error");
    return;
  }

  const { itemId, receipt } = payload;

  if (box) {
    box.innerHTML = `
      <h2>Payment receipt</h2>
      <p><strong>Item ID:</strong> ${itemId}</p>
      <p><strong>Payer ID:</strong> ${receipt?.payerId ?? user.userId}</p>
      <p><strong>Amount:</strong> ${
        receipt?.amount
          ? AA.formatMoney(receipt.amount)
          : "See auction final price"
      }</p>
      <p><strong>Method:</strong> ${receipt?.method || "FAKE_CARD"}</p>
      <p><strong>Note:</strong> ${
        receipt?.note || "Test payment, no real card"
      }</p>
    `;
  }

  if (meta) {
    meta.textContent = `Paid on: ${
      receipt?.paidAt
        ? AA.formatDateTime(receipt.paidAt)
        : new Date().toLocaleString()
    }`;
  }
});
