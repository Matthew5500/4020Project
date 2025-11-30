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

  // ----- pull values from checkout -----

  let baseShipping = Number(checkout.baseShipping || 0);
  let expShipping = Number(checkout.expShipping || 0);
  let shippingDays =
    typeof checkout.shippingDays === "number"
      ? checkout.shippingDays
      : null;

  // Try to override shipping from localStorage (set when you created the item)
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

  // ----- populate summary -----

  if (elTitle) {
    elTitle.textContent = checkout.title || "Unknown item";
  }

  // Winning price
  if (elPrice)
    elPrice.textContent = AA.formatMoney(
      checkout.winningPrice ?? checkout.finalPrice ?? 0
    );

  if (elShipRegular) {
    elShipRegular.textContent = AA.formatMoney(baseShipping || 0);
  }
  if (elExpPrice) {
    elExpPrice.textContent = AA.formatMoney(expShipping || 0);
  }

  // NEW: nice, compact ship time text
  if (elShipTime) {
    if (typeof shippingDays === "number") {
      elShipTime.textContent = `${shippingDays} day(s)`;
    } else {
      elShipTime.textContent = "Not specified";
    }
  }

  if (elUserName) {
    const nameParts = [];
    if (user.firstName) nameParts.push(user.firstName);
    if (user.lastName) nameParts.push(user.lastName);
    const full =
      nameParts.join(" ") || user.username || `user #${user.userId}`;
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
  if (elExpLabel && !hasExp) {
    elExpLabel.classList.add("aa-muted");
  }

  function recalcTotal() {
    const price = Number(
      checkout.winningPrice ?? checkout.finalPrice ?? 0
    );
    const useExp = elExpCheckbox && elExpCheckbox.checked && hasExp;
    const ship = useExp ? expShipping : baseShipping;
    const total = price + ship;
    if (elTotal) {
      elTotal.textContent = AA.formatMoney(total);
    }
  }

  if (elExpCheckbox) {
    elExpCheckbox.addEventListener("change", () => {
      checkout.expeditedSelected = !!elExpCheckbox.checked;
      sessionStorage.setItem("checkout", JSON.stringify(checkout));
      recalcTotal();
    });
  }

  recalcTotal();

  // ----- fake payment form -----

  if (elForm) {
    elForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (elError) elError.textContent = "";

      const cardNumber = (elCardNumber?.value || "").trim();
      const cardName = (elCardName?.value || "").trim();
      const cardExpiry = (elCardExpiry?.value || "").trim();
      const cardCvv = (elCardCvv?.value || "").trim();

      if (
        !cardNumber ||
        !cardName ||
        !cardExpiry ||
        !cardCvv ||
        cardNumber.length < 8
      ) {
        if (elError) {
          elError.textContent =
            "Please enter a realistic-looking card; this is not a real payment.";
        }
        return;
      }

      try {
        const receipt = await AA.api(
          `/items/${checkout.itemId}/pay`,
          {
            method: "POST",
            body: {
              payerId: user.userId,
              paymentMethod: "CARD",
              note: checkout.expeditedSelected
                ? "Expedited shipping selected"
                : "Regular shipping selected",
            },
          }
        );

        const lastReceipt = {
          itemId: checkout.itemId,
          itemTitle: checkout.title,
          // store the amount the user actually paid
          finalPrice: checkout.winningPrice ?? checkout.finalPrice,
          baseShipping,
          expShipping,
          shippingDays,
          expeditedSelected: !!checkout.expeditedSelected,
          paidAt: receipt.paymentTime || null,
        };
        sessionStorage.setItem(
          "lastReceipt",
          JSON.stringify(lastReceipt)
        );

        window.location.href = "receipt.html";
      } catch (err) {
        console.error("Payment failed:", err);
        if (elError) {
          elError.textContent =
            "Payment failed: " + (err.message || "Server error");
        }
      }
    });
  }
});
