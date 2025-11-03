// ============================
// NOVA unified app.js (RELATIVE MODE)
// ============================

// Use RELATIVE asset root (matches yesterday's working setup)
const ASSET_ROOT = 'assets';             // <-- no leading slash
const NOCACHE    = `?v=${Date.now()}`;

// tiny utils
const qs  = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => [...r.querySelectorAll(s)];
const setLS = (k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
const getLS = (k,d=null)=>{ try{ const v = localStorage.getItem(k); return v?JSON.parse(v):d; }catch(_){ return d; } };

// JSON loader (relative)
async function loadJSON(fileName){
  const url = `${ASSET_ROOT}/data/${fileName}${NOCACHE}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// safe string (avoid printing native functions like String.prototype.sub)
const str = x => (typeof x === 'string' ? x : '');

// normalizers (tolerant to schema drift)
function normCategory(c){
  const name =
    str(c.name) || str(c.title) || str(c.label) || str(c.category) || str(c.Category) || str(c.cat) || 'Unnamed';
  const subtitle =
    str(c.subtitle) || str(c.sub) || str(c.description) || str(c.desc) || '';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id: String(idRaw), name, subtitle };
}
function normTrait(t){
  const id = String(t.id ?? t.key ?? t.slug ?? t.label ?? t.name ?? 'trait');
  const label = str(t.label) || str(t.name) || str(t.title) || 'Trait';
  const categoryId = String(t.categoryId ?? t.category ?? '');
  return { id, label, categoryId };
}
function normRole(r){
  const id    = String(r.id ?? r.key ?? r.slug ?? r.title ?? r.name ?? 'role');
  const title = str(r.title) || str(r.name) || 'Role';
  const outlook = str(r.outlook) || str(r.prospect) || '—';
  const salary  = str(r.salary)  || str(r.pay) || str(r.comp) || '—';
  const whyFit  = str(r.whyFit)  || str(r.reason) || '';
  const traitIds = (r.traitIds ?? r.traits ?? []).map(String);
  return { id, title, outlook, salary, whyFit, traitIds };
}

// Welcome
function initWelcome(){
  const start = qsa('[data-next="categories"], a[href="categories.html"]')[0];
  if (start) start.addEventListener('click', (e)=>{ e.preventDefault(); location.href = 'categories.html'; });
}

// Categories
async function initCategories(){
  const grid = qs('#categoryGrid') || qs('.container');
  if (!grid) return console.error('Missing #categoryGrid');

  const selCountEl  = qs('#selCount');
  const continueBtn = qs('#continueBtn');
  const resetLink   = qs('#resetLink');

  let raw;
  try {
    raw = await loadJSON('categories.json');
    if (!Array.isArray(raw)) throw new Error('categories.json is not an array');
  } catch (err) {
    console.error('categories.json load error:', err);
    grid.insertAdjacentHTML('afterbegin',
      `<div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:12px;color:#856404;margin-bottom:12px">
        Couldn’t load <code>assets/data/categories.json</code> (${err.message}). Using a small built-in list so you can proceed.
       </div>`);
    raw = [
      { id:'lead',  name:'Leadership', subtitle:'Guiding people & outcomes' },
      { id:'build', name:'Builder',    subtitle:'Make, fix, ship' },
      { id:'care',  name:'Care',       subtitle:'Serve, support, heal' },
      { id:'teach', name:'Teaching',   subtitle:'Explain & coach' },
      { id:'create',name:'Creative',   subtitle:'Design & imagine' }
    ];
  }

  const cats = raw.map(normCategory);

  const selected = new Set((getLS('nova.selectedCategoryIds', []) || []).map(String));
  const updateUI = () => {
    if (selCountEl) selCountEl.textContent = String(selected.size);
    if (continueBtn) continueBtn.disabled = !(selected.size >= 1 && selected.size <= 2);
  };

  grid.innerHTML = '';
  cats.forEach(cat => {
    const el = document.createElement('button');
    el.className = 'cat-pill';
    if (selected.has(cat.id)) el.classList.add('selected');
    el.innerHTML = `<strong>${cat.name}</strong><small>${cat.subtitle}</small>`;
    el.addEventListener('click', ()=>{
      if (selected.has(cat.id)) selected.delete(cat.id);
      else { if (selected.size >= 2) return; selected.add(cat.id); }
      setLS('nova.selectedCategoryIds', [...selected]);
      el.classList.toggle('selected');
      updateUI();
    });
    grid.appendChild(el);
  });

  updateUI();

  if (continueBtn) continueBtn.addEventListener('click', ()=>{
    if (!selected.size) return;
    location.href = 'traits.html';
  });

  if (resetLink) resetLink.addEventListener('click',(e)=>{
    e.preventDefault();
    localStorage.removeItem('nova.selectedCategoryIds');
    location.reload();
  });
}

// Traits
async function initTraits(){
  const selectedCatIds = (getLS('nova.selectedCategoryIds', []) || []).map(String);
  if (!selectedCatIds.length) return (location.href = 'categories.html');

  let raw;
  try {
    raw = await loadJSON('traits_with_categories.json');
    if (!Array.isArray(raw)) throw new Error('traits_with_categories.json must be an array');
  } catch (err) {
    console.error('traits_with_categories.json load error:', err);
    const host = qs('#traitsGrid') || document.body;
    host.insertAdjacentHTML('afterbegin',
      `<div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:12px;color:#856404;margin-bottom:12px">
        Couldn’t load traits data. (${err.message})
       </div>`);
    return;
  }

  const traitsAll = raw.map(normTrait);
  const traits = traitsAll.filter(t => selectedCatIds.includes(t.categoryId));

  const grid = qs('#traitsGrid');
  if (!grid) return console.error('Missing #traitsGrid');

  grid.innerHTML = '';
  traits.forEach(tr => {
    const node = document.createElement('label');
    node.className = 'trait-chip';
    node.innerHTML = `<input type="checkbox" value="${tr.id}" /> <span>${tr.label}</span>`;
    grid.appendChild(node);
  });

  const nextBtn = qsa('[data-next="roles"]')[0] || qs('#toRoles');
  if (nextBtn) nextBtn.addEventListener('click', ()=>{
    const chosen = qsa('input[type="checkbox"]', grid).filter(i=>i.checked).map(i=>i.value);
    setLS('nova.selectedTraitIds', chosen);
    location.href = 'roles.html';
  });
}

// Roles
async function initRoles(){
  const pickedTraits = new Set((getLS('nova.selectedTraitIds', []) || []).map(String));

  let raw;
  try {
    raw = await loadJSON('roles_400.json');
    if (!Array.isArray(raw)) throw new Error('roles_400.json must be an array');
  } catch (err) {
    console.error('roles_400.json load error:', err);
    const host = qs('#rolesGrid') || document.body;
    host.insertAdjacentHTML('afterbegin',
      `<div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;padding:12px;color:#856404;margin-bottom:12px">
        Couldn’t load roles data. (${err.message})
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
      <div class="role-title">${role.title}</div>
      <div class="role-meta">
        <span class="badge">Outlook: ${role.outlook}</span>
        <span class="badge">Salary: ${role.salary}</span>
      </div>
      <p class="role-why">${role.why || role.whyFit || ''}</p>
      <button class="btn btn-primary" data-role="${role.id}">Select</button>
    `;
    card.querySelector('button').addEventListener('click', ()=>{
      setLS('nova.selectedRoleId', role.id);
      location.href = 'reveal.html';
    });
    grid.appendChild(card);
  });
}

// Reveal / Invest
function initReveal(){
  const toInvest = qsa('[data-next="invest"]')[0] || qs('#toInvest');
  if (toInvest) toInvest.addEventListener('click', ()=> (location.href = 'invest.html'));
}
function initInvest(){ /* reserved for Payhip/save+return hooks */ }

// Simple Router
document.addEventListener('DOMContentLoaded', ()=>{
  const p = (location.pathname || '').toLowerCase();
  const ends = (name)=> p.endsWith(`/${name}`) || p.endsWith(`/${name}.html`);
  if (ends('index') || p.endsWith('/') || p === '') return initWelcome();
  if (ends('categories')) return initCategories();
  if (ends('traits')) return initTraits();
  if (ends('roles')) return initRoles();
  if (ends('reveal')) return initReveal();
  if (ends('invest')) return initInvest();
  initWelcome();
});

// legacy shim for older pages
window.renderCategories = initCategories;
