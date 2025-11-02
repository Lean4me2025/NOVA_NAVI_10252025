/* NOVA App Core — v4
 * - Categories: multi-select (1–2), no auto-jump
 * - Traits: two-column tiles, enable Continue when >=5
 * - Roles: basic renderer kept; can be enhanced later
 * - Data: loads data/nova_data.json, merges data/roles_400.json if present
 */

const NOVA_STATE_KEY = 'nova_state_v1';

/* ---------- helpers ---------- */
const byId = id => document.getElementById(id);
const getQuery = key => (new URLSearchParams(location.search)).get(key) || null;

/* ---------- app ---------- */
const App = {
  data: null,
  state: {
    categoryIds: [],       // allow 1–2
    selectedTraits: [],    // require >=5 to continue
    notes: ''
  },

  load(){
    try{
      const raw = localStorage.getItem(NOVA_STATE_KEY);
      if (raw) this.state = Object.assign(this.state, JSON.parse(raw));
    }catch(e){ console.warn('[NOVA] state load failed', e); }
  },
  save(){
    try{ localStorage.setItem(NOVA_STATE_KEY, JSON.stringify(this.state)); }
    catch(e){ console.warn('[NOVA] state save failed', e); }
  },

  async init(){
    if (this.data) return;
    this.load();

    // 1) base data (categories + traits [+ optional small roles])
    let base = null;
    for (const url of ['data/nova_data.json','./data/nova_data.json','/data/nova_data.json']){
      try{
        const res = await fetch(url, {cache:'no-store'});
        if (!res.ok) throw new Error(res.status);
        base = await res.json();
        console.info('[NOVA] loaded base data:', url);
        break;
      }catch(e){ console.warn('[NOVA] base fail', url, e); }
    }
    if (!base) base = {categories:[], traits:[], roles:[]};

    // 2) optional large roles file
    let bigRoles = null;
    for (const url of ['data/roles_400.json','./data/roles_400.json','/data/roles_400.json']){
      try{
        const res = await fetch(url, {cache:'no-store'});
        if (!res.ok) throw new Error(res.status);
        bigRoles = await res.json();
        console.info('[NOVA] loaded roles_400:', url);
        break;
      }catch(e){ /* optional */ }
    }

    // normalize + merge
    this.data = {
      categories: base.categories || [],
      traits: base.traits || [],
      roles: Array.isArray(bigRoles) && bigRoles.length ? bigRoles : (base.roles || [])
    };

    // quick lookup for trait names
    this.data.traitsById = {};
    (this.data.traits||[]).forEach(t => this.data.traitsById[t.id] = t);
  }
};

/* ---------- Categories: 1–2 select, manual Continue ---------- */
async function renderCategories(){
  await App.init();

  if (!Array.isArray(App.state.categoryIds)) App.state.categoryIds = [];
  const grid = byId('categoryGrid');
  if (!grid) return;             // safe no-op if on another page

  const btn  = byId('catsContinue');
  const countEl = byId('catCount');
  const cats = App.data.categories || [];

  // render tiles
  grid.innerHTML = cats.map(c=>{
    const sel = App.state.categoryIds.includes(c.id) ? 'selected' : '';
    return `<article class="tile ${sel}" data-id="${c.id}">
      <div class="kicker">${c.group||''}</div>
      <div class="h3">${c.name}</div>
      <p class="p">${c.summary||''}</p>
    </article>`;
  }).join('');

  const updateUI = ()=>{
    const n = App.state.categoryIds.length;
    if (countEl) countEl.textContent = n;
    if (btn) btn.disabled = (n < 1 || n > 2);
  };
  updateUI();

  // toggle with cap 2 (3rd selection replaces oldest)
  grid.addEventListener('click', e=>{
    const tile = e.target.closest('.tile'); if(!tile) return;
    const id = tile.dataset.id;
    const list = App.state.categoryIds;
    const i = list.indexOf(id);

    if (i >= 0){
      list.splice(i,1);
      tile.classList.remove('selected');
    } else {
      if (list.length < 2){
        list.push(id);
        tile.classList.add('selected');
      } else {
        const removed = list.shift();
        grid.querySelector(`.tile[data-id="${removed}"]`)?.classList.remove('selected');
        list.push(id);
        tile.classList.add('selected');
      }
    }
    App.save();
    updateUI();
  });

  btn?.addEventListener('click', ()=>{
    if (App.state.categoryIds.length >= 1) location.href = 'traits.html';
  });
}

/* ---------- Traits: enable Continue when >=5 ---------- */
async function renderTraits(){
  await App.init();

  // derive selected category ids (backwards compatible with ?cat=)
  let catIds = App.state.categoryIds;
  if (!Array.isArray(catIds) || catIds.length === 0){
    const q = getQuery('cat');
    if (q) catIds = [q];
    else { location.href = 'categories.html'; return; }
    App.state.categoryIds = catIds; App.save();
  }

  // show category names
  const names = (App.data.categories||[])
    .filter(c=>catIds.includes(c.id))
    .map(c=>c.name)
    .join(' + ');
  const catName = byId('catName');
  if (catName) catName.textContent = names || '—';

  const grid = byId('traitsGrid');
  if (!grid) return;

  // render tiles for all selected categories
  const ts = (App.data.traits||[]).filter(t=>catIds.includes(t.categoryId));
  grid.innerHTML = ts.map(t=>{
    const sel = App.state.selectedTraits.includes(t.id) ? 'selected' : '';
    return `<article class="tile ${sel}" data-id="${t.id}">
      <div class="h3">${t.name}</div>
      <p class="p">${t.desc||''}</p>
    </article>`;
  }).join('');

  const countEl = byId('traitCount');
  const nextBtn = byId('toRoles');

  const updateCount = ()=>{
    const n = App.state.selectedTraits.length;
    if (countEl) countEl.textContent = n;
    if (nextBtn) nextBtn.disabled = (n < 5);
  };
  updateCount();

  grid.addEventListener('click', e=>{
    const tile = e.target.closest('.tile'); if(!tile) return;
    const id = tile.dataset.id;
    const s = App.state.selectedTraits;
    const i = s.indexOf(id);
    if (i === -1){ s.push(id); tile.classList.add('selected'); }
    else { s.splice(i,1); tile.classList.remove('selected'); }
    App.save();
    updateCount();
  });

  nextBtn?.addEventListener('click', ()=>{
    if (App.state.selectedTraits.length >= 5) location.href = 'roles.html';
  });
}

/* ---------- Roles (kept simple; can enhance later) ---------- */
async function renderRoles(){
  await App.init();
  const list = byId('rolesList');
  if (!list) return;

  const selected = new Set(App.state.selectedTraits||[]);
  const allRoles = App.data.roles || [];

  // naive score: count matching traits
  const scored = allRoles.map(r=>{
    const traits = r.traits || [];
    const hits = traits.reduce((a,id)=>a+(selected.has(id)?1:0),0);
    const total = Math.max(traits.length,1);
    const pct = Math.round((hits/total)*100);
    let label = 'Consider';
    if (pct >= 80) label = 'Excellent match';
    else if (pct >= 60) label = 'Strong match';
    else if (pct >= 40) label = 'Good match';
    return Object.assign({}, r, {_score: pct, _hits: hits, _total: total, _label: label});
  }).sort((a,b)=>b._score - a._score);

  list.innerHTML = scored.slice(0,50).map(r=>`
    <article class="card role">
      <div class="h3">${r.title}</div>
      <div class="meta">
        <span class="badge">Outlook: ${r.outlook||'—'}</span>
        <span class="badge">Salary: ${r.salary||'—'}</span>
        <span class="badge badge-accent">${r._label} — ${r._score}%</span>
      </div>
      <div class="meter" aria-label="Match level"><span style="width:${r._score}%"></span></div>
      <p class="p">${r.why||''}</p>
    </article>
  `).join('');

  byId('continue')?.addEventListener('click', ()=>location.href='reveal.html');
}

/* expose for pages */
window.renderCategories = renderCategories;
window.renderTraits = renderTraits;
window.renderRoles = renderRoles;
