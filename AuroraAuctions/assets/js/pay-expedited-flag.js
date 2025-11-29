// assets/js/pay-expedited-flag.js
// Runs on pay.html. If the user arrived via "Pay Now + Expedited Shipping",
// it auto-checks the expedited shipping checkbox and triggers any existing
// change listeners so totals recalc correctly.

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    let expeditedFlag = null;

    try {
      expeditedFlag = sessionStorage.getItem("aurora_expeditedShipping");
    } catch (e) {
      expeditedFlag = null;
    }

    if (expeditedFlag !== "true") {
      // Nothing to do; clear any stale flag and exit
      try {
        sessionStorage.removeItem("aurora_expeditedShipping");
      } catch (e) {}
      return;
    }

    // We only reach here if the user chose expedited on the previous page.

    // Try several likely selectors for the expedited checkbox.
    const selectors = [
      'input[type="checkbox"][data-role="expedited-shipping"]',
      "#expeditedShipping",
      "#expedited-shipping",
      "#expeditedShippingCheckbox",
      'input[type="checkbox"][name*="exped"]',
      'input[type="checkbox"][id*="exped"]'
    ];

    let checkbox = null;

    for (const sel of selectors) {
      checkbox = document.querySelector(sel);
      if (checkbox) break;
    }

    if (checkbox) {
      checkbox.checked = true;

      // Fire a change event so any existing JS recalculates totals
      const evt = new Event("change", { bubbles: true });
      checkbox.dispatchEvent(evt);
    }

    // Clear the flag so refresh or later visits don't force expedited
    try {
      sessionStorage.removeItem("aurora_expeditedShipping");
    } catch (e) {}
  });
})();
