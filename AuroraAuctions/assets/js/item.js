// assets/js/item.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  // Be flexible with query param names
  const rawId =
    AA.getQueryParam("id") ||
    AA.getQueryParam("itemId") ||
    AA.getQueryParam("item_id");

  const itemId = rawId && rawId !== "undefined" ? rawId : null;

  if (!itemId) {
    AA.showToast(
      "Missing item",
      "No valid item id found in the URL. Redirecting to Browse.",
      "error"
    );
    window.location.href = "browse.html";
    return;
  }

  // ---- DOM refs ----
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

  // ---- load item details ----
  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      currentItem = item;

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
      elSeller.textContent = `Seller #${item.sellerId ?? item.ownerId ?? "?"}`;

      // reset sections
      forwardSection?.classList.add("hidden");
      dutchSection?.classList.add("hidden");
      endedSection?.classList.add("hidden");

      if (item.status === "ACTIVE") {
        if (item.auctionType === "FORWARD") {
          forwardSection?.classList.remove("hidden");
          await loadBids();
        } else if (item.auctionType === "DUTCH") {
          dutchSection?.classList.remove("hidden");
        }
      } else if (item.status === "ENDED") {
        endedSection?.classList.remove("hidden");
        if (winnerInfo) {
          if (item.currentWinnerId) {
            winnerInfo.textContent = `Winner: user #${
              item.currentWinnerId
            } • Final price: ${AA.formatMoney(
              item.currentPrice || item.finalPrice
            )}`;
          } else {
            winnerInfo.textContent =
              "No winner – item had no valid bids or accepts.";
          }
        }

        if (
          payBtn &&
          item.currentWinnerId === user.userId &&
          item.paymentStatus !== "PAID"
        ) {
          payBtn.classList.remove("hidden");
        } else {
          payBtn?.classList.add("hidden");
        }
      }

      // show seller controls only for owner
      const ownerId = item.sellerId ?? item.ownerId ?? item.userId;
      if (sellerControls) {
        if (ownerId === user.userId && item.status === "ACTIVE") {
          sellerControls.classList.remove("hidden");
        } else {
          sellerControls.classList.add("hidden");
        }
      }
    } catch (err) {
      console.error("Load item failed:", err);
      AA.showToast(
        "Failed to load item",
        err.message || "Bad Request",
        "error"
      );
    }
  }

  // ---- load bids list (for forward auctions) ----
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

  // ---- forward bidding form handler ----
  if (bidForm && bidAmountInput) {
    bidForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      bidMsg.textContent = "";

      if (!currentItem) {
        AA.showToast(
          "Item not loaded",
          "Please wait for the item details to load.",
          "error"
        );
        return;
      }

      const raw = bidAmountInput.value.trim();
      const amount = Number(raw);

      if (!raw || Number.isNaN(amount) || amount <= 0) {
        AA.showToast(
          "Invalid bid",
          "Please enter a positive number.",
          "error"
        );
        return;
      }

      try {
        const res = await AA.api(
          `/items/${encodeURIComponent(itemId)}/bids`,
          {
            method: "POST",
            body: {
              bidderId: user.userId,
              amount: amount,
            },
          }
        );

        AA.showToast(
          "Bid placed",
          `Your bid of ${AA.formatMoney(amount)} was submitted.`,
          "success"
        );
        bidAmountInput.value = "";
        await loadItem(); // refresh price & status
        await loadBids();
      } catch (err) {
        console.error("Bid failed:", err);
        bidMsg.textContent = err.message || "Bid failed.";
        AA.showToast("Bid failed", err.message || "Bad Request", "error");
      }
    });
  }

  // ---- dutch price + accept handlers ----
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
          "Dutch price error",
          err.message || "Bad Request",
          "error"
        );
      }
    });
  }

  if (btnDutchAccept) {
    btnDutchAccept.addEventListener("click", async () => {
      dutchMsg.textContent = "";
      try {
        const data = await AA.api(
          `/items/${encodeURIComponent(itemId)}/dutch/accept`,
          {
            method: "POST",
            body: { buyerId: user.userId },
          }
        );
        AA.showToast(
          "Dutch price accepted",
          "You have successfully accepted the current price.",
          "success"
        );
        await loadItem();
      } catch (err) {
        console.error("Dutch accept failed:", err);
        dutchMsg.textContent = err.message || "Failed to accept price.";
        AA.showToast(
          "Dutch accept error",
          err.message || "Bad Request",
          "error"
        );
      }
    });
  }

  // ---- seller: end auction ----
  if (btnEndAuction) {
    btnEndAuction.addEventListener("click", async () => {
      sellerMsg.textContent = "";
      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/end`, {
          method: "POST",
        });
        AA.showToast(
          "Auction ended",
          "The auction has been manually ended.",
          "success"
        );
        await loadItem();
      } catch (err) {
        console.error("End auction failed:", err);
        sellerMsg.textContent = err.message || "Failed to end auction.";
        AA.showToast(
          "End auction error",
          err.message || "Bad Request",
          "error"
        );
      }
    });
  }

  // ---- Pay Now (winner) ----
  if (payBtn) {
    payBtn.addEventListener("click", async () => {
      try {
        const receipt = await AA.api(
          `/items/${encodeURIComponent(itemId)}/pay`,
          {
            method: "POST",
            body: {
              payerId: user.userId,
              method: "FAKE_CARD",
              note: "Test payment, no real card",
            },
          }
        );

        // Store receipt for receipt.html page
        sessionStorage.setItem(
          "lastReceipt",
          JSON.stringify({ itemId, receipt })
        );

        AA.showToast(
          "Payment complete",
          "Your payment was processed. Showing receipt.",
          "success"
        );

        window.location.href = "receipt.html";
      } catch (err) {
        console.error("Payment failed:", err);
        AA.showToast(
          "Payment failed",
          err.message || "Could not process payment.",
          "error"
        );
      }
    });
  }

  // initial load
  loadItem();
});
