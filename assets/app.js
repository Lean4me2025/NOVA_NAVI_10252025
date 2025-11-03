// ============================
// NOVA unified app.js (master-key loader)
// ============================

// Bust caches after deploys
const CACHE_BUST = `?v=${Date.now()}`;

// --- Discover where app.js actually came from (for smarter path probing)
const APP_SCRIPT_URL =
  document.currentScript?.src ||
  document.querySelector('script[src$="app.js"]')?.src ||
  null;

const DERIVED_ASSET_ROOT = APP_SCRIPT_URL ? APP_SCRIPT_URL.replace(/\/app\.js.*$/, '') : null;
// expose for console diagnostics
window.__ASSET_ROOT__ = DERIVED_ASSET_ROOT || '(not-derived)';

// Candidate asset roots to try, in order (acts like a "master key")
function candidateRoots() {
  const r = [];
  if (DERIVED_ASSET_ROOT) r.push(DERIVED_ASSET_ROOT); // e.g. https://site/assets
  r.push('assets');        // relative mode (yesterday’s working mode)
  r.push('./assets');      // explicit relative
  r.push('/assets');       // absolute/public mode
  r.push('public/assets'); // some builds
  r.push('.');             // page-local fallback
  return r;
}

// Probe a URL and confirm it returns JSON
async function tryFetch(url) {
  try {
    const res = await fetch(url + CACHE_BUST, { cache: 'no-store' });
    if (!res.ok) return { ok:false, status:res.status, url, text: await res.text().catch(()=> '') };
    const txt = await res.text();
    try {
      const json = JSON.parse(txt);
      return { ok:true, url, data:json };
    } catch {
      return { ok:false, status:200, url, text:txt.slice(0,800) }; // HTML served instead of JSON
    }
  } catch (err) {
    return { ok:false, status:'network-error', url, error:String(err) };
  }
}

// Master-key JSON loader: tries multiple sensible roots and returns first valid JSON
async function loadJSON(fileName) {
  const roots = candidateRoots();
  const tried = [];

  for (const root of roots) {
    const base = String(root).replace(/\/+$/,'');
    const candidates = [
      `${base}/data/${fileName}`,
      `${base}/${fileName}`,
      `${base}/assets/data/${fileName}`, // defensive
    ];
    for (const u of candidates) {
      const r = await tryFetch(u);
      tried.push(r);
      if (r.ok) {
        console.log(`[loadJSON] OK: ${fileName} ← ${r.url}`);
        return r.data;
      } else {
        console.warn(`[loadJSON] miss: ${fileName} @ ${u} ->`, r.status);
      }
    }
  }

  // last-ditch page-local
  const last = await tryFetch(`data/${fileName}`);
  tried.push(last);
  if (last.ok) {
    console.log(`[loadJSON] OK (fallback): ${fileName} ← ${last.url}`);
    return last.data;
  }

  // On-screen helper + minimal fallback so UI continues
  const host = document.querySelector('#categoryGrid') || document.body;
  const details = tried.map(t => `${t.url} → ${t.ok ? '200 JSON' : ('fail: ' + (t.status||t.error))}`).join('\n');
  try {
    host.insertAdjacentHTML('afterbegin',
      `<div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:12px;color:#856404;margin:12px">
         Couldn’t load <code>${fileName}</code> from expected paths. Tried:
         <pre style="white-space:pre-wrap;margin:8px 0 0">${details}</pre>
         Using a tiny built-in list so you can continue.
       </div>`);
  } catch {}
  if (/categories/i.test(fileName)) {
    return [
      { id:'lead',  name:'Leadership', subtitle:'Guide people & outcomes' },
      { id:'build', name:'Builder',    subtitle:'Make, fix, ship' },
      { id:'care',  name:'Care',       subtitle:'Serve & support' },
      { id:'teach', name:'Teaching',   subtitle:'Explain & coach' },
      { id:'create',name:'Creative',   subtitle:'Design & imagine' }
    ];
  }
  return [];
}

// ---------- helpers ----------
const qs  = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => [...r.querySelectorAll(s)];
const setLS = (k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const getLS = (k,d=null)=>{ try{ const v = localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } };
const S = x => (typeof x === 'string' ? x : '');

// Normalize incoming shapes (tolerant to schema drift)
function normCategory(c){
  const name = S(c.name)||S(c.title)||S(c.label)||S(c.category)||S(c.Category)||S(c.cat)||'Unnamed';
  const subtitle = S(c.subtitle)||S(c.sub)||S(c.description)||S(c.desc)||'';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id:String(idRaw), name, subtitle };
}
function normTrait(t){
  const id = String(t.id ?? t.key ?? t.slug ?? t.label ?? t.name ?? 'trait');
  const label = S(t.label)||S(t.name)||S(t.title)||'Trait';
  const categoryId = String(t.categoryId ?? t.category ?? t.cat ?? '');
  return { id, label, categoryId };
}
function normRole(r){
  const id = String(r.id ?? r.key ?? r.slug ?? r.title ?? r.name ?? 'role');
  const title = S(r.title)||S(r.name)||'Role';
  const outlook = S(r.outlook)||S(r.prospect)||'—';
  const salary  = S(r.salary)||S(r.pay)||S(r.comp)||'—';
  const whyFit  = S(r.whyFit)||S(r.reason)||S(r.why)||'';
  const traitIds = (r.traitIds ?? r.traits ?? []).map(String);
  return { id, title, outlook, salary, whyFit, traitIds };
}

// ---------- pages ----------

// Welcome
function initWelcome(){
  const start = qsa('[data-next="categories"], a[href="categories.html"]')[0];
  if (start) start.addEventListener('click', e => { e.preventDefault(); location.href='categories.html'; });
}

// Categories
async function initCategories(){
  const grid = qs('#categoryGrid') || qs('.container') || document.body;
  if (!grid) { console.error('Missing #categoryGrid'); return; }

  // UI bits if present
  const selCountEl  = qs('#selCount');
  const continueBtn = qs('#continueBtn') || qsa('.actions .btn')[0];
  const resetLink   = qs('#resetLink') || qsa('.actions a[href="#reset"]')[0];

  let raw;
  try {
    raw = await loadJSON('categories.json');
    if (!Array.isArray(raw)) throw new Error('categories.json must be an array');
  } catch (e) {
    console.error('categories.json load error:', e);
    raw = [];
  }

  const cats = raw.map(normCategory);
  const selected = new Set((getLS('nova.selectedCategoryIds', []) || []).map(String));

  // Clear and render
  grid.innerHTML = '';
  cats.forEach(cat => {
    const el = document.createElement('button');
    el.className = 'cat-pill';
    if (selected.has(cat.id)) el.classList.add('selected');
    el.innerHTML = `<strong>${S(cat.name)}</strong><small>${S(cat.subtitle)}</small>`;
    el.addEventListener('click', ()=>{
      if (selected.has(cat.id)) selected.delete(cat.id);
      else { if (selected.size >= 2) return; selected.add(cat.id); }
      setLS('nova.selectedCategoryIds', [...selected]);
      el.classList.toggle('selected');
      updateUI();
    });
    grid.appendChild(el);
  });

  function updateUI(){
    if (selCountEl) selCountEl.textContent = String(selected.size);
    if (continueBtn) continueBtn.disabled = !(selected.size >= 1 && selected.size <= 2);
  }
  updateUI();

  if (continueBtn) continueBtn.addEventListener('click', ()=>{
    if (!(selected.size >= 1 && selected.size <= 2)) return;
    location.href='traits.html';
  });
  if (resetLink) resetLink.addEventListener('click', (e)=>{ e.preventDefault(); localStorage.removeItem('nova.selectedCategoryIds'); location.reload(); });
}

// Traits
async function initTraits(){
  const selectedCatIds = (getLS('nova.selectedCategoryIds', []) || []).map(String);
  if (!selectedCatIds.length) return (location.href='categories.html');

  let raw;
  try {
    raw = await loadJSON('traits_with_categories.json');
    if (!Array.isArray(raw)) throw new Error('traits_with_categories.json must be an array');
  } catch (e) {
    console.error('traits_with_categories.json load error:', e);
    const host = qs('#traitsGrid') || document.body;
    host.insertAdjacentHTML('afterbegin',
      `<div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:12px;color:#856404;margin:12px">
         Couldn’t load traits data. (${e.message})
       </div>`);
    return;
  }

  const traits = raw.map(normTrait).filter(t => selectedCatIds.includes(t.categoryId));
  const grid = qs('#traitsGrid');
  if (!grid) return console.error('Missing #traitsGrid');

  grid.innerHTML = '';
  traits.forEach(tr => {
    const node = document.createElement('label');
    node.className = 'trait-chip';
    node.innerHTML = `<input type="checkbox" value="${tr.id}"> <span>${S(tr.label)}</span>`;
    grid.appendChild(node);
  });

  const nextBtn = qsa('[data-next="roles"]')[0] || qs('#toRoles');
  if (nextBtn) nextBtn.addEventListener('click', ()=>{
    const chosen = qsa('input[type="checkbox"]', grid).filter(i=>i.checked).map(i=>i.value);
    setLS('nova.selectedTraitIds', chosen);
    location.href='roles.html';
  });
}

// Roles
async function initRoles(){
  const pickedTraits = new Set((getLS('nova.selectedTraitIds', []) || []).map(String));
  let raw;
  try {
    raw = await loadJSON('roles_400.json');
    if (!Array.isArray(raw)) throw new Error('roles_400.json must be an array');
  } catch (e) {
    console.error('roles_400.json load error:', e);
    const host = qs('#rolesGrid') || document.body;
    host.insertAdjacentHTML('afterbegin',
      `<div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:12px;color:#856404;margin:12px">
         Couldn’t load roles data. (${e.message})
       </div>`);
    return;
  }

  const roles = raw.map(normRole);
  const scored = roles
    .map(r => ({ ...r, score: r.traitIds.filter(id => pickedTraits.has(id)).length }))
    .sort((a,b) => b.score - a.score);

  const grid = qs('#rolesGrid');
  if (!grid) return console.error('Missing #rolesGrid');
  grid.innerHTML = '';

  scored.slice(0, 12).forEach(role => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.innerHTML = `
      <div class="role-title">${S(role.title)}</div>
      <div class="role-meta">
        <span class="badge">Outlook: ${S(role.outlook)}</span>
        <span class="badge">Salary: ${S(role.salary)}</span>
      </div>
      <p class="role-why">${S(role.whyFit)}</p>
      <button class="btn btn-primary" data-role="${role.id}">Select</button>
    `;
    card.querySelector('button').addEventListener('click', ()=>{
      setLS('nova.selectedRoleId', role.id);
      location.href='reveal.html';
    });
    grid.appendChild(card);
  });
}

// Reveal / Invest (placeholders for your hooks)
function initReveal(){
  const toInvest = qsa('[data-next="invest"]')[0] || qs('#toInvest');
  if (toInvest) toInvest.addEventListener('click', ()=> (location.href='invest.html'));
}
function initInvest(){ /* Payhip hooks / save+return go here */ }

// ---------- tiny router ----------
document.addEventListener('DOMContentLoaded', ()=>{
  const p = (location.pathname || '').toLowerCase();
  const ends = (name)=> p.endsWith(`/${name}`) || p.endsWith(`/${name}.html`);
  if (ends('index') || p.endsWith('/') || p === '') return initWelcome();
  if (ends('categories')) return initCategories();
  if (ends('traits')) return initTraits();
  if (ends('roles')) return initRoles
