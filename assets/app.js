// ===== NOVA unified app.js (final, stable) =====

// Cache-bust for fresh JSON after deploys
const CACHE_BUST = `?v=${Date.now()}`;

// ---------- Tiny helpers ----------
const qs  = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => [...r.querySelectorAll(s)];
const getFirst = (ids) => ids.map(id => typeof id==='string'? id : id.id)
                             .map(sel => typeof sel==='string' && sel.startsWith('#')? sel : `#${sel}`)
                             .map(sel => qs(sel)).find(Boolean);

const setLS = (k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const getLS = (k,d=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } };

// Normalize category objects/strings → {id, name, subtitle}
function normalizeCategory(c, idx){
  if (typeof c === 'string') return { id:String(idx+1), name:c, subtitle:'' };
  const name = c.name ?? c.title ?? c.label ?? c.category ?? c.Category ?? `Item ${idx+1}`;
  const subtitle = c.subtitle ?? c.sub ?? c.description ?? c.desc ?? '';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id:String(idRaw), name:String(name), subtitle:String(subtitle) };
}

// Robust loader (always from site root /assets/data)
async function loadJSON(filename){
  const url = `/assets/data/${filename}${CACHE_BUST}`;
  const res = await fetch(url, { cache:'no-store' });
  if(!res.ok) throw new Error(`HTTP ${res.status} loading ${filename}`);
  return res.json();
}

// ---------- Categories ----------
async function renderCategories(){
  const grid = getFirst(['categoryGrid']);
  if(!grid) return;

  grid.innerHTML = '';
  let raw;
  try { raw = await loadJSON('categories.json'); }
  catch(err){
    grid.innerHTML = `<p style="color:#b00020">Could not load categories.json<br>${err.message}</p>`;
    console.error('[categories] load error:', err);
    return;
  }
  if(!Array.isArray(raw) || !raw.length){
    grid.innerHTML = `<p style="color:#b00020">No categories found.</p>`;
    return;
  }

  const cats = raw.map((c,i)=>normalizeCategory(c,i));
  const frag = document.createDocumentFragment();

  cats.forEach(cat=>{
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'cat-pill';
    a.dataset.id = cat.name || cat.id;     // use human name as key where possible
    a.innerHTML = `<strong>${cat.name ?? 'Unnamed'}</strong>${cat.subtitle?`<small>${cat.subtitle}</small>`:''}`;
    a.addEventListener('click',e=>{
      e.preventDefault();
      a.classList.toggle('selected');
      updateCategorySelectionUI();
    });
    frag.appendChild(a);
  });

  grid.appendChild(frag);

  // Restore saved selection
  const saved = getLS('selectedCategories', []);
  if (Array.isArray(saved) && saved.length){
    qsa('.cat-pill').forEach(el => { if (saved.includes(el.dataset.id)) el.classList.add('selected'); });
  }
  updateCategorySelectionUI();
}

function updateCategorySelectionUI(){
  const limit = 2;
  const pills = qsa('.cat-pill');
  const selected = pills.filter(p=>p.classList.contains('selected'));
  const ids = selected.map(p=>p.dataset.id);
  setLS('selectedCategories', ids);

  // selected counter if a .bar exists
  const bar = qs('.bar');
  let counter = qs('#selCount');
  if (bar && !counter){
    counter = document.createElement('span');
    counter.id = 'selCount';
    bar.appendChild(counter);
  }
  if (counter) counter.textContent = `Selected: ${ids.length} / ${limit}`;

  // visual limit
  if (selected.length > limit){
    pills.forEach(p=>{ if(!p.classList.contains('selected')) p.classList.add('disabled'); });
  } else {
    pills.forEach(p=>p.classList.remove('disabled'));
  }

  // Continue button
  const btn = getFirst(['continueBtn','continueCategoriesBtn']);
  if (btn){
    btn.disabled = !(selected.length >=1 && selected.length <= limit);
    btn.onclick = (e)=>{ e.preventDefault(); if(!btn.disabled) location.href='traits.html'; };
  }

  // Reset
  const reset = getFirst(['resetLink','resetCategoriesLink']);
  if (reset){
    reset.onclick = (e)=>{
      e.preventDefault();
      pills.forEach(p=>p.classList.remove('selected','disabled'));
      updateCategorySelectionUI();
    };
  }
}

async function initCategories(){
  if(!getFirst(['categoryGrid'])){ console.warn('[categories] mount not found'); return; }
  await renderCategories();
}

// ---------- Traits ----------
const GENERIC_TRAITS = [
  "Analytical Thinker","Creative Problem-Solver","Systems Thinker","Decision Maker",
  "Clear Communicator","User-Focused","Process-Improver","Results-Driven",
  "Growth Mindset","Curious","Organized","Self-Starter","Comfort with Ambiguity",
  "Collaborative","Strategic","Detail-Oriented","Ethical","Learner","Resilient","Dependable"
];
const uniq = arr => [...new Set((arr||[]).filter(Boolean))];

// Normalizes traits_with_categories.json whether it's:
//  A) array of objects: [{ name, categories:[...] }, ...]  OR
//  B) object keyed by category: { "Technology":["A","B"], ... }  OR
//  C) array of maps: [{category:"Tech", traits:[...]}, ...]
async function loadTraitsByCategories(selectedCats=[]){
  const raw = await loadJSON('traits_with_categories.json');
  const catsLower = selectedCats.map(c=>String(c).toLowerCase());

  // Case A
  if (Array.isArray(raw) && raw.length && raw[0] && ('categories' in raw[0] || 'category' in raw[0] || 'traits' in raw[0])){
    const hits = [];
    raw.forEach(row=>{
      const rowCats = (row.categories ?? [row.category]).filter(Boolean).map(x=>String(x).toLowerCase());
      const overlaps = rowCats.some(rc=>catsLower.includes(rc));
      if (overlaps){
        if (Array.isArray(row.traits)) hits.push(...row.traits);
        if (row.name) hits.push(row.name);
      }
    });
    return uniq([...GENERIC_TRAITS, ...hits]);
  }

  // Case B (object map)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)){
    const hits = [];
    selectedCats.forEach(cat=>{
      const direct = raw[cat];
      const lo = raw[String(cat).toLowerCase()];
      const up = raw[String(cat).toUpperCase()];
      const list = Array.isArray(direct)? direct : Array.isArray(lo)? lo : Array.isArray(up)? up : null;
      if (list) hits.push(...list);
    });
    return uniq([...GENERIC_TRAITS, ...hits]);
  }

  // Fallback
  return [...GENERIC_TRAITS];
}

function updateTraitsSelectionUI(){
  const pills = qsa('.trait-pill');
  const selected = pills.filter(p=>p.classList.contains('selected'));
  setLS('selectedTraits', selected.map(p=>p.textContent));

  const countEl = qs('#traitCount'); if (countEl) countEl.textContent = String(selected.length);

  const btn = getFirst(['toRolesBtn','continueTraitsBtn','continueBtn']);
  if (btn){
    btn.disabled = selected.length < 5;
    btn.onclick = (e)=>{ e.preventDefault(); if(!btn.disabled) location.href='roles.html'; };
  }

  const reset = getFirst(['traitsReset','resetTraitsLink']);
  if (reset){
    reset.onclick = (e)=>{
      e.preventDefault();
      pills.forEach(p=>p.classList.remove('selected'));
      updateTraitsSelectionUI();
    };
  }
}

async function renderTraits(){
  const grid = getFirst(['traitsGrid','traitGrid']);
  if(!grid) return;

  grid.innerHTML = '';
  const selectedCats = getLS('selectedCategories',[]);
  const focusLine = qs('#focusLine'); if (focusLine) focusLine.textContent = (selectedCats||[]).join(', ') || '—';

  try{
    let traits = await loadTraitsByCategories(selectedCats);
    // Ensure a rich set
    const MIN = 18; if (traits.length < MIN){
      traits = uniq([...traits, ...GENERIC_TRAITS]).slice(0, Math.max(MIN, traits.length));
    }
    const frag = document.createDocumentFragment();
    traits.forEach(name=>{
      const a = document.createElement('a');
      a.href = '#'; a.className='trait-pill'; a.textContent = name;
      a.addEventListener('click', e=>{ e.preventDefault(); a.classList.toggle('selected'); updateTraitsSelectionUI(); });
      frag.appendChild(a);
    });
    grid.appendChild(frag);
    updateTraitsSelectionUI();
  }catch(err){
    grid.innerHTML = `<p style="color:#b00020">Error loading traits: ${err.message}</p>`;
    console.error('[traits] load/render error', err);
  }
}

async function initTraits(){
  if(!getFirst(['traitGrid','traitGrid'])){ console.warn('[traits] mount not found'); return; }
  await renderTraits();
}

// ---------- Roles ----------
async function initRoles(){
  const box = getFirst(['rolesBox','roleGrid']);
  if(!box) return;
  box.innerHTML = '<p>Loading roles...</p>';

  const traits = getLS('selectedTraits',[]) || [];

  let roles=[];
  try { roles = await loadJSON('roles_400.json'); } catch(e){ console.warn('roles load fail', e); }

  const pick = (roles||[]).filter(r=>{
    const hay = `${r.title||''} ${(r.tags||[]).join(' ')} ${(r.traits||[]).join(' ')}`.toLowerCase();
    return traits.some(t => hay.includes(String(t).toLowerCase().split(' ')[0])); // loose keyword match
  }).slice(0,8);

  if(!pick.length){
    box.innerHTML = `<p>No roles matched yet. Try selecting different traits or categories.</p>`;
  } else {
    box.innerHTML = pick.map(r=>`
      <div class="role-card">
        <h3>${r.title||'Role'}</h3>
        <p>${r.description||''}</p>
        <div class="badges">
          ${r.outlook? `<span class="badge">${r.outlook}</span>`:''}
          ${r.salary?  `<span class="badge">${r.salary}</span>`:''}
        </div>
      </div>
    `).join('');
  }

  const btn = getFirst(['toRevealBtn','continueRolesBtn','continueBtn']);
  if (btn) btn.onclick = (e)=>{ e.preventDefault(); location.href='reveal.html'; };
}

// ---------- Reveal ----------
function initReveal(){
  const cats = getLS('selectedCategories',[])||[];
  const trs  = getLS('selectedTraits',[])||[];
  const roles = getLS('topRoles',[])||[];

  const mapSet = (sel, val) => { const el = qs(sel); if (el) el.textContent = val; };

  mapSet('#revFocus',  cats.join(', ') || '—');
  mapSet('#revTraits', trs.join(', ')  || '—');

  const rolesUL = getFirst(['summaryRoles','roles','revRoles']);
  if (rolesUL){
    rolesUL.innerHTML = (roles.length? roles : []).map(r=>`<li>${r.title || r}</li>`).join('') || '<li>No top roles identified yet</li>';
  }

  const btn = getFirst(['toInvestBtn','continueRevealBtn','continueBtn']);
  if (btn) btn.onclick = (e)=>{ e.preventDefault(); location.href='invest.html'; };
}

// ---------- Invest ----------
function initInvest(){
  const cats = getLS('selectedCategories',[])||[];
  const trs  = getLS('selectedTraits',[])||[];

  const mapSet = (sel, val) => { const el = qs(sel); if (el) el.textContent = val; };
  // Support both your older and newer IDs
  mapSet('#invFocus',  cats.join(', ') || '—');
  mapSet('#invTraits', trs.join(', ')  || '—');
  mapSet('#sumFocus',  cats.join(', ') || '—');
  mapSet('#sumTraits', trs.join(', ')  || '—');

  // Download JSON
  const dl = getFirst(['dlJsonBtn','downloadBtn']);
  if (dl){
    dl.onclick = (e)=>{
      e.preventDefault();
      const payload = { categories: cats, traits: trs, savedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='nova_results.json'; a.click();
      URL.revokeObjectURL(url);
    };
  }

  // Email results (branded plaintext via mailto)
  const email = getFirst(['emailBtn']);
  if (email){
    email.onclick = (e)=>{
      e.preventDefault();
      const subject = encodeURIComponent('Your NOVA results: Focus, Traits & Next Steps');
      const body = encodeURIComponent([
        '✨ Your NOVA results',
        '----------------------------------------',
        `Focus: ${cats.join(', ') || '—'}`,
        `Traits: ${trs.join(', ') || '—'}`,
        '',
        'Next steps:',
        '• Save your results (JSON or PDF)',
        '• Choose a toolkit (Starter / Pro / Mastery)',
        '',
        'You’ve got this. — NOVA'
      ].join('\n'));
      location.href = `mailto:?subject=${subject}&body=${body}`;
    };
  }
}

// ---------- Router ----------
document.addEventListener('DOMContentLoaded', ()=>{
  const path = location.pathname.toLowerCase();

  if (path.includes('index'))      { return /* welcome page static for now */; }
  if (path.includes('categories')) { return initCategories(); }
  if (path.includes('traits'))     { return initTraits(); }
  if (path.includes('roles'))      { return initRoles(); }
  if (path.includes('reveal'))     { return initReveal(); }
  if (path.includes('invest'))     { return initInvest(); }

  // Fallback: if opened a root-less preview, try categories
  try { renderCategories(); } catch(e){ console.warn('[router] No page handler for', path); }

  // Expose a few for console checks
  window.renderCategories = renderCategories;
  window.renderTraits = renderTraits;
});
// ===== END =====
