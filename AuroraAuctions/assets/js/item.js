document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const itemId = AA.getQueryParam("id");
  if (!itemId) {
    alert("Missing item id");
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

  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      currentItem = item;

      elTitle.textContent = item.title;
      elDesc.textContent = item.description || "No description.";
      elImg.src = item.coverImageUrl || "https://picsum.photos/seed/placeholder/600/400";
      elPrice.textContent = AA.formatMoney(item.currentPrice || item.startingPrice);
      elType.textContent = item.auctionType;
      elStatus.textContent = item.status;
      elEnd.textContent = AA.formatDateTime(item.endTime) +
        (item.status === "ACTIVE" ? ` (${AA.timeRemaining(item.endTime)})` : "");
      elSeller.textContent = `Seller #${item.sellerId}`;

      // show correct sections
      forwardSection.classList.add("hidden");
      dutchSection.classList.add("hidden");
      endedSection.classList.add("hidden");

      if (item.status === "ACTIVE") {
        if (item.auctionType === "FORWARD") {
          forwardSection.classList.remove("hidden");
          loadBids();
        } else if (item.auctionType === "DUTCH") {
          dutchSection.classList.remove("hidden");
        }
      } else if (item.status === "ENDED") {
        endedSection.classList.remove("hidden");
        if (item.currentWinnerId) {
          winnerInfo.textContent =
            `Winner: user #${item.currentWinnerId} • Final price: ${AA.formatMoney(
              item.currentPrice
            )}`;
          if (item.currentWinnerId === user.userId && item.paymentStatus !== "PAID") {
            payBtn.classList.remove("hidden");
          } else {
            payBtn.classList.add("hidden");
          }
        } else {
          winnerInfo.textContent = "No winner – item had no valid bids / accepts.";
          payBtn.classList.add("hidden");
        }
      }

      // seller controls
      if (item.sellerId === user.userId && item.status === "ACTIVE") {
        sellerControls.classList.remove("hidden");
      } else {
        sellerControls.classList.add("hidden");
      }
    } catch (err) {
      alert("Failed to load item: " + err.message);
      console.error(err);
    }
  }

  async function loadBids() {
    try {
      const bids = await AA.api(`/items/${encodeURIComponent(itemId)}/bids`);
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
      bidList.innerHTML = `<li class='aa-muted small'>Failed to load bids: ${err.message}</li>`;
    }
  }

  if (bidForm) {
    bidForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!currentItem) return;
      const amount = Number(bidAmountInput.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        bidMsg.textContent = "Please enter a valid bid amount.";
        return;
      }
      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/bids`, {
          method: "POST",
          body: {
            bidderId: user.userId,
            amount,
          },
        });
        bidMsg.textContent = "Bid placed successfully.";
        await loadItem();
        await loadBids();
      } catch (err) {
        bidMsg.textContent = "Bid failed: " + err.message;
      }
    });
  }

  if (btnDutchPrice) {
    btnDutchPrice.addEventListener("click", async () => {
      dutchMsg.textContent = "";
      try {
        const data = await AA.api(
          `/items/${encodeURIComponent(itemId)}/dutch/price`
        );
        dutchPriceLabel.textContent =
          "Current price: " + AA.formatMoney(data.currentPrice);
      } catch (err) {
        dutchMsg.textContent = "Failed to load Dutch price: " + err.message;
      }
    });
  }

  if (btnDutchAccept) {
    btnDutchAccept.addEventListener("click", async () => {
      dutchMsg.textContent = "";
      if (!confirm("Accept current Dutch price and end the auction?")) return;
      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/dutch/accept`, {
          method: "POST",
          body: { buyerId: user.userId },
        });
        dutchMsg.textContent = "You bought this item at the current price!";
        await loadItem();
      } catch (err) {
        dutchMsg.textContent = "Accept failed: " + err.message;
      }
    });
  }

  if (btnEndAuction) {
    btnEndAuction.addEventListener("click", async () => {
      sellerMsg.textContent = "";
      if (!confirm("End this auction now?")) return;
      try {
        await AA.api(`/items/${encodeURIComponent(itemId)}/end`, {
          method: "POST",
        });
        sellerMsg.textContent = "Auction ended.";
        await loadItem();
      } catch (err) {
        sellerMsg.textContent = "End failed: " + err.message;
      }
    });
  }

  if (payBtn) {
    payBtn.addEventListener("click", () => {
      window.location.href = `pay.html?id=${encodeURIComponent(itemId)}`;
    });
  }

  loadItem();
});