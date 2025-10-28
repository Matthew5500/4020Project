// Minimal front-end utilities and an API adapter
const API_BASE_URL = localStorage.getItem('API_BASE_URL') || 'http://localhost:8080'; // middle-tier base

export function $(sel, el=document){ return el.querySelector(sel); } // single element
export function $all(sel, el=document){ return [...el.querySelectorAll(sel)]; } // all elements

export function toast(msg){ // Simple toast notification
  alert(msg); // Simple placeholder; integrate a nicer toaster later
}

// Simple state cache for demo if backend not ready
const demoItems = [ // Demo auction items
  { id:'1001', title:'Vintage Camera', auctionType:'forward', image:'https://picsum.photos/seed/cam/600/400', currentPrice:125, minIncrement:5, endsAt:Date.now()+ 1000*60*8, shippingDays:5, shipCost:15, shipCostExp:30 }, // forward auction
  { id:'1002', title:'Rare Sneakers', auctionType:'forward', image:'https://picsum.photos/seed/shoes/600/400', currentPrice:240, minIncrement:10, endsAt:Date.now()+ 1000*60*3, shippingDays:7, shipCost:20, shipCostExp:38 }, // forward auction
  { id:'1003', title:'Gaming GPU', auctionType:'dutch',   image:'https://picsum.photos/seed/gpu/600/400', startPrice:899, step:50, floor:649, priceNow:899, lastDrop:Date.now(), dropEverySec:30, shippingDays:3, shipCost:25, shipCostExp:45 } // dutch auction
];

// Fake persistence for demo
if(!localStorage.getItem('DEMO_ITEMS')){ // Initialize demo items in localStorage
  localStorage.setItem('DEMO_ITEMS', JSON.stringify(demoItems)); // Store demo items
}

export const DemoAPI = { // Demo API adapter
  async search(q=''){ // Search items by title
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]'); // Load items from localStorage
    const now = Date.now(); // Current timestamp
    // compute dynamic dutch price
    items.forEach(it=>{ // Update each item
      if(it.auctionType==='dutch'){ // If dutch auction
        const elapsed = Math.floor((now - it.lastDrop)/1000); // Elapsed time in seconds
        const steps = Math.floor(elapsed / it.dropEverySec); // Number of price drop steps
        let price = it.priceNow - steps*it.step; // Calculate new price
        if(price < it.floor) price = it.floor; // Ensure price doesn't go below floor
        it.priceNow = price; // Update current price
      }
    });
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items)); // Save updated items back to localStorage
    return items.filter(it => it.title.toLowerCase().includes(q.toLowerCase())); // Filter items by search query
  }, 
  async item(id){ // Get item details by ID
    return JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]').find(i=>i.id===id); // Find and return item by ID
  }, 
  async bidForward(id, amount){ // Place bid on forward auction item
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]'); // Load items from localStorage
    const it = items.find(i=>i.id===id); // Find item by ID
    if(!it) throw new Error('Item not found'); // Error if item not found
    const now = Date.now(); // Current timestamp
    if(now > it.endsAt) throw new Error('Auction ended'); // Error if auction has ended
    if(amount <= it.currentPrice) throw new Error('Bid must be higher than current'); // Error if bid is not higher than current price
    if(amount - it.currentPrice < it.minIncrement) throw new Error(`Min increment ${it.minIncrement}`); // Error if bid increment is too low
    it.currentPrice = amount; // Update current price
    it.highestBidder = (JSON.parse(localStorage.getItem('SESSION_USER')||'{}').username || 'you'); // Set highest bidder
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items)); // Save updated items back to localStorage
    return it; // Return updated item
  },
  async buyNowDutch(id){ // Buy now on dutch auction item
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]'); // Load items from localStorage
    const it = items.find(i=>i.id===id); // Find item by ID
    if(!it) throw new Error('Item not found'); // Error if item not found
    it.winner = (JSON.parse(localStorage.getItem('SESSION_USER')||'{}').username || 'you'); // Set winner
    it.winPrice = it.priceNow; // Set winning price
    it.ended = true; // Mark auction as ended
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items)); // Save updated items back to localStorage
    return it; // Return updated item
  },
  async signIn(username, password){ // Sign in user
    if(!username || !password) throw new Error('Missing credentials'); // Error if credentials are missing
    const user = { username, firstName:'Demo', lastName:'User', address:'123 Yonge St, Toronto, ON' }; // Create demo user object
    localStorage.setItem('SESSION_USER', JSON.stringify(user)); // Store user in localStorage
    return user; // Return user object
  },
  user(){ return JSON.parse(localStorage.getItem('SESSION_USER')||'null'); }, // Get current user
  signOut(){ localStorage.removeItem('SESSION_USER'); } // Sign out user
};

export function requireAuth(){ // Ensure user is authenticated
  const u = DemoAPI.user(); // Get current user
  if(!u){ // If no user
    window.location.href = '/pages/login.html'; // Redirect to login page
  } // if no user
  return u; // Return user
}

export function formatCurrency(n){ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n); } // Format number as currency
export function remaining(ms){ // Format remaining time in mm:ss
  if(ms <= 0) return '00:00'; // If time is up
  const s = Math.floor(ms/1000); // Total seconds
  const m = Math.floor(s/60); // Minutes
  const r = s%60; // Remaining seconds
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; // Return formatted string
}

export function navActive(){ // Highlight active navigation link
  const here = location.pathname.split('/').pop(); // Get current page filename
  document.querySelectorAll('nav a').forEach(a=>{ // For each nav link
    if(a.getAttribute('href').endsWith(here)) a.classList.add('active'); // Add active class if it matches current page
  }); // For each nav link
}