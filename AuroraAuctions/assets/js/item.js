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

  // DOM refs
  const elTitle = document.getElementById("item-title");
  const elDesc = document.getElementById("item-description");
  const elImage = document.getElementById("item-image");
  const elCurrentPrice = document.getElementById("item-current-price");
  const elAuctionType = document.getElementById("item-auction-type");
  const elStatus = document.getElementById("item-status");
  const elEnds = document.getElementById("item-ends");
  const elSeller = document.getElementById("item-seller");

  const elBidInput = document.getElementById("bid-amount");
  const elPlaceBid = document.getElementById("btn-place-bid");
  const elGetDutchPrice = document.getElementById("btn-get-price");
  const elBuyNow = document.getElementById("btn-buy-now");
  const elBidHistory = document.getElementById("bid-history");
  const elBidHistoryStatus = document.getElementById("bid-history-status");

  let currentItem = null;
  let countdownTimer = null;

  // ---------- Helpers ----------

  function renderItem() {
    if (!currentItem) return;

    elTitle.textContent = currentItem.title ?? "Item";
    elDesc.textContent = currentItem.description ?? "";

    const imgSrc =
      currentItem.coverImageUrl ||
      "../assets/img/no-image.png";
    elImage.src = imgSrc;
    elImage.alt = currentItem.title || "Item image";

    elCurrentPrice.textContent = AA.formatMoney(currentItem.currentPrice);
    elAuctionType.textContent = currentItem.auctionType || "FORWARD";

    const endedText = AA.timeRemaining(currentItem.endTime);
    const ended = endedText === "Ended";

    elEnds.textContent = endedText === "Ended"
      ? `${AA.formatDateTime(currentItem.endTime)} (Ended)`
      : `${AA.formatDateTime(currentItem.endTime)} (${endedText})`;

    if (ended) {
      elEnds.classList.add("aa-time-danger");
      elStatus.textContent = "ENDED";
    } else {
      elEnds.classList.remove("aa-time-danger", "aa-time-warning");
      // give a little colour hint as time approaches
      const millis = new Date(currentItem.endTime).getTime() - Date.now();
      const mins = millis / 60000;
      if (mins <= 5) {
        elEnds.classList.add("aa-time-danger");
      } else if (mins <= 10) {
        elEnds.classList.add("aa-time-warning");
      }
      elStatus.textContent = currentItem.status || "ACTIVE";
    }

    elSeller.textContent =
      currentItem.sellerId != null ? `Seller #${currentItem.sellerId}` : "Unknown";

    // Enable / disable bidding UI depending on type + status
    const isForward = (currentItem.auctionType || "").toUpperCase() === "FORWARD";
    const isDutch = (currentItem.auctionType || "").toUpperCase() === "DUTCH";
    const isEnded = ended || (currentItem.status || "").toUpperCase() === "ENDED";

    // Forward auction: allow manual bids, no Dutch actions
    elBidInput.disabled = !isForward || isEnded;
    elPlaceBid.disabled = !isForward || isEnded;
    elGetDutchPrice.disabled = !isDutch || isEnded;
    elBuyNow.disabled = isEnded;

    // Clear bid history status line
    elBidHistoryStatus.textContent = "";
  }

  function storeCheckoutAndGo(item) {
    if (!item) return;

    const checkout = {
      itemId: item.itemId,
      title: item.title,
      winningPrice: item.currentPrice,
      baseShipping: item.shipCostStd ?? 0,
      expShipping: item.shipCostExp ?? 0,
      shippingDays: item.shipDays ?? null,
      expeditedSelected: false,
    };

    sessionStorage.setItem("checkout", JSON.stringify(checkout));
    window.location.href = "pay.html";
  }

  async function loadItemAndBids() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      currentItem = item;
      renderItem();

      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        if (!currentItem) return;
        const text = AA.timeRemaining(currentItem.endTime);
        const ended = text === "Ended";
        elEnds.textContent = ended
          ? `${AA.formatDateTime(currentItem.endTime)} (Ended)`
          : `${AA.formatDateTime(currentItem.endTime)} (${text})`;

        elEnds.classList.remove("aa-time-danger", "aa-time-warning");
        const millis = new Date(currentItem.endTime).getTime() - Date.now();
        const mins = millis / 60000;
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
      AA.showToast("Failed to load item.", "error");
    }
  }

  async function loadBids() {
    try {
      const bids = await AA.api(`/items/${encodeURIComponent(itemId)}/bids`);
      elBidHistory.innerHTML = "";

      if (!bids || bids.length === 0) {
        elBidHistoryStatus.textContent = "No bids yet.";
        return;
      }

      bids.forEach((b) => {
        const li = document.createElement("li");
        li.className = "aa-list-item";
        li.textContent =
          `User #${b.bidderId} bid ${AA.formatMoney(b.amount)} ` +
          `on ${AA.formatDateTime(b.bidTime)}`;
        elBidHistory.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      elBidHistoryStatus.textContent = "Unable to load bid history.";
    }
  }

  // ---------- Event handlers ----------

  if (elPlaceBid) {
    elPlaceBid.addEventListener("click", async () => {
      if (!currentItem) return;

      const raw = elBidInput.value.trim();
      const amount = Number(raw);

      if (!raw || isNaN(amount) || amount <= 0) {
        AA.showToast("Enter a valid bid amount.", "error");
        return;
      }

      try {
        const payload = {
          bidderId: user.userId,
          amount,
        };

        await AA.api(`/items/${encodeURIComponent(itemId)}/bids`, {
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
  }

  if (elGetDutchPrice) {
    elGetDutchPrice.addEventListener("click", async () => {
      if (!currentItem) return;

      try {
        const data = await AA.api(
          `/items/${encodeURIComponent(itemId)}/dutch/price`
        );
        const price =
          data && (data.currentPrice ?? data.price ?? data.amount);
        if (price == null) {
          AA.showToast("Could not determine current price.", "error");
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
  }

  if (elBuyNow) {
    elBuyNow.addEventListener("click", async () => {
      if (!currentItem) return;

      const type = (currentItem.auctionType || "").toUpperCase();
      try {
        if (type === "DUTCH") {
          // Accept the current Dutch price
          const updated = await AA.api(
            `/items/${encodeURIComponent(itemId)}/dutch/accept`,
            {
              method: "POST",
              body: JSON.stringify({ buyerId: user.userId }),
            }
          );
          currentItem = updated || currentItem;
          renderItem();
          AA.showToast("Offer accepted. Proceed to payment.", "success");
          storeCheckoutAndGo(currentItem);
        } else {
          // Forward auction: just proceed with current price
          storeCheckoutAndGo(currentItem);
        }
      } catch (err) {
        console.error(err);
        AA.showToast(err.message || "Unable to complete purchase.", "error");
      }
    });
  }

  // Initial load
  loadItemAndBids();
});
