// Front-end utilities + API adapter (sender/receiver aware, no localhost default)
const API_BASE_URL = (localStorage.getItem('API_BASE_URL') || '').replace(/\/+$/,''); // e.g., https://api.yourdomain.com 
const SENDER_ID   = localStorage.getItem('SENDER_ID')   || 'aurora-web';
const RECEIVER_ID = localStorage.getItem('RECEIVER_ID') || 'mid-tier';

// Tiny DOM helpers
export function $(sel, el=document){ return el.querySelector(sel); }
export function $all(sel, el=document){ return [...el.querySelectorAll(sel)]; }
export function toast(msg){ alert(msg); }

// --- Demo catalogue bootstrap (stays for offline UX) ---
const demoItems = [
  { id:'1001', title:'Vintage Camera', auctionType:'forward', image:'https://picsum.photos/seed/cam/600/400', currentPrice:125, minIncrement:5, endsAt:Date.now()+1000*60*8, shippingDays:5, shipCost:15, shipCostExp:30 },
  { id:'1002', title:'Rare Sneakers',  auctionType:'forward', image:'https://picsum.photos/seed/shoes/600/400', currentPrice:240, minIncrement:10, endsAt:Date.now()+1000*60*3, shippingDays:7, shipCost:20, shipCostExp:38 },
  { id:'1003', title:'Gaming GPU',     auctionType:'dutch',   image:'https://picsum.photos/seed/gpu/600/400', startPrice:899, step:50, floor:649, priceNow:899, lastDrop:Date.now(), dropEverySec:30, shippingDays:3, shipCost:25, shipCostExp:45 }
];
if(!localStorage.getItem('DEMO_ITEMS')){
  localStorage.setItem('DEMO_ITEMS', JSON.stringify(demoItems));
}

// --- Low-level fetch with sender/receiver headers ---
async function api(path, opts={}){
  if(!API_BASE_URL){ // No backend configured; fall back to demo
    throw new Error('NO_BACKEND');
  }
  const headers = {
    'Content-Type':'application/json',
    'X-Sender': SENDER_ID,
    'X-Receiver': RECEIVER_ID,
    ...(opts.headers||{})
  };
  const res = await fetch(API_BASE_URL + path, { ...opts, headers });
  if(!res.ok){
    const text = await res.text().catch(()=> '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  if(res.status === 204) return null;
  return res.json();
}

// --- Auth & Catalogue API (with graceful demo fallback) ---
export const DemoAPI = {
  // -------- Catalogue --------
  async search(q=''){
    // demo dutch price decay
    const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
    const now = Date.now();
    items.forEach(it=>{
      if(it.auctionType==='dutch'){
        const elapsed = Math.floor((now - it.lastDrop)/1000);
        const steps = Math.floor(elapsed / it.dropEverySec);
        let price = it.priceNow - steps*it.step;
        if(price < it.floor) price = it.floor;
        if(steps>0){ it.priceNow = price; it.lastDrop = now; }
      }
    });
    localStorage.setItem('DEMO_ITEMS', JSON.stringify(items));

    try{
      // backend search (sender/receiver headers included)
      const data = await api('/api/catalogue/search?q='+encodeURIComponent(q));
      return data.items || [];
    }catch(e){
      if(e.message==='NO_BACKEND') {
        return items.filter(it => it.title.toLowerCase().includes(q.toLowerCase()));
      }
      console.warn('search fallback due to', e);
      return items.filter(it => it.title.toLowerCase().includes(q.toLowerCase()));
    }
  },

  async item(id){
    try{
      return await api('/api/catalogue/items/'+encodeURIComponent(id));
    }catch(e){
      const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
      return items.find(i=>i.id===id);
    }
  },

  async bidForward(id, amount){
    const user = this.user();
    if(!user) throw new Error('Sign in required');

    try{
      return await api('/api/bidding/forward', {
        method:'POST',
        body: JSON.stringify({ itemId:id, amount })
      });
    }catch(e){
      // demo path
      const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
      const it = items.find(i=>i.id===id);
      if(!it) throw new Error('Item not found');
      const now = Date.now();
      if(now > it.endsAt) throw new Error('Auction ended');
      if(amount <= it.currentPrice) throw new Error('Bid must be higher than current');
      if(amount - it.currentPrice < it.minIncrement) throw new Error(`Min increment ${it.minIncrement}`);
      it.currentPrice = amount;
      it.highestBidder = user.username || 'you';
      localStorage.setItem('DEMO_ITEMS', JSON.stringify(items));
      return it;
    }
  },

  async buyNowDutch(id){
    const user = this.user();
    if(!user) throw new Error('Sign in required');

    try{
      return await api('/api/buy/dutch', {
        method:'POST',
        body: JSON.stringify({ itemId:id })
      });
    }catch(e){
      const items = JSON.parse(localStorage.getItem('DEMO_ITEMS')||'[]');
      const it = items.find(i=>i.id===id);
      if(!it) throw new Error('Item not found');
      it.winner = user.username || 'you';
      it.winPrice = it.priceNow;
      it.ended = true;
      localStorage.setItem('DEMO_ITEMS', JSON.stringify(items));
      return it;
    }
  },

  // -------- Auth (Create Account + 2-step verification sign-in) --------
  async register({username, password, firstName, lastName, address}){
    if(!username || !password) throw new Error('Username & password required');
    try{
      const user = await api('/api/auth/register', {
        method:'POST',
        body: JSON.stringify({ username, password, firstName, lastName, address })
      });
      return user;
    }catch(e){
      // store in local demo "backend"
      const users = JSON.parse(localStorage.getItem('DEMO_USERS')||'[]');
      if(users.some(u=>u.username===username)) throw new Error('Username already exists');
      const demoUser = { username, password, firstName:firstName||'Demo', lastName:lastName||'User', address: address||'123 Yonge St, Toronto, ON' };
      users.push(demoUser);
      localStorage.setItem('DEMO_USERS', JSON.stringify(users));
      return { ok:true };
    }
  },

  // Step 1: request verification (sends/returns a code)
  async signInStart(username, password){
    if(!username || !password) throw new Error('Missing credentials');
    try{
      const resp = await api('/api/auth/login', {
        method:'POST',
        body: JSON.stringify({ username, password })
      });
      // backend should send code to user (email/SMS). Here we just return a token.
      sessionStorage.setItem('PENDING_AUTH', JSON.stringify({ username, token: resp.token || 'pending' }));
      return { sent:true, method: resp.method || 'code' };
    }catch(e){
      // demo path: verify password against stored users, then generate a code
      const users = JSON.parse(localStorage.getItem('DEMO_USERS')||'[]');
      const found = users.find(u=>u.username===username && u.password===password);
      if(!found) throw new Error('Invalid credentials');
      const code = String(Math.floor(100000 + Math.random()*900000));
      sessionStorage.setItem('DEMO_CODE', code);
      sessionStorage.setItem('PENDING_AUTH', JSON.stringify({ username }));
      console.info('Demo verification code:', code);
      return { sent:true, method:'code', demoCode: code }; // code shown in console for demo
    }
  },

  // Step 2: submit verification code
  async signInVerify(code){
    const pending = JSON.parse(sessionStorage.getItem('PENDING_AUTH')||'null');
    if(!pending) throw new Error('No pending sign-in');
    try{
      const user = await api('/api/auth/verify', {
        method:'POST',
        body: JSON.stringify({ token: pending.token, code })
      });
      localStorage.setItem('SESSION_USER', JSON.stringify(user));
      sessionStorage.removeItem('PENDING_AUTH');
      return user;
    }catch(e){
      const demoCode = sessionStorage.getItem('DEMO_CODE');
      if(code !== demoCode) throw new Error('Invalid verification code');
      sessionStorage.removeItem('DEMO_CODE');
      const users = JSON.parse(localStorage.getItem('DEMO_USERS')||'[]');
      const u = users.find(x=>x.username===pending.username);
      const user = { username:u.username, firstName:u.firstName, lastName:u.lastName, address:u.address };
      localStorage.setItem('SESSION_USER', JSON.stringify(user));
      sessionStorage.removeItem('PENDING_AUTH');
      return user;
    }
  },

  user(){ return JSON.parse(localStorage.getItem('SESSION_USER')||'null'); },
  signOut(){ localStorage.removeItem('SESSION_USER'); },
};

// --- helpers ---
export function requireAuth(){
  const u = DemoAPI.user();
  if(!u){ window.location.href = '/pages/login.html'; }
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