// assets/js/sell.js
// Handles UC7: create a new auction (Forward / Dutch) from the Sell page.

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) {
    return; // requireLogin will redirect
  }

  AA.initNav();

  const form = document.getElementById("sell-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    // ----- Read & normalize form fields -----
    const title = (formData.get("title") || "").trim();
    const description = (formData.get("description") || "").trim();
    const category = (formData.get("category") || "").trim();

    // In the HTML this is usually named conditionCode; fall back to "Used".
    const conditionCode =
      (formData.get("conditionCode") || formData.get("condition") || "USED").toString().trim();

    // Image URL (optional)
    const coverImageUrl =
      (formData.get("coverImageUrl") || formData.get("imageUrl") || "").toString().trim();

    const auctionType =
      (formData.get("auctionType") || "FORWARD").toString().trim().toUpperCase();

    // datetime-local value like "2025-12-01T22:00"
    const endTimeRaw =
      (formData.get("endTime") ||
        formData.get("auctionEndTime") ||
        "").toString().trim();

    const startingPriceRaw = (formData.get("startingPrice") || "").toString().trim();
    const minimumPriceRaw =
      (formData.get("minimumPrice") ||
        formData.get("reservePrice") ||
        "").toString().trim();

    const quantityRaw = (formData.get("quantity") || "1").toString().trim();

    const shipStdRaw = (formData.get("shipCostStd") || "").toString().trim();
    const shipExpRaw = (formData.get("shipCostExp") || "").toString().trim();
    const shipDaysRaw = (formData.get("shipDays") || "").toString().trim();

    // ----- Basic validation -----
    if (!title) {
      AA.showToast("Missing title", "Please enter a title for the item.", "error");
      return;
    }

    const startingPrice = Number(startingPriceRaw);
    if (!Number.isFinite(startingPrice) || startingPrice <= 0) {
      AA.showToast("Invalid starting price", "Please enter a positive number.", "error");
      return;
    }

    let minimumPrice = null;
    if (minimumPriceRaw) {
      const minNum = Number(minimumPriceRaw);
      if (!Number.isFinite(minNum) || minNum < 0) {
        AA.showToast(
          "Invalid minimum price",
          "Reserve / minimum price must be a non-negative number.",
          "error"
        );
        return;
      }
      minimumPrice = minNum;
    }

    const quantity = parseInt(quantityRaw, 10) || 1;

    const shipCostStd = Number(shipStdRaw || "0") || 0;
    const shipCostExp = Number(shipExpRaw || "0") || 0;
    const shipDays = shipDaysRaw ? parseInt(shipDaysRaw, 10) || 0 : 0;

    // ----- Build payload for /api/items -----
    // Only fields defined in ItemRequest are required by the backend.
    // Extra fields (conditionCode, shipping, etc.) are safely ignored
    // by the mid-tier but we keep them in case you extend ItemRequest later.
    const payload = {
      sellerId: user.userId,
      title,
      description,
      category: category || null,
      conditionCode,
      coverImageUrl: coverImageUrl || null,
      auctionType,
      startingPrice,
      minimumPrice,
      endTime: endTimeRaw || null,
      quantity,
      // These are not used by the current mid-tier ItemRequest but are
      // harmless extras that match the DB schema and front-end needs.
      shipCostStd,
      shipCostExp,
      shipDays,
    };

    try {
      const created = await AA.api("/items", {
        method: "POST",
        body: payload,
      });

      // The mid-tier returns ItemResponse with property "id" (not "itemId").
      const createdId = created.id ?? created.itemId;

      // ----- Save shipping overrides in localStorage -----
      // pay.js and checkout.js read from "aaShippingOverrides" to show
      // shipping costs and estimated ship time on the Payment and Receipt pages.
      // Previously this used created.itemId, which is undefined; that meant
      // overrides were stored under the key "undefined" and were never found.
      if (createdId != null) {
        try {
          const raw = localStorage.getItem("aaShippingOverrides") || "{}";
          const overrides = JSON.parse(raw);

          overrides[String(createdId)] = {
            baseShipping: shipCostStd,
            expShipping: shipCostExp,
            shippingDays: shipDays,
          };

          localStorage.setItem("aaShippingOverrides", JSON.stringify(overrides));
        } catch (err) {
          console.warn("Failed to store shipping overrides:", err);
        }
      }

      AA.showToast(
        "Auction created",
        "Your item has been listed successfully. Redirecting to the item page…",
        "success"
      );

      // Redirect to the new item's page
      if (createdId != null) {
        window.location.href = `item.html?id=${encodeURIComponent(createdId)}`;
      } else {
        // Fallback: go to Browse if we somehow didn't get an id.
        window.location.href = "browse.html";
      }
    } catch (err) {
      console.error("Create item failed:", err);
      AA.showToast("Failed to create auction", err.message || String(err), "error");
    }
  });
});
