document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const itemId = AA.getQueryParam("id");
  if (!itemId) {
    alert("Missing item id.");
    window.location.href = "browse.html";
    return;
  }

  const summary = document.getElementById("pay-summary");
  const form = document.getElementById("pay-form");
  const msg = document.getElementById("pay-message");

  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      const basePrice = item.currentPrice || item.startingPrice;
      summary.innerHTML = `
        <p><strong>Item:</strong> ${item.title}</p>
        <p><strong>Winning bidder:</strong> user #${item.currentWinnerId}</p>
        <p><strong>Base price:</strong> ${AA.formatMoney(basePrice)}</p>
        <p><strong>Shipping (std/exp):</strong> ${
          item.shipCostStd != null ? AA.formatMoney(item.shipCostStd) : "N/A"
        } / ${
        item.shipCostExp != null ? AA.formatMoney(item.shipCostExp) : "N/A"
      }</p>
        <p><strong>Estimated ship time:</strong> ${
          item.shipDays != null ? item.shipDays + " days" : "N/A"
        }</p>
      `;
    } catch (err) {
      summary.innerHTML = `<p class="aa-muted small">Failed to load item: ${err.message}</p>`;
    }
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.textContent = "";

    const fd = new FormData(form);
    const cardNumber = fd.get("cardNumber");
    const last4 = cardNumber.replace(/\s+/g, "").slice(-4) || "0000";
    const shipMethod = fd.get("shipMethod") || "STANDARD";

    try {
      const receipt = await AA.api(`/items/${encodeURIComponent(itemId)}/pay`, {
        method: "POST",
        body: {
          payerId: user.userId,
          method: shipMethod,
          note: `Fake card ****${last4}`,
        },
      });
      msg.textContent = "Payment successful.";
      window.location.href = `receipt.html?id=${encodeURIComponent(
        receipt.itemId
      )}`;
    } catch (err) {
      msg.textContent = "Payment failed: " + err.message;
    }
  });

  loadItem();
});