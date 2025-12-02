// assets/js/item.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  // Support ?id=, ?itemId=, or ?item_id=
  const rawId =
    AA.getQueryParam("id") ||
    AA.getQueryParam("itemId") ||
    AA.getQueryParam("item_id");

  const itemId = rawId && rawId !== "undefined" ? rawId : null;

  if (!itemId) {
    AA.showToast("No item id provided in URL.", "error");
    return;
  }

  // ----- DOM references -----
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

  const payStandardBtn = document.getElementById("btn-pay-standard");
  const payExpeditedBtn = document.getElementById("btn-pay-expedited");

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

  function firstField(obj, names, fallback = null) {
    for (const n of names) {
      if (obj[n] !== undefined && obj[n] !== null) return obj[n];
    }
    return fallback;
  }

  // ----- Load item & set up UI -----
  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);
      currentItem = item;

      const winningPrice =
        firstField(item, ["currentPrice", "finalPrice", "price"]) || 0;

      // --- SHIPPING VALUES (important for payment) ---

      // Prefer the actual Spring JSON names: shipCostStd / shipCostExp
      const baseShipping = Number(
        item.shipCostStd ??
          item.ship_cost_std ??
          item.shippingCost ??
          item.shipping_cost ??
          0
      );

      const expShipping = Number(
        item.shipCostExp ??
          item.ship_cost_exp ??
          item.expeditedShipping ??
          item.shipping_expedited ??
          0
      );

      const shippingDays =
        item.shipDays ??
        item.shippingDays ??
        item.estimatedShipDays ??
        item.estimated_ship_days ??
        null;

      // UI fields
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

      if (item.endTime) {
        elEnd.textContent =
          AA.formatDateTime(item.endTime) +
          (item.status === "ACTIVE"
            ? ` (${AA.timeRemaining(item.endTime)})`
            : "");
      } else {
        elEnd.textContent = "— (—)";
      }

      const sellerId = firstField(item, ["sellerId", "ownerId", "userId"], "?");
      elSeller.textContent = `Seller: Seller #${sellerId}`;

      // Reset sections
      forwardSection?.classList.add("hidden");
      dutchSection?.classList.add("hidden");
      endedSection?.classList.add("hidden");
      payStandardBtn?.classList.add("hidden");
      payExpeditedBtn?.classList.add("hidden");

      // ACTIVE auctions -> show bidding area
      if (item.status === "ACTIVE") {
        if (item.auctionType === "FORWARD") {
          forwardSection?.classList.remove("hidden");
        } else if (item.auctionType === "DUTCH") {
          dutchSection?.classList.remove("hidden");
        }
      } else if (item.status === "ENDED") {
        endedSection?.classList.remove("hidden");

        if (winnerInfo) {
          if (item.currentWinnerId != null) {
            winnerInfo.textContent = `Winner: user #${
              item.currentWinnerId
            } • Winning price: ${AA.formatMoney(winningPrice)}`;
          } else {
            winnerInfo.textContent =
              "No winner – item had no valid bids or accepts.";
          }
        }

        const isWinner = item.currentWinnerId === user.userId;
        if (isWinn
