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
  const endedSection = document.getElementById("ended-section");
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

  // ---- Load item details (used by UC3 & UC4) ----
  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      currentItem = item;

      const winningPrice =
        firstField(item, ["currentPrice", "finalPrice", "price"]) || 0;

      // 🔹 Try many possible field names so we actually pick up your $50 value
      const baseShipping = firstField(
        item,
        [
          // exact DB / typical entity names
          "ship_cost_std",
          "shipCostStd",
          // older generic guesses (keep as fallbacks)
          "shippingCost",
          "shipping_cost",
          "shipping",
          "shippingRegular",
          "shipping_regular",
          "baseShipping",
        ],
        0
      );
      
      const expShipping = firstField(
        item,
        [
          // exact DB / typical entity names
          "ship_cost_exp",
          "shipCostExp",
          // generic fallbacks
          "expeditedShippingCost",
          "expedited_shipping_cost",
          "expeditedShipping",
          "shippingExpedited",
          "shipping_expedited",
        ],
        0
      );
      
      const shippingDays = firstField(
        item,
        [
          "ship_days",   // DB column
          "shipDays",    // typical entity name
          "shippingDays",
          "shipping_time_days",
        ],
        null
      );

      elTitle.textContent = item.title;
      elDesc.textContent = item.description || "No description.";
      elImg.src =
        item.imageUrl ||
        item.coverImageUrl ||
        "https://picsum.photos/seed/placeholder/600/400";

      elPrice.textContent = AA.formatMoney(
        item.currentPrice || item.startingPrice || item.price
      );
      elType.textContent = item.auctionType;
      elStatus.textContent = item.status;
      elEnd.textContent =
        AA.formatDateTime(item.endTime) +
        (item.status === "ACTIVE"
          ? ` (${AA.timeRemaining(item.endTime)})`
          : "");
      elSeller.textContent = `Seller #${
        firstField(item, ["sellerId", "ownerId", "userId"], "?")
      }`;

      // reset sections
      forwardSection?.classList.add("hidden");
      dutchSection?.classList.add("hidden");
      endedSection?.classList.add("hidden");

      // Active auctions -> show correct bidding UI
      if (item.status === "ACTIVE") {
        if (item.auctionType === "FORWARD") {
          forwardSection?.classList.remove("hidden");
          await loadBids();
        } else if (item.auctionType === "DUTCH") {
          dutchSection?.classList.remove("hidden");
        }
        payBtn?.classList.add("hidden");
      }

      // Ended auctions -> UC4: auction ended / Pay Now page
      if (item.status === "ENDED") {
        endedSection?.classList.remove("hidden");

        if (winnerInfo) {
          if (item.currentWinnerId) {
            winnerInfo.textContent = `Winner: user #${
              item.currentWinnerId
            } • Winning price: ${AA.formatMoney(winningPrice)}`;
          } else {
            winnerInfo.textContent =
              "No winner – item had no valid bids or accepts.";
          }
        }

        // Shipping + expedited option (UC4)
        if (expeditedLabel) {
          if (expShipping && expShipping > 0) {
            expeditedLabel.textContent = `Expedited shipping (+${AA.formatMoney(
              expShipping
            )})`;
          } else {
            expeditedLabel.textContent =
              "Expedited shipping (+$0 – not configured)";
          }
        }

        // Show Pay Now only to winner
        if (payBtn && item.currentWinnerId === user.userId) {
          payBtn.classList.remove("hidden");
        } else {
          payBtn?.classList.add("hidden");
        }
      }

      // Seller controls
      const ownerId = firstField(item, ["sellerId", "ownerId", "userId"]);
      if (sellerControls) {
        if (ownerId === user.userId && item.status === "ACTIVE") {
          sellerControls.classList.remove("hidden");
        } else {
          sellerControls.classList.add("hidden");
        }
      }

      // Cache shipping info for checkout step
      currentItem._checkoutInfo = {
        itemId,
        title: item.title,
        winningPrice,
        baseShipping,
        expShipping,
        shippingDays,
      };
    } catch (err) {
      console.error("Load item failed:", err);
      if (AA.showToast) {
        AA.showToast(
          "Failed to load item: " + (err.message || "Bad Request"),
          "error"
        );
      } else {
        alert("Failed to load item.");
      }
    }
  }

  // ---- Load bids (forward auctions) ----
  async function loadBids() {
    if (!bidList) return;
    try {
      const bids = await AA.api(
        `/items/${encodeURIComponent(itemId)}/bids`
      );
      bidList.innerHTML = "";
      if (!bids.length) {
        bidList.innerHTML =
          "<li class='aa-muted small'>No bids yet. Be the first!</li>";
        return;
      }
      bids.forEach((b) => {
        const li = document.createElement("li");
        li.textContent = `${AA.formatMoney(b.amount)} by user #${
          b.bidderId
        } at ${AA.formatDateTime(b.bidTime)}`;
        bidList.appendChild(li);
      });
    } catch (err) {
      console.error("Load bids failed:", err);
      bidList.innerHTML =
        "<li class='aa-muted small'>Failed to load bids.</li>";
    }
  }

  // ---- Forward bidding submit (UC3.1) ----
  if (bidForm && bidAmountInput) {
    bidForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      bidMsg.textContent = "";

      if (!currentItem) {
        AA.showToast("Item not loaded yet.", "error");
        return;
      }

      const raw = bidAmountInput.value.trim();
      const amount = Number(raw);

      if (!raw || Number.isNaN(amount) || amount <= 0) {
        AA.showToast("Please enter a positive bid amount.", "error");
        return;
      }

      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/bids`, {
          method: "POST",
          body: {
            bidderId: user.userId,
            amount: amount,
          },
        });

        AA.showToast(
          "Bid placed successfully. Page will refresh.",
          "success"
        );
        bidAmountInput.value = "";
        await loadItem();
        await loadBids();
      } catch (err) {
        console.error("Bid failed:", err);
        bidMsg.textContent = err.message || "Bid failed.";
        AA.showToast(
          "Bid failed: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }

  // ---- Dutch auction controls (UC3.2) ----
  if (btnDutchPrice && dutchPriceLabel) {
    btnDutchPrice.addEventListener("click", async () => {
      dutchMsg.textContent = "";
      try {
        const data = await AA.api(
          `/items/${encodeURIComponent(itemId)}/dutch/price`
        );
        dutchPriceLabel.textContent = AA.formatMoney(data.currentPrice);
      } catch (err) {
        console.error("Dutch price failed:", err);
        dutchMsg.textContent = err.message || "Failed to load price.";
        AA.showToast(
          "Failed to load Dutch price: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }

  if (btnDutchAccept) {
    btnDutchAccept.addEventListener("click", async () => {
      dutchMsg.textContent = "";
      try {
        await AA.api(
          `/items/${encodeURIComponent(itemId)}/dutch/accept`,
          {
            method: "POST",
            body: { buyerId: user.userId },
          }
        );
        AA.showToast(
          "You accepted the current Dutch price. Auction will end.",
          "success"
        );
        await loadItem();
      } catch (err) {
        console.error("Dutch accept failed:", err);
        dutchMsg.textContent = err.message || "Failed to accept price.";
        AA.showToast(
          "Failed to accept Dutch price: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }

  // ---- Seller: end auction manually ----
  if (btnEndAuction) {
    btnEndAuction.addEventListener("click", async () => {
      sellerMsg.textContent = "";
      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/end`, {
          method: "POST",
        });
        AA.showToast("Auction ended.", "success");
        await loadItem();
      } catch (err) {
        console.error("End auction failed:", err);
        sellerMsg.textContent = err.message || "Failed to end auction.";
        AA.showToast(
          "Failed to end auction: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }

  // ---- Pay Now → UC5 Payment page ----
  if (payBtn) {
    payBtn.addEventListener("click", () => {
      if (!currentItem || !currentItem._checkoutInfo) {
        AA.showToast(
          "Item details not ready for payment yet.",
          "error"
        );
        return;
      }

      const info = currentItem._checkoutInfo;
      const expedited = expeditedCheckbox?.checked || false;

      // Save checkout info for pay.html
      const checkout = {
        itemId: info.itemId,
        title: info.title,
        winningPrice: info.winningPrice,
        baseShipping: info.baseShipping,
        expShipping: info.expShipping,
        shippingDays: info.shippingDays,
        expeditedSelected: expedited,
      };

      sessionStorage.setItem("checkout", JSON.stringify(checkout));

      window.location.href = "pay.html";
    });
  }

  // Initial load
  loadItem();
});
