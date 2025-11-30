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
  } catch (e) {
    console.error("Failed to parse checkout object:", e);
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

  // ----- core values -----
  const winningPrice =
    Number(checkout.winningPrice ?? checkout.finalPrice ?? 0);

  let baseShipping = 0;
  let expShipping = 0;
  let shippingDays = null;
  let hasExp = false;

  // Read any overrides stored when the item was created on Sell page
  function applyShippingOverrides() {
    try {
      const rawOverrides = localStorage.getItem("aaShippingOverrides");
      if (!rawOverrides) return;
      const overrides = JSON.parse(rawOverrides);
      const override = overrides[String(checkout.itemId)];
      if (!override) return;

      if (override.baseShipping != null) {
        baseShipping = Number(override.baseShipping);
      }
      if (override.expShipping != null) {
        expShipping = Number(override.expShipping);
      }
      if (override.shippingDays != null) {
        shippingDays = Number(override.shippingDays);
      }
    } catch (e) {
      console.warn("Could not read shipping overrides:", e);
    }
  }

  function recalcTotal() {
    const useExp =
      elExpCheckbox && elExpCheckbox.checked && hasExp;
    const ship = useExp ? expShipping : baseShipping;
    const total = winningPrice + ship;
    if (elTotal) elTotal.textContent = AA.formatMoney(total);
  }

  function populateUI() {
    if (elTitle) elTitle.textContent = checkout.title || "Unknown item";

    if (elPrice) elPrice.textContent = AA.formatMoney(winningPrice);
    if (elShipRegular)
      elShipRegular.textContent = AA.formatMoney(baseShipping || 0);
    if (elExpPrice)
      elExpPrice.textContent = AA.formatMoney(expShipping || 0);

    if (elShipTime) {
      if (typeof shippingDays === "number" && !Number.isNaN(shippingDays)) {
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
      elUserAddress.textContent = "No address on file (from Sign-Up).";
    }

    hasExp = expShipping > 0;

    if (elExpCheckbox) {
      elExpCheckbox.disabled = !hasExp;
      elExpCheckbox.checked = hasExp && !!checkout.expeditedSelected;
    }
    if (elExpLabel) {
      if (!hasExp) {
        elExpLabel.classList.add("aa-muted");
      } else {
        elExpLabel.classList.remove("aa-muted");
      }
    }

    recalcTotal();
  }

  // ----- initialise shipping values -----
  (async () => {
    // Start with whatever came from checkout
    baseShipping = Number(checkout.baseShipping || 0);
    expShipping = Number(checkout.expShipping || 0);
    shippingDays =
      typeof checkout.shippingDays === "number"
        ? checkout.shippingDays
        : null;

    // 🔹 Try to pull shipping from backend item (DB)
    try {
      const item = await AA.api(`/items/${checkout.itemId}`);
      if (item) {
        const std =
          item.shipCostStd ??
          item.ship_cost_std ??
          item.shippingCost ??
          item.shipping_cost;
        const exp =
          item.shipCostExp ??
          item.ship_cost_exp ??
          item.expeditedShippingCost ??
          item.expedited_shipping_cost;
        const days =
          item.shipDays ??
          item.ship_days ??
          item.shippingDays ??
          item.shipping_time_days;

        if (std != null && !Number.isNaN(Number(std))) {
          baseShipping = Number(std);
        }
        if (exp != null && !Number.isNaN(Number(exp))) {
          expShipping = Number(exp);
        }
        if (days != null && !Number.isNaN(Number(days))) {
          shippingDays = Number(days);
        }
      }
    } catch (e) {
      console.warn("Could not load item for shipping info:", e);
    }

    // 🔹 Then apply any client-side overrides from Sell page
    applyShippingOverrides();

    // Finally show everything
    populateUI();
  })();

  if (elExpCheckbox) {
    elExpCheckbox.addEventListener("change", () => {
      checkout.expeditedSelected = !!elExpCheckbox.checked;
      sessionStorage.setItem("checkout", JSON.stringify(checkout));
      recalcTotal();
    });
  }

  // ----- fake payment submission -----
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
            "Please fill in card details (this is only a simulated payment).";
        }
        return;
      }

      try {
        const useExp =
          elExpCheckbox && elExpCheckbox.checked && hasExp;

        const body = {
          payerId: user.userId,
          method: "CARD",
          note: useExp
            ? "Expedited shipping selected"
            : "Regular shipping selected",
        };

        const receipt = await AA.api(
          `/items/${checkout.itemId}/pay`,
          {
            method: "POST",
            body,
          }
        );

        // Store receipt info for the receipt page
        const lastReceipt = {
          itemId: checkout.itemId,
          itemTitle: checkout.title,
          finalPrice: winningPrice,
          baseShipping,
          expShipping,
          shippingDays,
          expeditedSelected: useExp,
          paidAt: receipt.paymentTime || null,
        };
        sessionStorage.setItem(
          "lastReceipt",
          JSON.stringify(lastReceipt)
        );

        // 🔹 Mark this item as paid in localStorage so Checkout can hide it
        try {
          let paidIds = [];
          const rawPaid = localStorage.getItem("aaPaidItems");
          if (rawPaid) {
            paidIds = JSON.parse(rawPaid);
            if (!Array.isArray(paidIds)) paidIds = [];
          }
          if (!paidIds.includes(checkout.itemId)) {
            paidIds.push(checkout.itemId);
            localStorage.setItem(
              "aaPaidItems",
              JSON.stringify(paidIds)
            );
          }
        } catch (e) {
          console.warn("Could not update aaPaidItems:", e);
        }

        AA.showToast("Payment successful. Showing receipt.", "success");
        window.location.href = "receipt.html";
      } catch (err) {
        console.error("Payment failed:", err);
        if (elError) {
          elError.textContent =
            "Payment failed. Please try again in a moment.";
        }
        AA.showToast(
          "Payment failed: " + (err.message || "Server error"),
          "error"
        );
      }
    });
  }
});
