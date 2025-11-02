// NOVA App Core (resilient navigation)
// - Categories tiles are real links to traits.html?cat=<id>
// - Still saves state on click
// - Traits can read ?cat=... if state missing
// - JSON loader tries common paths; falls back to sample data

const NOVA_KEY = 'nova_state_v1';

const defaultState = {
  categoryId: null,
  selectedTraits: [],
  topRoles: [],
  reflection: ''
};

const App = {
  state: loadState(),
  data: null,

  async init() {
    if (this.data) return;
    const candidates = ['data/nova_data.json','./data/nova_data.json','/data/nova_data.json'];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        this.data = normalizeData(json);
        console.info('[NOVA] Loaded data from', url);
        return;
      } catch (e) {
        console.warn('[NOVA] Could not load', url, e);
      }
    }
    console.error('[NOVA] Using sample data fallback.');
    this.data = normalizeData(sampleData());
  },

  save(){ localStorage.setItem(NOVA_KEY, JSON.stringify(this.state)); },
  reset(){ this.state = structuredClone(defaultState); this.save(); },

  setCategory(id){ this.state.categoryId = id; this.state.selectedTraits = []; this.save(); },
  toggleTrait(id){
    const s = this.state.selectedTraits;
    const i = s.indexOf(id);
    if (i === -1) s.push(id); else s.splice(i,1);
    this.save();
  },
  deriveRoles(){
    const chosen = new Set(this.state.selectedTraits);
    const roles = this.data.roles.map(r=>{
      let score = 0;
      (r.traits||[]).forEach(t=>{ if(chosen.has(t)) score++; });
      return {...r, _score:score};
    }).sort((a,b)=>b._score - a._score);
    this.state.topRoles = roles.slice(0,6);
    this.save();
    return this.state.topRoles;
  }
};

function loadState(){
  try{
    const raw = localStorage.getItem(NOVA_KEY);
    return raw ? {...structuredClone(defaultState), ...JSON.parse(raw)} : structuredClone(defaultState);
  }catch(e){ return structuredClone(defaultState); }
}

function normalizeData(d){
  d.traitsById = {};
  (d.traits||[]).forEach(t=> d.traitsById[t.id]=t);
  return d;
}

function getQuery(key){
  const u = new URL(location.href);
  return u.searchParams.get(key);
}

/* ---------- Page Renderers ---------- */

async function renderCategories(){
  await App.init();
  const grid = document.getElementById('categoryGrid');
  if (!grid){ console.error('[NOVA] #categoryGrid not found'); return; }

  const cats = App.data.categories || [];
  if (!cats.length){
    grid.innerHTML = `<div class="card">No categories found. Check /data/nova_data.json.</div>`;
    return;
  }

  // Each tile is a real link for guaranteed navigation
  grid.innerHTML = cats.map(c=>`
    <a class="tile" data-id="${c.id}" href="traits.html?cat=${encodeURIComponent(c.id)}" aria-label="${c.name}">
      <div class="kicker">${c.group || ''}</div>
      <div class="h3">${c.name}</div>
      <p class="p">${c.summary || ''}</p>
    </a>
  `).join('');

  // Save the chosen category to state on click (so Traits knows)
  grid.addEventListener('click', e=>{
    const t = e.target.closest('.tile'); if(!t) return;
    App.setCategory(t.dataset.id);
  });
}

async function renderTraits(){
  await App.init();

  // If no state, accept ?cat=<id> from the URL
  if (!App.state.categoryId) {
    const q = getQuery('cat');
    if (q) { App.setCategory(q); }
  }

  const cat = (App.data.categories||[]).find(c=>c.id===App.state.categoryId);
  if (!cat){ location.href='categories.html'; return; }

  const catName = document.getElementById('catName');
  if (catName) catName.textContent = cat.name;

  const grid = document.getElementById('traitsGrid');
  if (!grid){ console.error('[NOVA] #traitsGrid not found'); return; }

  const ts = (App.data.traits||[]).filter(t=>t.categoryId===cat.id);
  grid.innerHTML = ts.map(t=>{
    const sel = App.state.selectedTraits.includes(t.id) ? 'selected' : '';
    return `<article class="tile ${sel}" data-id="${t.id}">
      <div class="h3">${t.name}</div>
      <p class="p">${t.desc||''}</p>
    </article>`;
  }).join('');

  const updateCount = ()=> {
    const el = document.getElementById('traitCount');
    if (el) el.textContent = App.state.selectedTraits.length;
  };
  updateCount();

  grid.addEventListener('click', e=>{
    const t = e.target.closest('.tile'); if(!t) return;
    t.classList.toggle('selected');
    App.toggleTrait(t.dataset.id);
    updateCount();
  });

  const next = document.getElementById('toRoles');
  if (next){
    next.addEventListener('click', ()=>{
      if (App.state.selectedTraits.length < 5){
        alert('Choose at least 5 traits to continue.');
        return;
      }
      location.href='roles.html';
    });
  }
}

async function renderRoles(){
  await App.init();
  const list = document.getElementById('rolesList');
  if (!list){ console.error('[NOVA] #rolesList not found'); return; }

  const roles = App.deriveRoles();
  list.innerHTML = roles.map(r=>`
    <article class="role">
      <div class="h3">${r.title}</div>
      <div class="meta">
        <span class="badge">Outlook: ${r.outlook||'—'}</span>
        <span class="badge">Salary: ${r.salary||'—'}</span>
        <span class="badge">Fit score: ${r._score}</span>
      </div>
      <p class="p">${r.why||''}</p>
      <div class="kicker">Matched traits: ${(r.traits||[]).slice(0,6).map(id=>App.data.traitsById[id]?.name||id).join(', ')}</div>
    </article>
  `).join('');

  const cont = document.getElementById('continue');
  if (cont) cont.addEventListener('click', ()=>location.href='reveal.html');
}

async function renderReveal(){
  await App.init();
  const el = document.getElementById('summary');
  if (!el){ console.error('[NOVA] #summary not found'); return; }

  const cat = (App.data.categories||[]).find(c=>c.id===App.state.categoryId);
  const traits = (App.state.selectedTraits||[]).map(id=>App.data.traitsById[id]?.name||id);

  el.innerHTML = `
    <section class="card">
      <div class="h2">Your Direction</div>
      <div class="kv"><div class="kicker">Focus Area</div><div>${cat?cat.name:'—'}</div></div>
      <div class="kv"><div class="kicker">Top Traits</div><div>${traits.join(', ')||'—'}</div></div>
      <div class="kv"><div class="kicker">Suggested Roles</div><div>${(App.state.topRoles||[]).map(r=>r.title).join(', ')||'—'}</div></div>
    </section>
  `;

  const textarea = document.getElementById('reflection');
  if (textarea){
    textarea.value = App.state.reflection || '';
    textarea.addEventListener('input', ()=>{
      App.state.reflection = textarea.value; App.save();
    });
  }

  const btn = document.getElementById('toInvest');
  if (btn) btn.addEventListener('click', ()=>location.href='invest.html');
}

async function renderInvest(){
  await App.init();
  const btn = document.getElementById('toNavi');
  if (btn) btn.addEventListener('click', ()=>location.href='navi.html');
}

function renderNavi(){ /* static */ }

/* ---------- Sample data (fallback only) ---------- */
function sampleData(){
  return {
    categories: [
      {id:'build', group:'Create', name:'Builders & Makers', summary:'Design, make, improve systems and things.'},
      {id:'solve', group:'Analyze', name:'Problem Solvers', summary:'Diagnose, model, optimize, and decide.'},
      {id:'lead',  group:'Guide',  name:'Leaders & Organizers', summary:'Set direction, align people, drive results.'}
    ],
    traits: [
      {id:'t01', categoryId:'build', name:'System Thinker', desc:'Sees how parts fit together.'},
      {id:'t02', categoryId:'build', name:'Process Improver', desc:'Streamlines and standardizes.'},
      {id:'t06', categoryId:'solve', name:'Data-Driven', desc:'Decisions backed by facts.'},
      {id:'t07', categoryId:'solve', name:'Root-Cause Finder', desc:'Asks 5 Whys.'},
      {id:'t11', categoryId:'lead',  name:'Vision Setter', desc:'Sees the future and rallies people.'}
    ],
    roles: [
      {title:'Operations Analyst', outlook:'Stable', salary:'$75k–$105k', traits:['t06','t07'], why:'Analyze performance & recommend changes.'},
      {title:'Process Improvement Manager', outlook:'Growing', salary:'$95k–$140k', traits:['t02','t01'], why:'Lead CI initiatives and deliver savings.'}
    ]
  };
}
