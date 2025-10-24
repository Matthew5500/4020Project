// Minimal front-end utilities and an API adapter
const API_BASE_URL = localStorage.getItem('API_BASE_URL') || 'http://localhost:8080'; // middle-tier base

export function $(sel, el=document){ return el.querySelector(sel); }
export function $all(sel, el=document){ return [...el.querySelectorAll(sel)]; }

export function toast(msg){
  alert(msg); // Simple placeholder; integrate a nicer toaster later
}

// Simple state cache for demo if backend not ready
const demoItems = [
  { id:'1001', title:'Vintage Camera', auctionType:'forward', image:'https://picsum.photos/seed/cam/600/400', currentPrice:125, minIncrement:5, endsAt:Date.now()+ 1000*60*8, shippingDays:5, shipCost:15, shipCostExp:30 },
  { id:'1002', title:'Rare Sneakers', auctionType:'forward', image:'https://picsum.photos/seed/shoes/600/400', currentPrice:240, minIncrement:10, endsAt:Date.now()+ 1000*60*3, shippingDays:7, shipCost:20, shipCostExp:38 },
  { id:'1003', title:'Gaming GPU', auctionType:'dutch',   image:'https://picsum.photos/seed/gpu/600/400', startPrice:899, step:50, floor:649, priceNow:899, lastDrop:Date.now(), dropEverySec:30, shippingDays:3, shipCost:25, shipCostExp:45 }
];

// Fake persistence for demo
if(!localStorage.getItem('DEMO_ITEMS')){
  localStorage.setItem('DEMO_ITEMS', JSON.stringify(demoItems));
}

export const DemoAPI = {
  async search(q=''){
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
    const now = Date.now();
    // compute dynamic dutch price
    items.forEach(it=>{
      if(it.auctionType==='dutch'){
        const elapsed = Math.floor((now - it.lastDrop)/1000);
        const steps = Math.floor(elapsed / it.dropEverySec);
        let price = it.priceNow - steps*it.step;
        if(price < it.floor) price = it.floor;
        it.priceNow = price;
      }
    });
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items));
    return items.filter(it => it.title.toLowerCase().includes(q.toLowerCase()));
  },
  async item(id){
    return JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]').find(i=>i.id===id);
  },
  async bidForward(id, amount){
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
    const it = items.find(i=>i.id===id);
    if(!it) throw new Error('Item not found');
    const now = Date.now();
    if(now > it.endsAt) throw new Error('Auction ended');
    if(amount <= it.currentPrice) throw new Error('Bid must be higher than current');
    if(amount - it.currentPrice < it.minIncrement) throw new Error(`Min increment ${it.minIncrement}`);
    it.currentPrice = amount;
    it.highestBidder = (JSON.parse(localStorage.getItem('SESSION_USER')||'{}').username || 'you');
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items));
    return it;
  },
  async buyNowDutch(id){
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
    const it = items.find(i=>i.id===id);
    if(!it) throw new Error('Item not found');
    it.winner = (JSON.parse(localStorage.getItem('SESSION_USER')||'{}').username || 'you');
    it.winPrice = it.priceNow;
    it.ended = true;
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items));
    return it;
  },
  async signIn(username, password){
    if(!username || !password) throw new Error('Missing credentials');
    const user = { username, firstName:'Demo', lastName:'User', address:'123 Yonge St, Toronto, ON' };
    localStorage.setItem('SESSION_USER', JSON.stringify(user));
    return user;
  },
  user(){ return JSON.parse(localStorage.getItem('SESSION_USER')||'null'); },
  signOut(){ localStorage.removeItem('SESSION_USER'); }
};

export function requireAuth(){
  const u = DemoAPI.user();
  if(!u){
    window.location.href = '/pages/login.html';
  }
  return u;
}

export function formatCurrency(n){ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n); }
export function remaining(ms){
  if(ms <= 0) return '00:00';
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const r = s%60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

export function navActive(){
  const here = location.pathname.split('/').pop();
  document.querySelectorAll('nav a').forEach(a=>{
    if(a.getAttribute('href').endsWith(here)) a.classList.add('active');
  });
}