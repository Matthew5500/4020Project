// assets/js/sell.js

document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const form = document.getElementById("sell-form");
  const msg = document.getElementById("sell-message");

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.textContent = "";

    const fd = new FormData(form);

    // --- read basic fields ---
    const title = (fd.get("title") || "").trim();
    const description = (fd.get("description") || "").trim();
    const category = fd.get("category") || "";
    const conditionCode = fd.get("conditionCode") || "USED";
    const coverImageUrl = (
      fd.get("coverImageUrl") || fd.get("imageUrl") || ""
    ).trim();
    const auctionType = fd.get("auctionType") || "FORWARD";

    const startingPrice = Number(fd.get("startingPrice"));
    const minimumPriceRaw = fd.get("minimumPrice");
    const minimumPrice =
      minimumPriceRaw !== null && minimumPriceRaw !== ""
        ? Number(minimumPriceRaw)
        : null;

    const quantityRaw = fd.get("quantity");
    const quantity =
      quantityRaw !== null && quantityRaw !== ""
        ? Number(quantityRaw)
        : 1;

    const endTimeRaw = fd.get("endTime");
    // send the raw "YYYY-MM-DDTHH:mm" local time string to the API
    const endTime = endTimeRaw || null;

    // --- shipping fields from the form (these are the names in sell.html) ---
    const shipCostStdRaw = fd.get("shipCostStd");
    const shipCostExpRaw = fd.get("shipCostExp");
    const shipDaysRaw = fd.get("shipDays");

    const shipCostStd =
      shipCostStdRaw !== null && shipCostStdRaw !== ""
        ? Number(shipCostStdRaw)
        : 0;

    const shipCostExp =
      shipCostExpRaw !== null && shipCostExpRaw !== ""
        ? Number(shipCostExpRaw)
        : 0;

    const shipDays =
      shipDaysRaw !== null && shipDaysRaw !== ""
        ? Number(shipDaysRaw)
        : null;

    // --- very light validation (keep it simple) ---
    if (!title || Number.isNaN(startingPrice)) {
      msg.textContent =
        "Please provide at least a title and a valid starting price.";
      return;
    }

    const payload = {
      sellerId: user.userId,
      title,
      description,
      category,
      conditionCode,
      coverImageUrl: coverImageUrl || null,
      auctionType,
      startingPrice,
      minimumPrice,
      endTime,
      quantity,
      // We still send shipping to the backend even if it ignores it.
      shipCostStd,
      shipCostExp,
      shipDays,
    };

    try {
      const created = await AA.api("/items", {
        method: "POST",
        body: payload,
      });

      // --- FRONT-END ONLY: remember shipping for this itemId ---
      try {
        const raw = localStorage.getItem("aaShippingOverrides");
        let overrides = {};
        if (raw) {
          overrides = JSON.parse(raw);
        }

        overrides[String(created.itemId)] = {
          baseShipping: shipCostStd,
          expShipping: shipCostExp,
          shippingDays: shipDays,
        };

        localStorage.setItem(
          "aaShippingOverrides",
          JSON.stringify(overrides)
        );
      } catch (e) {
        console.warn("Could not store shipping overrides:", e);
      }

      msg.textContent = "Auction created successfully.";
      window.location.href = `item.html?id=${encodeURIComponent(
        created.itemId
      )}`;
    } catch (err) {
      console.error(err);
      msg.textContent = "Creation failed: " + (err.message || "Bad request");
    }
  });
});
