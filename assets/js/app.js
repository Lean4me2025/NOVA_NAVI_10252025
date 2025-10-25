// Shared helpers + simple state
const DEBUG = true;
export const log = (...a) => DEBUG && console.debug('[NOVA]', ...a);

export async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${path}`);
  return res.json();
}

export const state = {
  get categories() { return JSON.parse(sessionStorage.getItem('categories')||'[]'); },
  set categories(v){ sessionStorage.setItem('categories', JSON.stringify(v||[])); },
  get traits()     { return JSON.parse(sessionStorage.getItem('traits')||'[]'); },
  set traits(v)    { sessionStorage.setItem('traits', JSON.stringify(v||[])); },
  saveIdentity(email, pin){ localStorage.setItem('identity', JSON.stringify({email, pin})); },
  get identity(){ try{return JSON.parse(localStorage.getItem('identity')||'null')}catch{return null} }
};

// tiny DOM helpers
export const $  = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

// selection helper
export function toggleSelect(el, set, max){
  const id = el.dataset.id;
  const i  = set.indexOf(id);
  if (i>=0){ set.splice(i,1); el.classList.remove('selected'); }
  else{
    if (set.length>=max) return; // hard cap
    set.push(id); el.classList.add('selected');
  }
  return set;
}
