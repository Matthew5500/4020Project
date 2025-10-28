// utils.js — Front-end utilities + API adapter (DB-backed auth via mid-tier)

// ---------- Configuration ----------
const DEFAULT_API_BASE =
  (typeof window !== 'undefined' && window.location && window.location.origin
    ? window.location.origin
    : '') + '/api';

export const API_BASE_URL = (localStorage.getItem('API_BASE_URL') || DEFAULT_API_BASE).replace(/\/+$/, '');
export const SENDER_ID   = localStorage.getItem('SENDER_ID')   || 'aurora-web';
export const RECEIVER_ID = localStorage.getItem('RECEIVER_ID') || 'mid-tier';

// Allow runtime override from console if needed:
//   setApiBase('http://100.75.75.30/api')
export function setApiBase(url){
  localStorage.setItem('API_BASE_URL', String(url).replace(/\/+$/,''));
  window.location.reload();
}

// ---------- Tiny DOM helpers ----------
export function $(sel, el=document){ return el.querySelector(sel); }
export function $all(sel, el=document){ return [...el.querySelectorAll(sel)]; }
export function toast(msg){ alert(msg); }

// ---------- Auth token storage ----------
function getToken(){ return localStorage.getItem('SESSION_TOKEN') || null; }
function setToken(t){ t ? localStorage.setItem('SESSION_TOKEN', t) : localStorage.removeItem('SESSION_TOKEN'); }
function setSessionUser(u){ u ? localStorage.setItem('SESSION_USER', JSON.stringify(u)) : localStorage.removeItem('SESSION_USER'); }
export function currentUser(){ return JSON.parse(localStorage.getItem('SESSION_USER') || 'null'); }

// ---------- Low-level fetch helper ----------
async function api(path, opts={}){
  const headers = {
    'Content-Type': 'application/json',
    'X-Sender': SENDER_ID,
    'X-Receiver': RECEIVER_ID,
    ...(opts.headers || {})
  };

  const token = getToken();
  if(token){
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE_URL + path, { ...opts, headers });
  // If unauthorized, clear session and bounce to login
  if(res.status === 401){
    signOut();
    throw new Error('Unauthorized');
  }
  if(!res.ok){
    const text = await res.text().catch(()=> '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  if(res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// ---------- Auth API (database-backed via mid-tier) ----------
/**
 * Registers a new account in DB through mid-tier.
 * Body fields: { username, password, firstName, lastName, address }
 */
export async function register({username, password, firstName, lastName, address}){
  if(!username || !password) throw new Error('Username and password are required.');
  const user = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, firstName, lastName, address })
  });
  return user; // backend returns created user (no token yet)
}

/**
 * Logs in against DB; expects backend to verify credentials and return { token, user }.
 */
export async function login(username, password){
  if(!username || !password) throw new Error('Missing credentials.');
  const resp = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if(!resp || !resp.token || !resp.user){
    throw new Error('Invalid login response from server.');
  }
  setToken(resp.token);
  setSessionUser(resp.user);
  return resp.user;
}

/**
 * Optional: fetch the current user from backend to refresh profile/session.
 */
export async function refreshMe(){
  const me = await api('/auth/me', { method: 'GET' });
  setSessionUser(me);
  return me;
}

export function signOut(){
  setToken(null);
  setSessionUser(null);
  // If you have a backend logout endpoint using token revocation:
  // api('/auth/logout', { method: 'POST' }).catch(()=>{});
}

/**
 * Guard for pages that require auth: redirects to /pages/login.html if not logged in.
 */
export function requireAuth(){
  const u = currentUser();
  if(!u){
    window.location.href = '/pages/login.html';
    return null;
  }
  return u;
}

// ---------- Catalogue / Bidding (all DB-backed) ----------
export async function searchCatalogue(q=''){
  const data = await api('/catalogue/search?q='+encodeURIComponent(q));
  // Expect { items: [...] }
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getItem(id){
  if(!id) throw new Error('Missing item id.');
  return api('/catalogue/items/' + encodeURIComponent(id));
}

export async function bidForward(itemId, amount){
  const u = requireAuth();
  if(!u) throw new Error('Sign in required.');
  return api('/bidding/forward', {
    method: 'POST',
    body: JSON.stringify({ itemId, amount })
  });
}

export async function buyNowDutch(itemId){
  const u = requireAuth();
  if(!u) throw new Error('Sign in required.');
  return api('/buy/dutch', {
    method: 'POST',
    body: JSON.stringify({ itemId })
  });
}

// ---------- Health / Diagnostics ----------
export async function apiHealth(){
  // Goes through Nginx → mid-tier → returns "OK"
  return api('/health', { method: 'GET' });
}

// ---------- UI helpers ----------
export function formatCurrency(n){
  return new Intl.NumberFormat(undefined, { style:'currency', currency:'USD' }).format(n);
}
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
    if(a.getAttribute('href')?.endsWith(here)) a.classList.add('active');
  });
}

// ---------- Example wiring (optional)
// On your login form page, call:
//   login(usernameInput.value.trim(), passwordInput.value)
//     .then(()=> location.href = '/index.html')
//     .catch(e => toast(e.message));
