// Logic for app.html (authenticated area)

let currentUser = null;
let selectedItem = null;

let toastEl, toastTitleEl, toastTextEl;

function showToast(title, text, ms = 3800) {
  toastTitleEl.textContent = title;
  toastTextEl.textContent = text;
  toastEl.classList.add("show");
  if (ms > 0) {
    setTimeout(() => toastEl.classList.remove("show"), ms);
  }
}

function log(msg) {
  const logArea = document.getElementById("logArea");
  const ts = new Date().toISOString();
  logArea.textContent += `[${ts}] ${msg}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

function showOutput(data) {
  const out = document.getElementById("outputArea");
  try {
    out.textContent = JSON.stringify(data, null, 2);
  } catch {
    out.textContent = String(data);
  }
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatRemaining(isoString) {
  const end = new Date(isoString);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (isNaN(diffMs)) return "N/A";
  if (diffMs <= 0) return "Ended";
  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

// Thin wrapper around callApi just to log requests
async function api(path, options = {}) {
  const url = buildApiUrl(path);
  log(`Request: ${options.method || "GET"} ${url}`);
  if (options.body) log(`Body: ${JSON.stringify(options.body)}`);
  const data = await callApi(path, options);
  log("Response OK");
  showOutput(data);
  return data;
}

function updateUserUI() {
  const userChip = document.getElementById("userChip");
  const avatar = document.getElementById("userAvatar");
  const nameEl = document.getElementById("userChipName");
  const emailEl = document.getElementById("userChipEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  const sellSellerBadge = document.getElementById("sellSellerBadge");
  const payUserSummary = document.getElementById("payUserSummary");

  if (!currentUser) {
    userChip.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    nameEl.textContent = "Guest";
    emailEl.textContent = "Not signed in";
    sellSellerBadge.textContent = "Not signed in";
    payUserSummary.textContent = "Sign in to pay";
    return;
  }

  userChip.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  const initials =
    (currentUser.firstName?.[0] || currentUser.username?.[0] || "U") +
    (currentUser.lastName?.[0] || "");
  avatar.textContent = initials.toUpperCase();
  nameEl.textContent =
    currentUser.username ||
    `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
  emailEl.textContent = currentUser.email || "No email";
  sellSellerBadge.textContent = `${currentUser.username} (#${currentUser.userId})`;
  payUserSummary.textContent = `${currentUser.firstName || ""} ${
    currentUser.lastName || ""
  } • ${currentUser.username} (#${currentUser.userId})`;
}

function switchView(targetId) {
  const viewIds = [
    "dashboardView",
    "browseView",
    "sellView",
    "paymentsView",
    "debugView",
  ];
  viewIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === targetId) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const view = btn.dataset.view;
    if (view === targetId) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

// ===== Dashboard =====

async function loadDashboardStats() {
  const statsEl = document.getElementById("dashboardStats");
  try {
    const [active, ended] = await Promise.all([
      api("/items/active"),
      api("/items/ended"),
    ]);
    const numActive = Array.isArray(active) ? active.length : 0;
    const numEnded = Array.isArray(ended) ? ended.length : 0;

    statsEl.innerHTML = `
      <p><strong>Active auctions:</strong> ${numActive}</p>
      <p><strong>Ended auctions:</strong> ${numEnded}</p>
      <p><small>Data via <code>GET /api/items/active</code> and
      <code>GET /api/items/ended</code>.</small></p>
    `;

    document.getElementById("dashboardOutput").textContent = JSON.stringify(
      { active, ended },
      null,
      2
    );
  } catch (e) {
    statsEl.innerHTML =
      "<small>Failed to load stats. See API Debug for details.</small>";
  }
}

// ===== Items / browse =====

const itemsTableBody = () => document.getElementById("itemsTableBody");
const bidsTableBody = () => document.getElementById("bidsTableBody");

async function loadItems(mode = "all") {
  let path = "/items";
  if (mode === "active") path = "/items/active";
  if (mode === "ended") path = "/items/ended";

  try {
    const items = await api(path);
    renderItemsTable(items || []);
  } catch (e) {
    showToast("Failed to load items", JSON.stringify(e.data) || "");
  }
}

function renderItemsTable(items) {
  const tbody = itemsTableBody();
  tbody.innerHTML = "";
  selectedItem = null;
  renderItemDetail(null);

  if (!items.length) {
    tbody.innerHTML =
      '<tr><td colspan="6"><small>No items found.</small></td></tr>';
    return;
  }

  for (const item of items) {
    const tr = document.createElement("tr");
    tr.dataset.itemId = item.itemId;

    const auctionType =
      item.auctionType && item.auctionType.toUpperCase() === "DUTCH"
        ? "DUTCH"
        : "FORWARD";
    const status = (item.status || "UNKNOWN").toUpperCase();
    const remaining = item.endTime ? formatRemaining(item.endTime) : "–";

    tr.innerHTML = `
      <td>${escapeHtml(item.title || "")}</td>
      <td><span class="tag ${
        auctionType === "DUTCH" ? "dutch" : "forward"
      }">${auctionType}</span></td>
      <td class="text-right">${
        item.currentPrice != null
          ? Number(item.currentPrice).toFixed(2)
          : "-"
      }</td>
      <td><span class="tag ${
        status === "ACTIVE" ? "active" : "ended"
      }">${status}</span></td>
      <td>${remaining}</td>
      <td class="text-center"><button class="secondary selectItemBtn">Select</button></td>
    `;

    tr.addEventListener("click", (ev) => {
      if (ev.target.classList.contains("selectItemBtn")) ev.stopPropagation();
      tbody
        .querySelectorAll("tr")
        .forEach((row) => row.classList.remove("selected"));
      tr.classList.add("selected");
      selectedItem = item;
      renderItemDetail(item);
    });

    tbody.appendChild(tr);
  }
}

function renderItemDetail(item) {
  const detail = document.getElementById("itemDetail");
  const empty = document.getElementById("itemDetailEmpty");
  const bidsBody = bidsTableBody();

  if (!item) {
    detail.classList.add("hidden");
    empty.classList.remove("hidden");
    bidsBody.innerHTML = "";
    return;
  }

  detail.classList.remove("hidden");
  empty.classList.add("hidden");

  const auctionType =
    item.auctionType && item.auctionType.toUpperCase() === "DUTCH"
      ? "DUTCH"
      : "FORWARD";
  const status = (item.status || "UNKNOWN").toUpperCase();

  const typeTag = document.getElementById("detailAuctionTypeTag");
  typeTag.textContent = auctionType;
  typeTag.classList.toggle("dutch", auctionType === "DUTCH");
  typeTag.classList.toggle("forward", auctionType === "FORWARD");

  const statusTag = document.getElementById("detailStatusTag");
  statusTag.textContent = status;
  statusTag.classList.toggle("active", status === "ACTIVE");
  statusTag.classList.toggle("ended", status === "ENDED");

  document.getElementById("detailTitle").textContent =
    item.title || "Untitled item";
  document.getElementById(
    "detailIdLine"
  ).textContent = `Item #${item.itemId} • Seller #${item.sellerId}`;
  document.getElementById("detailDescription").textContent =
    item.description || "No description provided.";
  document.getElementById("detailCurrentPrice").textContent =
    item.currentPrice != null
      ? `$${Number(item.currentPrice).toFixed(2)}`
      : `$${Number(item.startingPrice || 0).toFixed(2)} (starting)`;
  document.getElementById("detailWinner").textContent =
    item.currentWinnerId != null
      ? `User #${item.currentWinnerId}`
      : "No winner yet";
  document.getElementById("detailEndTime").textContent =
    item.endTime || "Not set";
  document.getElementById("detailRemaining").textContent = item.endTime
    ? formatRemaining(item.endTime)
    : "N/A";

  const forwardArea = document.getElementById("forwardBidArea");
  const dutchArea = document.getElementById("dutchArea");
  if (auctionType === "DUTCH") {
    forwardArea.classList.add("hidden");
    dutchArea.classList.remove("hidden");
    loadDutchPrice(item.itemId);
  } else {
    forwardArea.classList.remove("hidden");
    dutchArea.classList.add("hidden");
  }

  loadBidsForItem(item.itemId);
}

async function loadBidsForItem(itemId) {
  const tbody = bidsTableBody();
  tbody.innerHTML =
    "<tr><td colspan='4'><small>Loading...</small></td></tr>";
  try {
    const bids = await api(`/items/${encodeURIComponent(itemId)}/bids`);
    tbody.innerHTML = "";
    if (!bids || !bids.length) {
      tbody.innerHTML =
        "<tr><td colspan='4'><small>No bids yet.</small></td></tr>";
      return;
    }
    for (const bid of bids) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${bid.bidId}</td>
        <td>#${bid.bidderId}</td>
        <td class="text-right">${Number(bid.amount).toFixed(2)}</td>
        <td>${escapeHtml(bid.bidTime || "")}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (e) {
    tbody.innerHTML =
      "<tr><td colspan='4'><small>Failed to load bids.</small></td></tr>";
  }
}

async function loadDutchPrice(itemId) {
  try {
    const data = await api(
      `/items/${encodeURIComponent(itemId)}/dutch/price`
    );
    const price =
      data && data.currentPrice != null
        ? Number(data.currentPrice).toFixed(2)
        : "N/A";
    document.getElementById("dutchCurrentPrice").textContent = `$${price}`;
  } catch (e) {
    showToast(
      "Dutch price error",
      JSON.stringify(e.data) || "Failed to fetch price."
    );
  }
}

// ===== Sell / my items =====

async function loadMyItems() {
  if (!currentUser) return;
  try {
    const items = await api(
      `/items?ownerId=${encodeURIComponent(currentUser.userId)}`
    );
    const tbody = document.getElementById("myItemsTableBody");
    tbody.innerHTML = "";
    if (!items || !items.length) {
      tbody.innerHTML =
        "<tr><td colspan='5'><small>No items listed by you yet.</small></td></tr>";
      return;
    }
    for (const item of items) {
      const type =
        item.auctionType &&
        item.auctionType.toUpperCase() === "DUTCH"
          ? "DUTCH"
          : "FORWARD";
      const status = (item.status || "UNKNOWN").toUpperCase();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.itemId}</td>
        <td>${escapeHtml(item.title || "")}</td>
        <td>${type}</td>
        <td class="text-right">${
          item.currentPrice != null
            ? Number(item.currentPrice).toFixed(2)
            : "-"
        }</td>
        <td>${status}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (e) {
    showToast(
      "My items failed",
      JSON.stringify(e.data) || "Error fetching listings."
    );
  }
}

// ===== Payments / receipts =====

function renderReceipt(receipt) {
  const container = document.getElementById("receiptContent");
  if (!receipt) {
    container.innerHTML =
      "<small>No receipt returned from server.</small>";
    return;
  }

  const shippingDaysText =
    "The item will be shipped in " +
    (receipt.estimatedShippingDays || "X") +
    " days.";

  container.innerHTML = `
    <div class="grid two">
      <div>
        <h3 style="margin-bottom:.3rem;">Receipt info</h3>
        <p><strong>Item #${
          receipt.itemId
        }</strong>: ${escapeHtml(receipt.title || "")}</p>
        <p>Type: ${
          receipt.auctionType || "N/A"
        } • Status: ${receipt.status || "N/A"}</p>
        <p>Final price: <strong>$${Number(
          receipt.finalPrice || 0
        ).toFixed(2)}</strong></p>
        <p>Payment status: <strong>${
          receipt.paymentStatus || "UNPAID"
        }</strong></p>
        <p>Paid at: ${escapeHtml(receipt.paymentTime || "N/A")}</p>
      </div>
      <div>
        <h3 style="margin-bottom:.3rem;">Shipping details</h3>
        <p>${shippingDaysText}</p>
        <p>Seller: ${
          receipt.seller
            ? `${escapeHtml(
                receipt.seller.username
              )} (#${receipt.seller.id})`
            : "Unknown / deleted user"
        }</p>
        <p>Buyer: ${
          receipt.buyer
            ? `${escapeHtml(
                receipt.buyer.username
              )} (#${receipt.buyer.id})`
            : "Unknown / deleted user"
        }</p>
      </div>
    </div>
  `;
}

// ===== Init + event wiring =====

document.addEventListener("DOMContentLoaded", () => {
  toastEl = document.getElementById("toast");
  toastTitleEl = document.getElementById("toastTitle");
  toastTextEl = document.getElementById("toastText");
  document.getElementById("toastClose").addEventListener("click", () =>
    toastEl.classList.remove("show")
  );

  // Enforce login: if no user, kick back to index.html
  const stored = getStoredUser();
  if (!stored || !stored.userId) {
    window.location.href = "index.html";
    return;
  }
  currentUser = stored;
  updateUserUI();

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearStoredUser();
    showToast("Signed out", "You have been logged out.", 1500);
    setTimeout(() => (window.location.href = "index.html"), 900);
  });

  // Nav buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const viewId = btn.dataset.view;
      switchView(viewId);
    });
  });

  // Dashboard buttons
  document
    .getElementById("reloadDashboardBtn")
    .addEventListener("click", loadDashboardStats);
  document
    .getElementById("dashListActiveBtn")
    .addEventListener("click", async () => {
      switchView("browseView");
      await loadItems("active");
    });
  document
    .getElementById("dashMyItemsBtn")
    .addEventListener("click", async () => {
      switchView("sellView");
      await loadMyItems();
    });
  document
    .getElementById("dashEndedBtn")
    .addEventListener("click", async () => {
      switchView("browseView");
      await loadItems("ended");
    });

  // Browse buttons
  document
    .getElementById("browseActiveBtn")
    .addEventListener("click", () => loadItems("active"));
  document
    .getElementById("browseEndedBtn")
    .addEventListener("click", () => loadItems("ended"));
  document
    .getElementById("browseAllBtn")
    .addEventListener("click", () => loadItems("all"));
  document
    .getElementById("searchItemsBtn")
    .addEventListener("click", async () => {
      const q = document.getElementById("searchQuery").value.trim();
      const path = q
        ? `/items/search?q=${encodeURIComponent(q)}`
        : "/items";
      try {
        const items = await api(path);
        renderItemsTable(items || []);
      } catch (e) {
        showToast("Search failed", JSON.stringify(e.data) || "");
      }
    });

  // Bidding / dutch / end auction
  document
    .getElementById("refreshBidsBtn")
    .addEventListener("click", () => {
      if (!selectedItem) return;
      loadBidsForItem(selectedItem.itemId);
    });

  document
    .getElementById("dutchPriceBtn")
    .addEventListener("click", () => {
      if (!selectedItem) return;
      loadDutchPrice(selectedItem.itemId);
    });

  document
    .getElementById("dutchAcceptBtn")
    .addEventListener("click", async () => {
      if (!selectedItem) return;
      try {
        const data = await api(
          `/items/${encodeURIComponent(selectedItem.itemId)}/dutch/accept`,
          {
            method: "POST",
            body: { buyerId: currentUser.userId },
          }
        );
        showToast(
          "Dutch accepted",
          `You accepted the current price on item #${selectedItem.itemId}.`
        );
        selectedItem = data;
        renderItemDetail(data);
      } catch (e) {
        showToast(
          "Dutch accept failed",
          JSON.stringify(e.data) || "Check log."
        );
      }
    });

  document
    .getElementById("placeBidBtn")
    .addEventListener("click", async () => {
      if (!selectedItem) {
        showToast(
          "No item selected",
          "Pick an item from the list first."
        );
        return;
      }
      const amountStr = document.getElementById("bidAmount").value;
      if (!amountStr) {
        showToast("Missing amount", "Enter a bid amount.");
        return;
      }
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        showToast("Invalid amount", "Enter a numeric bid.");
        return;
      }
      try {
        await api(
          `/items/${encodeURIComponent(selectedItem.itemId)}/bids`,
          {
            method: "POST",
            body: { bidderId: currentUser.userId, amount },
          }
        );
        showToast(
          "Bid placed",
          `Your bid on item #${selectedItem.itemId} was submitted.`
        );
        const updatedItem = await api(
          `/items/${encodeURIComponent(selectedItem.itemId)}`
        );
        selectedItem = updatedItem;
        renderItemDetail(updatedItem);
      } catch (e) {
        showToast(
          "Bid failed",
          (e.data && e.data.error) ||
            JSON.stringify(e.data) ||
            "Check log."
        );
      }
    });

  document
    .getElementById("endAuctionBtn")
    .addEventListener("click", async () => {
      if (!selectedItem) {
        showToast(
          "No item selected",
          "Select an item to end its auction."
        );
        return;
      }
      try {
        const data = await api(
          `/items/${encodeURIComponent(selectedItem.itemId)}/end`,
          { method: "POST" }
        );
        showToast(
          "Auction ended",
          `Item #${selectedItem.itemId} is now ENDED.`
        );
        selectedItem = data;
        renderItemDetail(data);
      } catch (e) {
        showToast(
          "End failed",
          JSON.stringify(e.data) || "Could not end auction."
        );
      }
    });

  document
    .getElementById("goToPaymentBtn")
    .addEventListener("click", () => {
      if (selectedItem) {
        document.getElementById("payItemId").value = selectedItem.itemId;
        document.getElementById("receiptItemId").value =
          selectedItem.itemId;
      }
      switchView("paymentsView");
    });

  // Sell
  document
    .getElementById("createItemBtn")
    .addEventListener("click", async () => {
      const title = document.getElementById("createTitle").value.trim();
      const description = document
        .getElementById("createDescription")
        .value.trim();
      const startingPriceStr =
        document.getElementById("createStartingPrice").value;
      const minPriceStr =
        document.getElementById("createMinimumPrice").value;
      const auctionType =
        document.getElementById("createAuctionType").value;
      const endTimeStr = document
        .getElementById("createEndTime")
        .value.trim();

      if (!title || !startingPriceStr) {
        showToast(
          "Missing fields",
          "Title and starting price are required."
        );
        return;
      }

      const startingPrice = parseFloat(startingPriceStr);
      const minimumPrice = minPriceStr ? parseFloat(minPriceStr) : null;

      const body = {
        sellerId: currentUser.userId,
        title,
        description,
        startingPrice,
        minimumPrice,
        auctionType,
        endTime: endTimeStr || null,
        // extra for compatibility
        userId: currentUser.userId,
        itemName: title,
        price: startingPrice,
      };

      try {
        const created = await api("/items", {
          method: "POST",
          body,
        });
        showToast(
          "Auction created",
          `Item #${created.itemId} created successfully.`
        );
        loadMyItems();
      } catch (e) {
        showToast(
          "Create failed",
          (e.data && e.data.error) ||
            JSON.stringify(e.data) ||
            "Check log."
        );
      }
    });

  document
    .getElementById("loadMyItemsBtn")
    .addEventListener("click", loadMyItems);

  // Payments
  document
    .getElementById("paymentsPrefillBtn")
    .addEventListener("click", () => {
      if (!selectedItem) {
        showToast(
          "No item selected",
          "Pick an auction from Browse first."
        );
        return;
      }
      document.getElementById("payItemId").value = selectedItem.itemId;
      document.getElementById("receiptItemId").value = selectedItem.itemId;
      showToast(
        "Prefilled",
        `Payment & receipt forms now use item #${selectedItem.itemId}.`
      );
    });

  document.getElementById("payBtn").addEventListener("click", async () => {
    const itemId = document.getElementById("payItemId").value;
    if (!itemId) {
      showToast(
        "Missing item ID",
        "Specify which item to pay for."
      );
      return;
    }
    const method =
      document.getElementById("payMethod").value.trim() ||
      "FAKE_CARD";
    const noteUser =
      document.getElementById("payNote").value.trim();
    const cardNumber =
      document.getElementById("cardNumber").value.trim();
    const cardName =
      document.getElementById("cardName").value.trim();
    const cardExpiry =
      document.getElementById("cardExpiry").value.trim();
    const cardCvv =
      document.getElementById("cardCvv").value.trim();
    const expedited =
      document.getElementById("expeditedCheckbox").checked;

    const notePieces = [];
    if (noteUser) notePieces.push(noteUser);
    notePieces.push(
      `Card: ${cardNumber} / ${cardName} / ${cardExpiry} / CVV=${cardCvv}`
    );
    notePieces.push(
      expedited ? "Expedited shipping: YES" : "Expedited shipping: NO"
    );

    const body = {
      payerId: currentUser.userId,
      method,
      note: notePieces.join(" | "),
    };

    try {
      const receipt = await api(
        `/items/${encodeURIComponent(itemId)}/pay`,
        { method: "POST", body }
      );
      showToast(
        "Payment simulated",
        `Payment processed for item #${itemId}.`
      );
      renderReceipt(receipt);
    } catch (e) {
      showToast(
        "Payment failed",
        (e.data && e.data.error) ||
          JSON.stringify(e.data) ||
          "Check log."
      );
    }
  });

  document
    .getElementById("receiptBtn")
    .addEventListener("click", async () => {
      const itemId = document.getElementById("receiptItemId").value;
      if (!itemId) {
        showToast(
          "Missing item ID",
          "Enter an item to load a receipt for."
        );
        return;
      }
      try {
        const receipt = await api(
          `/items/${encodeURIComponent(itemId)}/receipt`
        );
        renderReceipt(receipt);
      } catch (e) {
        showToast(
          "Receipt error",
          (e.data && e.data.error) ||
            JSON.stringify(e.data) ||
            "Check log."
        );
      }
    });

  // Initial view + data
  switchView("dashboardView");
  loadDashboardStats();
  loadMyItems();
  loadItems("active");
});