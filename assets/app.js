// ===== NOVA unified app.js (full pipeline, with REVEAL) =====
const CACHE_BUST = `?v=${Date.now()}`;

// --------- helpers ----------
const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => [...r.querySelectorAll(s)];
const setLS = (k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const getLS = (k,d=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } };

async function loadJSON(name){
  const url = `/assets/data/${name}${CACHE_BUST}`;
  const res = await fetch(url, { cache:'no-store' });
  if(!res.ok) throw new Error(`HTTP ${res.status} loading ${name}`);
  return res.json();
}

// ======================================
// Step 1 — Categories
// ======================================
async function renderCategories(){
  const grid = qs('#categoryGrid');
  if(!grid) return;
  grid.innerHTML = '';
  let cats;
  try{
    cats = await loadJSON('categories.json');
  }catch(err){
    grid.innerHTML = `<p style="color:red;">Failed to load categories.json<br>${err.message}</p>`;
    return;
  }
  if(!Array.isArray(cats) || cats.length===0){
    grid.innerHTML = `<p style="color:red;">No categories found.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  cats.forEach(name=>{
    const a = document.createElement('a');
    a.href='#';
    a.className='cat-pill';
    a.textContent = name;
    a.addEventListener('click',e=>{
      e.preventDefault();
      a.classList.toggle('selected');
      updateCategorySelectionUI();
    });
    frag.appendChild(a);
  });
  grid.appendChild(frag);
  updateCategorySelectionUI();
}

function updateCategorySelectionUI(){
  const limit=2;
  const pills = qsa('.cat-pill');
  const selected = pills.filter(p=>p.classList.contains('selected'));
  const chosen = selected.map(p=>p.textContent.trim());
  setLS('selectedCategories', chosen);

  const bar = qs('.bar');
  if(bar) bar.textContent = `Selected: ${chosen.length} / ${limit}`;

  const btn = qs('#continueBtn');
  if(btn){
    btn.disabled = !(chosen.length>=1 && chosen.length<=limit);
    btn.onclick = (e)=>{
      e.preventDefault();
      if(!btn.disabled) location.href='traits.html';
    };
  }
}

async function initCategories(){
  await renderCategories();
  const fallbackBtn = qs('#continueBtn');
  if(!fallbackBtn){
    const actions = qs('.actions');
    if(actions){
      const b=document.createElement('button');
      b.id='continueBtn'; b.className='btn'; b.textContent='Continue →';
      b.disabled=true; actions.appendChild(b);
      updateCategorySelectionUI();
    }
  }
}

// ======================================
// Step 2 — Traits
// ======================================
async function initTraits(){
  const grid = qs('#traitGrid');
  if(!grid){ console.warn('No #traitGrid on this page'); return; }

  const cats = getLS('selectedCategories', []);
  qs('#focusCats') && (qs('#focusCats').textContent = cats.join(', ') || '—');

  if(!cats.length){
    grid.innerHTML = `<p style="color:red;">No categories selected. <a href="categories.html">Go back</a>.</p>`;
    return;
  }

  let data;
  try{
    data = await loadJSON('traits_with_categories.json');
  }catch(err){
    grid.innerHTML = `<p style="color:red;">Failed to load traits data.<br>${err.message}</p>`;
    return;
  }

  const traits = (Array.isArray(data)?data:[])
    .filter(t => Array.isArray(t.categories) && t.categories.some(c => cats.includes(c)));

  if(traits.length===0){
    grid.innerHTML = `<p>No traits found for ${cats.join(', ')}.</p>`;
    return;
  }

  const selected = new Set(getLS('selectedTraits', []));
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  traits.forEach(t=>{
    const div = document.createElement('a');
    div.href='#';
    div.className='trait-pill';
    div.textContent = t.name || 'Unnamed';
    if(selected.has(t.name)) div.classList.add('selected');
    div.addEventListener('click', e=>{
      e.preventDefault();
      if(div.classList.toggle('selected')) selected.add(t.name);
      else selected.delete(t.name);
      updateTraitsUI(selected);
    });
    frag.appendChild(div);
  });
  grid.appendChild(frag);
  updateTraitsUI(selected);
}

function updateTraitsUI(selectedSet){
  const min = 5;
  const count = selectedSet.size;
  setLS('selectedTraits', [...selectedSet]);
  qs('#traitCount') && (qs('#traitCount').textContent = String(count));

  const btn = qs('#toRolesBtn');
  if(btn){
    btn.disabled = count < min;
    btn.onclick = (e)=>{
      e.preventDefault();
      if(!btn.disabled) location.href='roles.html';
    };
  }
  const reset = qs('#resetTraits');
  if(reset){
    reset.onclick = (e)=>{
      e.preventDefault();
      setLS('selectedTraits', []);
      qsa('.trait-pill').forEach(el => el.classList.remove('selected'));
      updateTraitsUI(new Set());
    };
  }
}

// ======================================
// Step 3 — Roles
// ======================================
async function initRoles(){
  const grid = qs('#rolesGrid');
  if(!grid){ console.warn('No #rolesGrid'); return; }

  const cats = getLS('selectedCategories', []);
  const traits = getLS('selectedTraits', []);
  qs('#focusCats2') && (qs('#focusCats2').textContent = cats.join(', ') || '—');
  qs('#focusTraits') && (qs('#focusTraits').textContent = traits.slice(0,8).join(', ') || '—');

  let roles;
  try{
    roles = await loadJSON('roles_400.json');
  }catch(err){
    grid.innerHTML = `<p style="color:red;">Failed to load roles_400.json<br>${err.message}</p>`;
    return;
  }

  const list = Array.isArray(roles) ? roles : [];
  const lc = s => String(s||'').toLowerCase();

  const matches = list.filter(r=>{
    const rTraits = Array.isArray(r.traits) ? r.traits.map(lc) : [];
    const rCats = Array.isArray(r.categories) ? r.categories.map(lc)
                 : (r.category ? [lc(r.category)] : []);
    const hasTrait = traits.some(t => rTraits.includes(lc(t)));
    const hasCat   = cats.some(c => rCats.includes(lc(c)));
    return hasTrait || hasCat;
  }).slice(0, 24);

  if(matches.length===0){
    grid.innerHTML = `<p>No roles matched yet. Try selecting different traits or categories.</p>`;
  }else{
    const frag = document.createDocumentFragment();
    matches.forEach(r=>{
      const card = document.createElement('div');
      card.className = 'card';
      const title = r.title || r.name || 'Role';
      const summary = r.summary || r.description || '';
      const outlook = r.outlook || r.growth || '';
      const pay = r.salary || r.pay || '';

      card.innerHTML = `
        <strong>${title}</strong>
        ${summary ? `<p>${summary}</p>`:''}
        <div class="badges">
          ${outlook ? `<span class="badge">Outlook: ${outlook}</span>`:''}
          ${pay ? `<span class="badge">Pay: ${pay}</span>`:''}
        </div>
      `;
      frag.appendChild(card);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  const toReveal = qs('#toReflectionBtn') || qs('#toRevealBtn');
  if(toReveal){
    toReveal.onclick = (e)=>{
      e.preventDefault();
      location.href='reveal.html';
    };
  }
}

// ======================================
// Step 4 — Reveal  (your naming)
// ======================================
function initReveal(){
  const box = qs('#revealBox');
  if(!box) return;
  const cats = getLS('selectedCategories', []);
  const traits = getLS('selectedTraits', []);
  box.innerHTML = `
    <p><strong>Your focus:</strong> ${cats.join(', ') || '—'}</p>
    <p><strong>Your traits:</strong> ${traits.join(', ') || '—'}</p>
    <p>Take a moment to reflect on how these align with the roles you’re drawn to.</p>
  `;
  const btn = qs('#toInvestBtn');
  if(btn){
    btn.onclick = (e)=>{ e.preventDefault(); location.href='invest.html'; };
  }
}

// ======================================
// Step 5 — Invest
// ======================================
function initInvest(){
  const box = qs('#investBox');
  if(!box) return;
  box.innerHTML = `
    <p>Ready to invest in your next step? (Payhip embed or purchase options go here.)</p>
    <p>We recommend saving your results and booking your Pro toolkit when you’re ready.</p>
  `;
}

// -------- simple router --------
document.addEventListener('DOMContentLoaded', ()=>{
  const p = location.pathname.toLowerCase();
  if(p.includes('categories')) return initCategories();
  if(p.includes('traits'))     return initTraits();
  if(p.includes('roles'))      return initRoles();
  if(p.includes('reveal'))     return initReveal();
  if(p.includes('invest'))     return initInvest();

  // If flat preview without a route, show categories
  try{ renderCategories(); }catch{}
});

// Expose for console/manual retries
window.renderCategories = renderCategories;
window.renderTraits     = initTraits;
