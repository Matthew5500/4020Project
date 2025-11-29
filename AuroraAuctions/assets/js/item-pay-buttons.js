// assets/js/item-pay-buttons.js
// Enhances the ended-auction view on the item (bidding) page:
// - Removes the expedited checkbox on this page
// - Centers the Pay Now button
// - Adds a "Pay Now + Expedited Shipping" button
// - Sends a flag via sessionStorage so pay.html knows whether to auto-check expedited

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // Try to find the bidding card container
    const biddingCard =
      document.querySelector(".bidding-card") ||
      document.querySelector("#bidding-card") ||
      document.querySelector('[data-role="bidding-card"]');

    if (!biddingCard) {
      // Nothing to enhance on this page
      return;
    }

    // --- 1. Remove the expedited checkbox + label on the item page ---

    // Look for a checkbox inside the bidding card (there should only be one)
    const expeditedCheckbox = biddingCard.querySelector('input[type="checkbox"]');

    if (expeditedCheckbox) {
      // Try to remove its label too (if there is one)
      let label = null;

      // Case 1: wrapped in a <label>
      label = expeditedCheckbox.closest("label");

      // Case 2: plain checkbox followed by a text node / label element
      if (!label && expeditedCheckbox.nextElementSibling) {
        const next = expeditedCheckbox.nextElementSibling;
        // If it looks like a label-ish element, remove that too
        if (
          next.tagName === "LABEL" ||
          next.className.toLowerCase().includes("label") ||
          next.textContent.toLowerCase().includes("expedited")
        ) {
          label = next;
        }
      }

      // Remove label first, then checkbox
      if (label && label.parentNode) {
        label.parentNode.removeChild(label);
      }
      if (expeditedCheckbox.parentNode) {
        expeditedCheckbox.parentNode.removeChild(expeditedCheckbox);
      }
    }

    // --- 2. Find the existing "Pay Now" button ---

    let payNowBtn = null;

    const allButtons = Array.from(biddingCard.querySelectorAll("button, a"));

    for (const btn of allButtons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text === "pay now") {
        payNowBtn = btn;
        break;
      }
    }

    if (!payNowBtn) {
      // No Pay Now button on this page (e.g., auction not ended)
      return;
    }

    // --- 3. Create a wrapper to center the buttons ---

    const wrapper = document.createElement("div");
    wrapper.className = "pay-actions-wrapper";

    // Inline styles so we don't have to touch CSS files
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.gap = "0.75rem";
    wrapper.style.marginTop = "1.25rem";

    // Insert wrapper before the existing Pay Now button, then move the button inside
    const originalParent = payNowBtn.parentNode;
    if (!originalParent) {
      return;
    }
    originalParent.insertBefore(wrapper, payNowBtn);
    wrapper.appendChild(payNowBtn);

    // --- 4. Create the "Pay Now + Expedited Shipping" button ---

    const payNowExpBtn = payNowBtn.cloneNode(true);

    // Update the button text
    payNowExpBtn.textContent = "Pay Now + Expedited Shipping";

    // Make sure it has a distinct id (so we don't duplicate IDs)
    if (payNowBtn.id) {
      payNowExpBtn.id = payNowBtn.id + "-expedited";
    }

    wrapper.appendChild(payNowExpBtn);

    // --- 5. Wire up navigation for both buttons ---

    function getItemIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      // Support either ?itemId= or ?id=
      return params.get("itemId") || params.get("id");
    }

    const itemId = getItemIdFromUrl();
    if (!itemId) {
      // If we can't find an itemId, better not override existing behaviour
      return;
    }

    function goToPay(expedited) {
      // Store the user's choice so pay.html can auto-check the box
      try {
        sessionStorage.setItem(
          "aurora_expeditedShipping",
          expedited ? "true" : "false"
        );
      } catch (e) {
        // sessionStorage may fail in some privacy modes; ignore quietly
      }

      const payUrl = `pay.html?itemId=${encodeURIComponent(itemId)}`;
      window.location.href = payUrl;
    }

    // Remove any inline onclick to avoid double-handling
    payNowBtn.onclick = null;
    payNowExpBtn.onclick = null;

    // Standard shipping
    payNowBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      goToPay(false);
    });

    // Expedited shipping
    payNowExpBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      goToPay(true);
    });
  });
})();
