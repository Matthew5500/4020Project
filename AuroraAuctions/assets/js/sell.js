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
    const startingPrice = Number(fd.get("startingPrice"));
    const minimumPrice = fd.get("minimumPrice")
      ? Number(fd.get("minimumPrice"))
      : null;

    const payload = {
      sellerId: user.userId,
      title: fd.get("title"),
      description: fd.get("description"),
      startingPrice,
      minimumPrice,
      auctionType: fd.get("auctionType") || "FORWARD",
    };

    const endTime = fd.get("endTime");
    if (endTime) {
      payload.endTime = endTime;
    }

    // extra fields to align with DB structure (optional for mid-tier)
    payload.category = fd.get("category") || null;
    payload.conditionCode = fd.get("conditionCode") || "USED";
    payload.coverImageUrl = fd.get("coverImageUrl") || null;
    payload.shipCostStd = fd.get("shipCostStd") || null;
    payload.shipCostExp = fd.get("shipCostExp") || null;
    payload.shipDays = fd.get("shipDays") || null;
    payload.quantity = fd.get("quantity") || 1;

    try {
      const created = await AA.api("/items", {
        method: "POST",
        body: payload,
      });
      msg.textContent = "Auction created successfully.";
      window.location.href = `item.html?id=${encodeURIComponent(
        created.itemId
      )}`;
    } catch (err) {
      msg.textContent = "Creation failed: " + err.message;
    }
  });
});