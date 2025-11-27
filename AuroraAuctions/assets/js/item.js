// assets/js/item.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  // Flexible query param handling (?id=, ?itemId=, ?item_id=)
  const rawId =
    AA.getQueryParam("id") ||
    AA.getQueryParam("itemId") ||
    AA.getQueryParam("item_id");

  const itemId = rawId && rawId !== "undefined" ? rawId : null;

  if (!itemId) {
    if (AA.showToast) {
      AA.showToast(
        "Missing or invalid item id. Redirecting to Browse.",
        "error"
      );
    }
    window.location.href = "browse.html";
    return;
  }

  // DOM references
  const elTitle = document.getElementById("item-title");
  const elDesc = document.getElementById("item-description");
  const elImg = document.getElementById("item-image");
  const elPrice = document.getElementById("item-price");
  const elType = document.getElementById("item-type");
  const elStatus = document.getElementById("item-status");
  const elEnd = document.getElementById("item-end");
  const elSeller = document.getElementById("item-seller");

  const forwardSection = document.getElementById("forward-section");
  const dutchSection = document.getElementById("dutch-section");

  const winnerInfo = document.getElementById("winner-info");

  const payBtn = document.getElementById("btn-pay-now");
  const expeditedCheckbox = document.getElementById("expedited-checkbox");
  const expeditedLabel = document.getElementById("expedited-label");

  const bidForm = document.getElementById("bid-form");
  const bidAmountInput = document.getElementById("bid-amount");
  const bidMsg = document.getElementById("bid-message");
  const bidList = document.getElementById("bid-list");

  const btnDutchPrice = document.getElementById("btn-dutch-price");
  const btnDutchAccept = document.getElementById("btn-dutch-accept");
  const dutchPriceLabel = document.getElementById("dutch-price");
  const dutchMsg = document.getElementById("dutch-message");

  const sellerControls = document.getElementById("seller-controls");
  const btnEndAuction = document.getElementById("btn-end-auction");
  const sellerMsg = document.getElementById("seller-message");

  let currentItem = null;

  // Helper to pick first non-null field name
  function firstField(obj, names, fallback = null) {
    for (const n of names) {
      if (obj[n] !== undefined && obj[n] !== null) return obj[n];
    }
    return fallback;
  }

  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      currentItem = item;

      const sellerId = firstField(
        item,
        ["sellerId", "ownerId", "owner_id", "seller_id"],
        "?"
      );

      const shippingDays = firstField(
        item,
        [
          "ship_days", // DB column
          "shipDays", // typical entity name
          "shippingDays",
          "shipping_time_days",
        ],
        null
      );

      const imageUrl = firstField(
        item,
        ["imageUrl", "coverImageUrl", "cover_image_url", "image_url"],
        "https://picsum.photos/seed/placeholder/600/400"
      );

      elTitle.textContent = item.title;
      elDesc.textContent = item.description || "No description.";
      elImg.src = imageUrl;

      elPrice.textContent = AA.formatMoney(
        item.currentPrice || item.startingPrice || item.price
      );
      elType.textContent = item.auctionType;
      elStatus.textContent = item.status;

      const updateEndText = () => {
        const base = AA.formatDateTime(item.endTime);
        if (!base || base === "—") {
          elEnd.textContent = base;
          elEnd.classList.remove("aa-time-warning", "aa-time-danger");
          return;
        }

        // If the auction is no longer active, just show the end date/time.
        if (item.status !== "ACTIVE") {
          elEnd.textContent = base;
          elEnd.classList.remove("aa-time-warning", "aa-time-danger");
          return;
        }

        const end = AA.parseAuctionTime
          ? AA.parseAuctionTime(item.endTime)
          : new Date(item.endTime);
        if (!end || isNaN(end.getTime())) {
          elEnd.textContent = base;
          elEnd.classList.remove("aa-time-warning", "aa-time-danger");
          return;
        }

        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        if (diffMs <= 0) {
          elEnd.textContent = `${base} (Ended)`;
          elEnd.classList.remove("aa-time-warning", "aa-time-danger");
          return;
        }

        const totalSecs = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        elEnd.textContent = `${base} (${h}h ${m}m ${s}s)`;

        const minutesLeft = totalSecs / 60;
        elEnd.classList.remove("aa-time-warning", "aa-time-danger");
        if (minutesLeft <= 5) {
          elEnd.classList.add("aa-time-danger");
        } else if (minutesLeft <= 10) {
          elEnd.classList.add("aa-time-warning");
        }
      };

      updateEndText();
      setInterval(updateEndText, 1000);

      elSeller.textContent = `Seller #${sellerId}`;

      // The rest of your existing bidding / Dutch / seller control logic remains unchanged
      // ...
      // (Assuming your original file had all the UC3.x logic here; keep it as-is.)

    } catch (err) {
      console.error("Load item error:", err);
      if (AA.showToast) {
        AA.showToast("Failed to load item.", err.message, "error");
      }
    }
  }

  // ... keep your existing bidding / Dutch auction / pay now logic here ...

  loadItem();
});