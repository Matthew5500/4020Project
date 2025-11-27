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
      AA.showToast("Invalid item id in URL.", "", "error");
    }
    return;
  }

  const elTitle = document.getElementById("item-title");
  const elDesc = document.getElementById("item-description");
  const elImg = document.getElementById("item-image");
  const elPrice = document.getElementById("item-price");
  const elType = document.getElementById("item-type");
  const elStatus = document.getElementById("item-status");
  const elEnds = document.getElementById("item-ends");
  const elSeller = document.getElementById("item-seller");
  const elBidForm = document.getElementById("bid-form");
  const elBidMessage = document.getElementById("bid-message");
  const elBidHistory = document.getElementById("bid-history");
  const elPayNow = document.getElementById("btn-pay-now");

  const elShipStd = document.getElementById("ship-std");
  const elShipExp = document.getElementById("ship-exp");
  const elShipDays = document.getElementById("ship-days");
  const elShipToggle = document.getElementById("expedited-shipping");
  const elShipLabel = document.getElementById("expedited-shipping-label");

  async function loadItem() {
    try {
      const item = await AA.api(`/items/${encodeURIComponent(itemId)}`);

      if (!item) {
        elTitle.textContent = "Item not found";
        if (AA.showToast) {
          AA.showToast("Item not found.", "", "error");
        }
        return;
      }

      // Map flexible fields
      const endTime = item.endTime || item.end_time;
      const shippingInfo =
        item.shipping || item.shippingInfo || item.shipping_info || null;

      function firstField(obj, keys, fallback = null) {
        for (const k of keys) {
          if (obj && obj[k] != null) return obj[k];
        }
        return fallback;
      }

      const baseShipping = firstField(
        item,
        ["shipCostStd", "ship_cost_std", "shipping_cost_std"],
        null
      );
      const expShipping = firstField(
        item,
        ["shipCostExp", "ship_cost_exp", "shipping_cost_exp"],
        null
      );
      const shippingDays = firstField(
        item,
        ["shipDays", "ship_days", "shipping_time_days"],
        null
      );

      elTitle.textContent = item.title;
      elDesc.textContent = item.description || "No description.";
      elImg.src =
        item.imageUrl ||
        item.coverImageUrl ||
        item.cover_image_url ||
        "https://picsum.photos/seed/placeholder/600/400";

      elPrice.textContent = AA.formatMoney(
        item.currentPrice || item.startingPrice || item.price
      );
      elType.textContent = item.auctionType;
      elStatus.textContent = item.status;
      elEnds.textContent = endTime ? AA.formatDateTime(endTime) : "—";

      const sellerName = firstField(item, ["sellerName", "seller_name"], "");
      const sellerId = firstField(item, ["sellerId", "ownerId", "userId"], "?");
      elSeller.textContent = sellerName
        ? `${sellerName} (#${sellerId})`
        : `Seller #${sellerId}`;

      if (shippingInfo || baseShipping || expShipping || shippingDays) {
        if (elShipStd) {
          elShipStd.textContent =
            baseShipping != null ? AA.formatMoney(baseShipping) : "—";
        }
        if (elShipExp) {
          elShipExp.textContent =
            expShipping != null ? AA.formatMoney(expShipping) : "—";
        }
        if (elShipDays) {
          elShipDays.textContent = shippingDays ? `${shippingDays} days` : "—";
        }

        if (elShipLabel) {
          if (expShipping && expShipping > 0) {
            elShipLabel.textContent = `Expedited shipping (+${AA.formatMoney(
              expShipping
            )})`;
          } else {
            elShipLabel.textContent =
              "Expedited shipping (+$0 – not configured)";
          }
        }
      }

      // Show Pay Now only to winner
      const winningBidderId = firstField(item, ["winnerId", "winner_id"], null);
      if (elPayNow) {
        if (item.status === "CLOSED" && winningBidderId === user.userId) {
          elPayNow.classList.remove("hidden");
        } else {
          elPayNow.classList.add("hidden");
        }
      }

      // Load bid history (UC3.4)
      if (elBidHistory) {
        try {
          const bids = await AA.api(
            `/items/${encodeURIComponent(itemId)}/bids`
          );
          if (!Array.isArray(bids) || bids.length === 0) {
            elBidHistory.innerHTML =
              "<p class='aa-muted small'>No bids yet.</p>";
          } else {
            const list = document.createElement("ul");
            list.className = "aa-list-unstyled";
            bids.forEach((b) => {
              const li = document.createElement("li");
              const who =
                b.userName || b.username || `User #${b.userId || "?"}`;
              li.textContent = `${who} – ${AA.formatMoney(
                b.amount
              )} at ${AA.formatDateTime(b.timePlaced || b.time_placed)}`;
              list.appendChild(li);
            });
            elBidHistory.innerHTML = "";
            elBidHistory.appendChild(list);
          }
        } catch (err) {
          console.error("Failed to load bids:", err);
          elBidHistory.innerHTML =
            "<p class='aa-muted small'>Unable to load bid history.</p>";
        }
      }

      if (elBidForm) {
        elBidForm.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          elBidMessage.textContent = "";

          const fd = new FormData(elBidForm);
          const amount = Number(fd.get("amount"));

          if (!amount || Number.isNaN(amount) || amount <= 0) {
            elBidMessage.textContent = "Please enter a valid bid amount.";
            return;
          }

          try {
            const result = await AA.api(
              `/items/${encodeURIComponent(itemId)}/bids`,
              {
                method: "POST",
                body: {
                  bidderId: user.userId,
                  amount,
                },
              }
            );
            elBidMessage.textContent = "Bid placed successfully.";
            elPrice.textContent = AA.formatMoney(result.currentPrice);
            await loadItem();
          } catch (err) {
            elBidMessage.textContent = "Bid failed: " + err.message;
          }
        });
      }

      // Pay Now (UC4) – only when visible
      if (elPayNow) {
        elPayNow.addEventListener("click", async () => {
          const info = await AA.api(
            `/payments/checkout-info/${encodeURIComponent(itemId)}`
          );

          const expedited =
            elShipToggle && elShipToggle.checked && info.expShipping != null;

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
    } catch (err) {
      console.error("Failed to load item:", err);
      if (AA.showToast) {
        AA.showToast("Failed to load item", err.message || "", "error");
      }
    }
  }

  // Initial load
  loadItem();
});