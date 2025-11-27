// assets/js/item.js
document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  // Be flexible: ?id=123 or ?itemId=123 or ?item_id=123
  const rawId =
    AA.getQueryParam("id") ||
    AA.getQueryParam("itemId") ||
    AA.getQueryParam("item_id");

  // If the query string literally has id=undefined, treat that as missing.
  const itemId = rawId && rawId !== "undefined" ? rawId : null;

  if (!itemId) {
    AA.showToast("Missing or invalid item id in the URL.", "error");
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
      elImg.src =
        item.coverImageUrl || "https://picsum.photos/seed/placeholder/600/400";
      elPrice.textContent = AA.formatMoney(
        item.currentPrice || item.startingPrice
      );
      elType.textContent = item.auctionType;
      elStatus.textContent = item.status;
      elEnd.textContent =
        AA.formatDateTime(item.endTime) +
        (item.status === "ACTIVE"
          ? ` (${AA.timeRemaining(item.endTime)})`
          : "");
      elSeller.textContent = `Seller #${item.sellerId}`;

      forwardSection.classList.add("hidden");
      dutchSection.classList.add("hidden");
      endedSection.classList.add("hidden");

      if (item.status === "ACTIVE") {
        if (item.auctionType === "FORWARD") {
          forwardSection.classList.remove("hidden");
          await loadBids();
        } else if (item.auctionType === "DUTCH") {
          dutchSection.classList.remove("hidden");
        }
      } else if (item.status === "ENDED") {
        endedSection.classList.remove("hidden");
        if (item.currentWinnerId) {
          winnerInfo.textContent = `Winner: user #${
            item.currentWinnerId
          } • Final price: ${AA.formatMoney(item.currentPrice)}`;
          if (item.currentWinnerId === user.userId && item.paymentStatus !== "PAID") {
            payBtn.classList.remove("hidden");
          } else {
            payBtn.classList.add("hidden");
          }
        } else {
          winnerInfo.textContent =
            "No winner – item had no valid bids or accepts.";
          payBtn.classList.add("hidden");
        }
      }

      if (item.sellerId === user.userId && item.status === "ACTIVE") {
        sellerControls.classList.remove("hidden");
      } else {
        sellerControls.classList.add("hidden");
      }
    } catch (err) {
      AA.showToast("Failed to load item: " + err.message, "error");
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

  // … keep the rest of your listeners (forward bidding, dutch, end auction, pay) …

  loadItem();
});
