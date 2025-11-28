// assets/js/item.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const itemId = AA.getQueryParam("id");
  if (!itemId) {
    AA.showToast("No item id provided.", "error");
    window.location.href = "browse.html";
    return;
  }

  const elTitle = document.getElementById("item-title");
  const elDesc = document.getElementById("item-description");
  const elImg = document.getElementById("item-image");
  const elPrice = document.getElementById("item-price");
  const elType = document.getElementById("item-type");
  const elStatus = document.getElementById("item-status");
  const elEnd = document.getElementById("item-end");
  const elSeller = document.getElementById("item-seller");

  const forwardSection = document.getElementById("forward-bidding");
  const dutchSection = document.getElementById("dutch-bidding");
  const endedSection = document.getElementById("ended-info");

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
      const item = await AA.api(
        `/items/${encodeURIComponent(itemId)}`
      );

      currentItem = item;

      if (elTitle) elTitle.textContent = item.title;
      if (elDesc)
        elDesc.textContent = item.description || "No description.";
      if (elImg) {
        elImg.src =
          item.imageUrl ||
          item.coverImageUrl ||
          "https://picsum.photos/seed/placeholder/600/400";
      }

      if (elPrice) {
        elPrice.textContent = AA.formatMoney(
          item.currentPrice || item.startingPrice || item.price
        );
      }

      if (elType) elType.textContent = item.auctionType;

      const rem = item.endTime ? AA.timeRemaining(item.endTime) : null;
      const isEnded = rem === "Ended";

      if (elStatus) {
        elStatus.textContent = isEnded ? "ENDED" : item.status;
      }

      if (elEnd) {
        elEnd.classList.remove("aa-time-warning", "aa-time-danger");

        if (!item.endTime) {
          elEnd.textContent = "—";
        } else if (isEnded) {
          elEnd.textContent = `${AA.formatDateTime(item.endTime)} (Ended)`;
          elEnd.classList.add("aa-time-danger");
        } else {
          elEnd.textContent = `${AA.formatDateTime(item.endTime)} (${rem})`;
          const endTs = new Date(item.endTime).getTime();
          const diffMs = endTs - Date.now();
          const minsLeft = Math.floor(diffMs / 1000 / 60);
          if (minsLeft <= 5) {
            elEnd.classList.add("aa-time-danger");
          } else if (minsLeft <= 10) {
            elEnd.classList.add("aa-time-warning");
          }
        }
      }

      if (elSeller) {
        elSeller.textContent = `Seller: Seller #${
          firstField(item, ["sellerId", "ownerId", "userId"], "?")
        }`;
      }

      // reset sections
      forwardSection?.classList.add("hidden");
      dutchSection?.classList.add("hidden");
      endedSection?.classList.add("hidden");

      // Active auctions -> show correct bidding UI
      if (item.status === "ACTIVE" && !isEnded) {
        if (item.auctionType === "FORWARD") {
          forwardSection?.classList.remove("hidden");
          await loadBids();
        } else if (item.auctionType === "DUTCH") {
          dutchSection?.classList.remove("hidden");
        }
      } else {
        endedSection?.classList.remove("hidden");
      }

      // Seller controls: only show to the seller
      const sellerId = firstField(item, ["sellerId", "ownerId", "userId"]);
      if (sellerControls) {
        if (sellerId && String(sellerId) === String(user.userId)) {
          sellerControls.classList.remove("hidden");
        } else {
          sellerControls.classList.add("hidden");
        }
      }

      // Prepare checkout info (UC5)
      const winningPrice =
        item.currentPrice || item.finalPrice || item.startingPrice || 0;

      const baseShipping =
        firstField(item, ["shipCostStd", "ship_cost_std", "ship_cost_std_cad"]) ||
        item.shipCost || item.shipping || 0;

      const expShipping =
        firstField(item, ["shipCostExp", "ship_cost_exp", "ship_cost_exp_cad"]) ||
        0;

      const shippingDays =
        firstField(item, ["shipDays", "ship_days"]) || null;

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
      AA.showToast("Failed to load item details.", "error");
    }
  }

  // ---- Load bids (UC3.2 – forward auctions) ----
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

        const amt =
          b.amount ??
          b.bidAmount ??
          b.bid_amount ??
          b.value ??
          0;

        const bidder =
          b.bidderId ??
          b.userId ??
          b.user_id ??
          "?";

        const when =
          b.bidTime ??
          b.createdAt ??
          b.created_at ??
          null;

        li.textContent = `${AA.formatMoney(amt)} by user #${bidder}${
          when ? " at " + AA.formatDateTime(when) : ""
        }`;
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
      if (bidMsg) bidMsg.textContent = "";

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

        AA.showToast("Bid placed successfully.", "success");
        if (bidMsg) {
          bidMsg.textContent = `You bid ${AA.formatMoney(
            amount
          )} as user #${user.userId}.`;
        }
        bidAmountInput.value = "";
        await loadItem();
        await loadBids();
      } catch (err) {
        console.error("Bid failed:", err);
        if (bidMsg) {
          bidMsg.textContent = err.message || "Bid failed.";
        }
        AA.showToast(
          "Bid failed: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }

  // ---- Dutch auction buttons (UC3.2 / UC3.3) ----
  if (btnDutchPrice && dutchPriceLabel) {
    btnDutchPrice.addEventListener("click", async () => {
      dutchMsg.textContent = "";
      if (dutchPriceLabel) {
        dutchPriceLabel.textContent = "Loading…";
      }
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
        dutchMsg.textContent =
          err.message || "Failed to accept price.";
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
        sellerMsg.textContent =
          err.message || "Failed to end auction.";
        AA.showToast(
          "Failed to end auction: " + (err.message || "Bad Request"),
          "error"
        );
      }
    });
  }

  // Initial load
  loadItem();
});
