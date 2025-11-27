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

  const container = document.getElementById("receipt-content");

  async function loadReceipt() {
    try {
      const r = await AA.api(
        `/items/${encodeURIComponent(itemId)}/receipt`
      );
      container.innerHTML = `
        <p><strong>Item:</strong> ${r.title}</p>
        <p><strong>Auction type:</strong> ${r.auctionType}</p>
        <p><strong>Status:</strong> ${r.status}</p>
        <p><strong>Final price:</strong> ${AA.formatMoney(r.finalPrice)}</p>
        <p><strong>Payment status:</strong> ${r.paymentStatus}</p>
        <p><strong>Payment time:</strong> ${
          r.paymentTime ? AA.formatDateTime(r.paymentTime) : "Not paid"
        }</p>
        <h3>Shipping Details</h3>
        <p>The item will be shipped in ${
          r.shipDays != null ? r.shipDays : "N"
        } days.</p>
      `;
    } catch (err) {
      container.innerHTML = `<p class="aa-muted small">Failed to load receipt: ${err.message}</p>`;
    }
  }

  loadReceipt();
});