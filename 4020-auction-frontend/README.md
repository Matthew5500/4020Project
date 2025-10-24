# Aurora Auctions — Front-End (Assignment-Ready)

This folder contains a fully client-side front end for your three-tier auction system.

## Folder name
Use `auction-frontend` at repo root (or `/var/www/auction-frontend` if serving).

## How to run locally
1. Serve the folder with a static server (any of):
   - Python: `python -m http.server 8000` (then open http://localhost:8000)
   - VS Code Live Server
   - nginx/Apache pointing to this directory

2. Optional: point the UI to your middle-tier:
   - Open DevTools Console and run:
     `localStorage.API_BASE_URL = 'http://localhost:8080'`

## Pages
- `index.html` – Home + featured auctions
- `pages/login.html` – UC1 Sign-in (demo only, localStorage)
- `pages/browse.html` – UC2 search & list
- `pages/item.html` – UC3 forward & dutch bidding UI (with timer / Buy Now)
- `pages/pay.html` – UC4/UC5 Pay Now
- `pages/receipt.html` – UC6 Receipt and shipping details
- `pages/sell.html` – UC7 Seller listing (writes to demo catalogue)

## Switching from demo to real APIs
Replace `DemoAPI` calls in `/assets/js/utils.js` with `fetch()` calls to your middle tier endpoints.

### Suggested endpoints (middle-tier)
- `GET /catalogue?search=keyword` → list items
- `GET /items/{id}` → item details (type, price, timers)
- `POST /items/{id}/bids` → {{ amount }}
- `POST /items/{id}/buy-now` → dutch accept
- `POST /payments` → {{ itemId, card, address, shipSpeed }}
- `POST /auth/login` → {{ username, password }}