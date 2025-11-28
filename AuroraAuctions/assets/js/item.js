// assets/js/item.js
document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const itemId = AA.getQueryParam("id");
  if (!itemId) {
    AA.showToast("No item selected. Redirecting to Browse.", "error");
    window.location.href = "browse.html";
    return;
  }

  // left card
  const elTitle = document.getElementById("item-title");
  const elDesc = document.getElementById("item-description");
  const elImage = document.getElementById("item-image");
  const elCurrentPrice = document.getElementById("item-current-price");
  const elAuctionType = document.getElementById("item-auction-type");
  const elStatus = document.getElementById("item-status");
  const elEnds = document.getElementById("item-ends");
  const elSeller = document.getElementById("item-seller");

  // bidding card
  const elBidInput = document.getElementById("bid-amount");
  const elPlaceBid = document.getElementById("btn-place-bid");
  const elGetDutchPrice = document.getElementById("btn-get-price");
  const elBuyNow = document.getElementById("btn-buy-now");
  const elBidHistory = document.getElementById("bid-history");
  const elBidHistoryStatus = document.getElementById("bid-history-status");

  let currentItem = null;
  let countdownTimer = null;

  function getImageUrl(item) {
    return (
      item.coverImageUrl ||
      item.cover_image_url ||
      item.imageUrl ||
      item.image_url ||
      "../assets/img/no-image.png"
    );
  }

  function renderItem() {
    if (!currentItem) return;

    const price = currentItem.currentPrice ?? currentItem.current_price ?? 0;
    const auctionType =
      currentItem.auctionType || currentItem.auction_type || "FORWARD";
    const status = (currentItem.status || "ACTIVE").toUpperCase();
    const endTime =
      currentItem.endTime || currentItem.end_time || currentItem.endsAt || null;

    elTitle.textContent = currentItem.title || "Loading item...";
    elDesc.textContent = currentItem.description || "";
    elImage.src = getImageUrl(currentItem);
    elImage.alt = currentItem.title || "Item image";
    elCurrentPrice.textContent = AA.formatMoney(price);
    elAuctionType.textContent = auctionType;
    elStatus.textContent = status;

    if (!endTime) {
      elEnds.textContent = "—";
    } else {
      const remaining = AA.timeRemaining(endTime);
      elEnds.textContent =
        remaining === "Ended"
          ? `${AA.formatDateTime(endTime)} (Ended)`
          : `${AA.formatDateTime(endTime)} (${remaining})`;
    }

    const sellerId = currentItem.sellerId ?? currentItem.seller_id;
    elSeller.textContent = sellerId ? `Seller: Seller #${sellerId}` : "Seller: —";

    const isEnded = AA.timeRemaining(endTime) === "Ended" || status === "ENDED";
    const isForward = auctionType.toUpperCase() === "FORWARD";
    const isDutch = auctionType.toUpperCase() === "DUTCH";

    // enable / disable
    if (elBidInput) elBidInput.disabled = !isForward || isEnded;
    if (elPlaceBid) elPlaceBid.disabled = !isForward || isEnded;
    if (elGetDutchPrice) elGetDutchPrice.disabled = !isDutch || isEnded;
    if (elBuyNow) elBuyNow.disabled = isEnded;

    if (elBidHistoryStatus) elBidHistoryStatus.textContent = "";
  }

  function storeCheckoutAndGo(item) {
    if (!item) return;

    const price = item.currentPrice ?? item.current_price ?? 0;

    const baseShip =
      item.shipCostStd ?? item.ship_cost_std ?? item.shippingRegular ?? 0;
    const expShip =
      item.shipCostExp ?? item.ship_cost_exp ?? item.shippingExpedited ?? 0;
    const shipDays = item.shipDays ?? item.ship_days ?? null;

    const checkout = {
      itemId: item.itemId ?? item.id,
      title: item.title,
      winningPrice: price,
      baseShipping: baseShip,
      expShipping: expShip,
      shippingDays: shipDays,
      expeditedSelected: false,
    };

    sessionStorage.setItem("checkout", JSON.stringify(checkout));
    window.location.href = "pay.html";
  }

  async function loadBids() {
    if (!elBidHistory || !elBidHistoryStatus) return;

    try {
      const bids = await AA.api(`/api/items/${encodeURIComponent(itemId)}/bids`);
      elBidHistory.innerHTML = "";

      if (!bids || bids.length === 0) {
        elBidHistoryStatus.textContent = "No bids yet.";
        return;
      }

      bids.forEach((b) => {
        const li = document.createElement("li");
        const bidder = b.bidderId ?? b.bidder_id ?? "—";
        const amount = b.amount ?? 0;
        const when = b.bidTime ?? b.bid_time;
        li.textContent = `User #${bidder} bid ${AA.formatMoney(
          amount
        )} on ${AA.formatDateTime(when)}`;
        elBidHistory.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      elBidHistoryStatus.textContent = "Unable to load bid history.";
    }
  }

  async function loadItemAndBids() {
    try {
      const item = await AA.api(`/api/items/${encodeURIComponent(itemId)}`);
      currentItem = item;
      renderItem();

      // countdown
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        if (!currentItem) return;
        const endTime =
          currentItem.endTime || currentItem.end_time || currentItem.endsAt;
        if (!endTime) return;

        const text = AA.timeRemaining(endTime);
        elEnds.textContent =
          text === "Ended"
            ? `${AA.formatDateTime(endTime)} (Ended)`
            : `${AA.formatDateTime(endTime)} (${text})`;

        elEnds.classList.remove("aa-time-danger", "aa-time-warning");
        const diffMs = new Date(endTime).getTime() - Date.now();
        const mins = diffMs / 60000;

        if (mins <= 0) {
          elEnds.classList.add("aa-time-danger");
          elStatus.textContent = "ENDED";
        } else if (mins <= 5) {
          elEnds.classList.add("aa-time-danger");
        } else if (mins <= 10) {
          elEnds.classList.add("aa-time-warning");
        }
      }, 1000);

      await loadBids();
    } catch (err) {
      console.error(err);
      AA.showToast("Failed to load item details.", "error");
    }
  }

  // ---- event handlers ----

  elPlaceBid &&
    elPlaceBid.addEventListener("click", async () => {
      if (!currentItem) return;

      const raw = elBidInput.value.trim();
      const amount = Number(raw);

      if (!raw || isNaN(amount) || amount <= 0) {
        AA.showToast("Enter a valid bid amount.", "error");
        return;
      }

      const currentPrice = currentItem.currentPrice ?? currentItem.current_price;

      if (currentPrice != null && amount <= currentPrice) {
        AA.showToast(
          "Bid must be strictly greater than the current price.",
          "error"
        );
        return;
      }

      try {
        const payload = {
          bidderId: user.userId,
          amount,
        };

        await AA.api(`/api/items/${encodeURIComponent(itemId)}/bids`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        AA.showToast(
          `Bid placed at ${AA.formatMoney(amount)}.`,
          "success"
        );
        elBidInput.value = "";
        await loadItemAndBids();
      } catch (err) {
        console.error(err);
        AA.showToast(err.message || "Bid failed.", "error");
      }
    });

  elGetDutchPrice &&
    elGetDutchPrice.addEventListener("click", async () => {
      if (!currentItem) return;

      try {
        const data = await AA.api(
          `/api/items/${encodeURIComponent(itemId)}/dutch/price`
        );
        const price =
          data.currentPrice ?? data.price ?? data.amount ?? null;

        if (price == null) {
          AA.showToast("Could not determine current Dutch price.", "error");
          return;
        }

        currentItem.currentPrice = price;
        renderItem();
        AA.showToast(
          `Current Dutch price is ${AA.formatMoney(price)}.`,
          "info"
        );
      } catch (err) {
        console.error(err);
        AA.showToast(err.message || "Failed to get price.", "error");
      }
    });

  elBuyNow &&
    elBuyNow.addEventListener("click", async () => {
      if (!currentItem) return;

      const auctionType =
        currentItem.auctionType || currentItem.auction_type || "FORWARD";

      try {
        if (auctionType.toUpperCase() === "DUTCH") {
          const updated = await AA.api(
            `/api/items/${encodeURIComponent(itemId)}/dutch/accept`,
            {
              method: "POST",
              body: JSON.stringify({ buyerId: user.userId }),
            }
          );
          currentItem = updated || currentItem;
          renderItem();
          AA.showToast("Offer accepted. Proceed to payment.", "success");
        }

        storeCheckoutAndGo(currentItem);
      } catch (err) {
        console.error(err);
        AA.showToast(err.message || "Unable to complete purchase.", "error");
      }
    });

  // initial load
  loadItemAndBids();
});
