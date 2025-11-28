// assets/js/sell.js
document.addEventListener("DOMContentLoaded", () => {
  const user = AA.requireLogin();
  if (!user) return;

  AA.initNav();

  const form = document.getElementById("sell-form");
  const msg = document.getElementById("sell-message");

  if (!form) return;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.textContent = "";

    const fd = new FormData(form);

    const title = (fd.get("title") || "").trim();
    const description = (fd.get("description") || "").trim();
    const startingPrice = Number(fd.get("startingPrice") || "0");
    const minPriceRaw = fd.get("minimumPrice");
    const minimumPrice =
      minPriceRaw && minPriceRaw !== "" ? Number(minPriceRaw) : null;
    const auctionType = (fd.get("auctionType") || "FORWARD").toUpperCase();

    // Simple duration in minutes field in the form (you can adjust if you
    // instead use a datetime input).
    const durationMinutes = Number(fd.get("durationMinutes") || "5");
    const end = new Date(Date.now() + durationMinutes * 60000);

    // ItemRequest in backend expects a LocalDateTime, serialized as
    // "YYYY-MM-DDTHH:MM:SS"
    const endTime = end.toISOString().slice(0, 19);

    if (!title || !startingPrice || isNaN(startingPrice) || startingPrice <= 0) {
      msg.textContent = "Please provide a title and a valid starting price.";
      return;
    }

    const payload = JSON.stringify({
      sellerId: user.userId,
      title,
      description,
      startingPrice,
      minimumPrice: auctionType === "DUTCH" ? minimumPrice : null,
      auctionType,
      endTime,
    });

    try {
      const created = await AA.api("/items", {
        method: "POST",
        body: payload,
      });

      msg.textContent = "Auction created successfully.";
      // Redirect to item detail page so user can immediately see their listing
      window.location.href = `item.html?id=${encodeURIComponent(
        created.itemId
      )}`;
    } catch (err) {
      console.error(err);
      msg.textContent = "Creation failed: " + (err.message || "Unknown error");
    }
  });
});
