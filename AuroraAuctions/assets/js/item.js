// assets/js/item.js

document.addEventListener("DOMContentLoaded", async () => {
    AA.initNav();

    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("id");
    if (!itemId) return;

    loadItem(itemId);
    loadBids(itemId);

    document.getElementById("place-bid-btn").addEventListener("click", () => {
        placeBid(itemId);
    });
});

// Convert SQL timestamp → local Date safely
function parseDbTime(ts) {
    // Example: "2025-11-28 21:40:00"
    return new Date(ts.replace(" ", "T") + "Z"); // Treat DB time as UTC
}

async function loadItem(itemId) {
    try {
        const resp = await fetch(`/api/items/${itemId}`);
        const item = await resp.json();

        // Fix image URL handling
        const img = document.getElementById("item-img");
        img.src = item.coverImageUrl && item.coverImageUrl.trim() !== ""
            ? item.coverImageUrl
            : "../assets/img/default.png";

        document.getElementById("item-title").textContent = item.title;
        document.getElementById("item-desc").textContent = item.description;
        document.getElementById("item-price").textContent = `$${item.currentPrice.toFixed(2)}`;
        document.getElementById("item-type").textContent = item.auctionType;
        document.getElementById("item-status").textContent = item.status;

        const endTime = parseDbTime(item.endTime);
        const endText = document.getElementById("item-end-time");

        let countdownInterval;

        function updateTimer() {
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                endText.textContent = "Auction ended";
                endText.style.color = "red";
                document.getElementById("place-bid-btn").disabled = true;
                clearInterval(countdownInterval);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            endText.textContent = `${item.endTime} (${h}h ${m}m ${s}s)`;

            // Color warnings
            if (diff <= 5 * 60 * 1000) endText.style.color = "red";
            else if (diff <= 10 * 60 * 1000) endText.style.color = "orange";
            else endText.style.color = "white";
        }

        // Start countdown
        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);

    } catch (err) {
        console.error("Failed to load item:", err);
    }
}

async function loadBids(itemId) {
    try {
        const resp = await fetch(`/api/bids/item/${itemId}`);
        const bids = await resp.json();
        const list = document.getElementById("bid-history");

        if (!bids.length) {
            list.innerHTML = "<p>No bids yet. Be the first!</p>";
            return;
        }
        list.innerHTML = bids
            .map(b => `<p>$${b.amount} — User #${b.userId}</p>`)
            .join("");
    } catch (err) {
        console.error("Failed to load bids:", err);
    }
}

async function placeBid(itemId) {
    const user = AA.getUser();
    if (!user) return AA.requireLogin();

    const amount = Number(document.getElementById("bid-amount").value);

    try {
        const resp = await fetch(`/api/bids/${itemId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: user.userId,
                amount: amount
            }),
        });

        if (!resp.ok) {
            const err = await resp.json();
            AA.toast(`Bid failed: ${err.message ?? "error"}`, "error");
            return;
        }

        AA.toast("Bid placed successfully!", "success");
        loadItem(itemId);
        loadBids(itemId);

    } catch (err) {
        console.error("Bid error:", err);
        AA.toast("Bid failed", "error");
    }
}
