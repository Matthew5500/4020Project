// assets/js/checkout.js
// Checkout page: show only ended items that the current user has WON and NOT yet PAID.

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Get logged-in user ---
  let user = null;
  try {
    user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {
    console.error("Failed to parse user from storage", e);
  }

  if (!user || !user.userId) {
    // No user → send back to login/home
    window.location.href = "index.html";
    return;
  }

  // --- 2. Grab DOM elements (be lenient if some are missing) ---
  const listContainer =
    document.getElementById("checkout-items") ||
    document.querySelector("[data-checkout-items]");

  const emptyMessage =
    document.getElementById("checkout-empty") ||
    document.querySelector("[data-checkout-empty]");

  const errorBox =
    document.getElementById("checkout-error") ||
    document.querySelector("[data-checkout-error]");

  if (!listContainer) {
    console.error(
      "Checkout: cannot find container with id 'checkout-items' or [data-checkout-items]"
    );
    return;
  }

  // Helper to show/hide empty state
  function showEmptyState(show) {
    if (!emptyMessage) return;
    emptyMessage.style.display = show ? "block" : "none";
  }

  function showError(msg) {
    console.error(msg);
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = "block";
    } else {
      alert(msg);
    }
  }

  // --- 3. Render a single item row/card ---
  function renderItem(item) {
    const row = document.createElement("div");
    row.className = "checkout-item-row";

    // Simple layout: title + price + "Pay" button
    row.innerHTML = `
      <div class="checkout-item-main">
        <div class="checkout-item-title">${item.title || "(no title)"}</div>
        <div class="checkout-item-meta">
          <span>Item ID: ${item.itemId}</span>
          <span>Type: ${item.auctionType}</span>
        </div>
      </div>
      <div class="checkout-item-price">
        <span class="label">Amount due:</span>
        <span class="value">$${(item.currentPrice ?? item.startingPrice ?? 0).toFixed(2)}</span>
      </div>
      <div class="checkout-item-action">
        <a class="btn btn-primary" href="pay.html?itemId=${item.itemId}">
          Pay now
        </a>
      </div>
    `;

    return row;
  }

  // --- 4. Load items from API and filter ---
  async function loadCheckoutItems() {
    showEmptyState(false);
    listContainer.innerHTML = "";

    try {
      // Uses AA.api helper from common.js
      const items = await AA.api("/items/ended");

      if (!Array.isArray(items)) {
        showError("Unexpected response from /api/items/ended");
        return;
      }

      // Core fix:
      // Only show items:
      //  - winner is the current user
      //  - auction has ended (already guaranteed by /ended)
      //  - paymentStatus is UNPAID
      const myUnpaidWins = items.filter(
        (item) =>
          item.currentWinnerId === user.userId &&
          item.paymentStatus === "UNPAID"
      );

      if (myUnpaidWins.length === 0) {
        showEmptyState(true);
        return;
      }

      myUnpaidWins.forEach((item) => {
        const row = renderItem(item);
        listContainer.appendChild(row);
      });
    } catch (err) {
      console.error(err);
      showError("Failed to load your items to pay. Please try again.");
    }
  }

  // --- 5. Kick everything off ---
  loadCheckoutItems();
});
