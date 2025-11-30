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
    AA.showToast(
      "Something went wrong loading the checkout. Redirecting to Browse.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  // ----- DOM elements -----
  const elTitle = document.getElementById("pay-item-title");
  const elPrice = document.getElementById("pay-winning-price");
  const elShipRegular = document.getElementById("pay-ship-regular");
  const elShipTime = document.getElementById("pay-shipping-time");
  const elUserName = document.getElementById("pay-user-name");
  const elUserAddress = document.getElementById("pay-user-address");
  const elExpCheckbox = document.getElementById("pay-expedited");
  const elExpLabel = document.getElementById("pay-expedited-label");
  const elExpPrice = document.getElementById("pay-exp-price");
  const elTotal = document.getElementById("pay-total");
  const elForm = document.getElementById("pay-form");
  const elError = document.getElementById("pay-error");

  const elCardNumber = document.getElementById("card-number");
  const elCardName = document.getElementById("card-name");
  const elCardExpiry = document.getElementById("card-expiry");
  const elCardCvv = document.getElementById("card-cvv");

  // ----- apply shipping overrides from localStorage -----
  let baseShipping = Number(checkout.baseShipping || 0);
  let expShipping = Number(checkout.expShipping || 0);
  let shippingDays =
    typeof checkout.shippingDays === "number"
      ? checkout.shippingDays
      : null;

  try {
    const rawOverrides = localStorage.getItem("aaShippingOverrides");
    if (rawOverrides) {
      const overrides = JSON.parse(rawOverrides);
      const override = overrides[String(checkout.itemId)];
      if (override) {
        if (override.baseShipping != null) {
          baseShipping = Number(override.baseShipping);
        }
        if (override.expShipping != null) {
          expShipping = Number(override.expShipping);
        }
        if (override.shippingDays != null) {
          shippingDays = override.shippingDays;
        }
      }
    }
  } catch (e) {
    console.warn("Could not read shipping overrides:", e);
  }

  // keep checkout in sync for receipt.js
  checkout.baseShipping = baseShipping;
  checkout.expShipping = expShipping;
  checkout.shippingDays = shippingDays;

  // ----- fill basic summary -----
  if (elTitle) elTitle.textContent = checkout.title || "Unknown item";
  if (elPrice) elPrice.textContent = AA.formatMoney(checkout.finalPrice || 0);

  if (elShipRegular) {
    elShipRegular.textContent = AA.formatMoney(baseShipping || 0);
  }
  if (elExpPrice) {
    elExpPrice.textContent = AA.formatMoney(expShipping || 0);
  }

  if (elShipTime) {
    if (typeof shippingDays === "number") {
      elShipTime.textContent = `The item will be shipped in approximately ${shippingDays} day(s).`;
    } else {
      elShipTime.textContent =
        "The item will be shipped in a few days (shipping time not specified).";
    }
  }

  if (elUserName) {
    const nameParts = [];
    if (user.firstName) nameParts.push(user.firstName);
    if (user.lastName) nameParts.push(user.lastName);
    const full = nameParts.join(" ") || user.username || `user #${user.userId}`;
    elUserName.textContent = full;
  }

  if (elUserAddress) {
    // You can improve this later if you actually store addresses.
    elUserAddress.textContent = "No address on file (from Sign-Up).";
  }

  // Disable expedited if there's no extra cost configured
  const hasExp = expShipping > 0;
  if (elExpCheckbox) {
    elExpCheckbox.disabled = !hasExp;
    elExpCheckbox.checked = hasExp && !!checkout.expeditedSelected;
  }

  // ----- helper to compute totals -----
  function computeTotals() {
    const price = Number(checkout.finalPrice || 0);

    const useExp = elExpCheckbox && elExpCheckbox.checked && hasExp;

    const shipChosen = useExp ? expShipping : baseShipping;
    const shippingTotal = shipChosen;
    const grandTotal = price + shippingTotal;

    return { shippingTotal, grandTotal, expedited: useExp };
  }

  function renderTotals() {
    const { grandTotal, expedited } = computeTotals();
    if (elTotal) {
      elTotal.textContent = AA.formatMoney(grandTotal);
    }

    // Grey/white toggling
    if (elShipRegular && elExpLabel) {
      if (expedited) {
        elExpLabel.classList.remove("aa-muted");
        elShipRegular.classList.add("aa-muted");
      } else {
        elExpLabel.classList.add("aa-muted");
        elShipRegular.classList.remove("aa-muted");
      }
    }
  }

  if (elExpCheckbox) {
    elExpCheckbox.addEventListener("change", renderTotals);
  }
  renderTotals();

  // ----- very simple card validation -----
  function validateCard() {
    const number = elCardNumber.value.replace(/\s+/g, "");
    const name = elCardName.value.trim();
    const expiry = elCardExpiry.value.trim();
    const cvv = elCardCvv.value.trim();

    if (!number || number.length < 12 || !/^\d+$/.test(number)) {
      return "Enter a valid card number (at least 12 digits).";
    }
    if (!name) {
      return "Enter the name on the card.";
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      return "Enter expiry as MM/YY.";
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      return "Enter a 3–4 digit CVV.";
    }
    return null;
  }

  // ----- submit handler -----
  if (elForm) {
    elForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (elError) elError.textContent = "";

      const cardError = validateCard();
      if (cardError) {
        if (elError) elError.textContent = cardError;
        AA.showToast(cardError, "error");
        return;
      }

      const { grandTotal, expedited } = computeTotals();

      try {
        const receipt = await AA.api(`/items/${checkout.itemId}/pay`, {
          method: "POST",
          body: {
            payerId: user.userId,
            method: "CARD",
            note: expedited ? "EXPEDITED" : "STANDARD",
          },
        });

        // Build a combined client-side receipt for the receipt page
        const lastReceipt = {
          itemTitle: checkout.title,
          finalPrice: checkout.finalPrice,
          baseShipping,
          expShipping,
          grandTotal,
          shippingDays,
          paidAt: receipt.paymentTime || new Date().toISOString(),
        };

        sessionStorage.setItem(
          "lastReceipt",
          JSON.stringify(lastReceipt)
        );

        AA.showToast("Payment successful. Showing receipt.", "success");
        window.location.href = "receipt.html";
      } catch (err) {
        console.error("Payment failed:", err);
        const msg =
          (err && err.message) || "Payment failed. Please try again.";
        if (elError) elError.textContent = msg;
        AA.showToast(msg, "error");
      }
    });
  }
});
