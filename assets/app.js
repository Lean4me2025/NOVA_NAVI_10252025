<script>
/* ------------------------------
   NOVA App Core (vanilla JS)
   - State, storage, navigation
   - Data load (unified JSON)
--------------------------------*/
const NOVA_KEY = 'nova_state_v1';

const defaultState = {
  categoryId: null,
  selectedTraits: [],  // array of trait ids
  topRoles: [],        // derived
  reflection: ''
};

const App = {
  state: loadState(),
  data: null,

  async init() {
    if(!this.data){
      const res = await fetch('data/nova_data.json',{cache:'no-store'});
      this.data = await res.json();
    }
  },

  save(){ localStorage.setItem(NOVA_KEY, JSON.stringify(this.state)); },
  reset(){ this.state = structuredClone(defaultState); this.save(); },

  /* ---- helpers ---- */
  setCategory(id){ this.state.categoryId = id; this.state.selectedTraits = []; this.save(); },
  toggleTrait(id){
    const s = this.state.selectedTraits;
    const i = s.indexOf(id);
    if(i === -1){ s.push(id); } else { s.splice(i,1); }
    this.save();
  },
  deriveRoles(){
    // Score roles by overlapping selected trait ids
    const chosen = new Set(this.state.selectedTraits);
    const roles = this.data.roles.map(r=>{
      let score = 0;
      r.traits.forEach(t=>{ if(chosen.has(t)) score++; });
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

/* ---------- page renderers ---------- */
/* Categories Page */
async function renderCategories(){
  await App.init();
  const el = document.querySelector('#categoryGrid');
  el.innerHTML = App.data.categories.map(c=>`
    <div class="tile" data-id="${c.id}">
      <div class="kicker">${c.group}</div>
      <div class="h3">${c.name}</div>
      <p class="p">${c.summary}</p>
    </div>
  `).join('');

  el.addEventListener('click', e=>{
    const t = e.target.closest('.tile'); if(!t) return;
    App.setCategory(t.dataset.id);
    location.href='traits.html';
  });
}

/* Traits Page */
async function renderTraits(){
  await App.init();
  const cat = App.data.categories.find(c=>c.id===App.state.categoryId);
  if(!cat){ location.href='categories.html'; return; }

  document.querySelector('#catName').textContent = cat.name;

  const el = document.querySelector('#traitsGrid');
  el.innerHTML = App.data.traits
    .filter(t=>t.categoryId===cat.id)
    .map(t=>{
      const sel = App.state.selectedTraits.includes(t.id) ? 'selected' : '';
      return `<div class="tile ${sel}" data-id="${t.id}">
        <div class="h3">${t.name}</div>
        <p class="p">${t.desc}</p>
      </div>`;
    }).join('');

  el.addEventListener('click', e=>{
    const t = e.target.closest('.tile'); if(!t) return;
    t.classList.toggle('selected');
    App.toggleTrait(t.dataset.id);
    updateCount();
  });

  const nextBtn = document.querySelector('#toRoles');
  nextBtn.addEventListener('click', ()=>{
    if(App.state.selectedTraits.length < 5){
      alert('Choose at least 5 traits to continue.');
      return;
    }
    location.href='roles.html';
  });

  function updateCount(){
    document.querySelector('#traitCount').textContent = App.state.selectedTraits.length;
  }
  updateCount();
}

/* Roles Page */
async function renderRoles(){
  await App.init();
  const roles = App.deriveRoles();
  const el = document.querySelector('#rolesList');
  el.innerHTML = roles.map(r=>`
    <div class="role">
      <div class="h3">${r.title}</div>
      <div class="meta">
        <span class="badge">Outlook: ${r.outlook}</span>
        <span class="badge">Salary: ${r.salary}</span>
        <span class="badge">Fit score: ${r._score}</span>
      </div>
      <p class="p">${r.why}</p>
      <div class="kicker">Matched traits: ${r.traits.slice(0,6).map(id=>App.data.traitsById[id]?.name||id).join(', ')}</div>
    </div>
  `).join('');

  document.querySelector('#continue').addEventListener('click', ()=>location.href='reveal.html');
  document.querySelector('#back').addEventListener('click', ()=>history.back());
}

/* Reveal / Reflection Page */
async function renderReveal(){
  await App.init();
  const el = document.querySelector('#summary');
  const cat = App.data.categories.find(c=>c.id===App.state.categoryId);
  const traits = App.state.selectedTraits.map(id=>App.data.traitsById[id]?.name||id);

  el.innerHTML = `
    <div class="card">
      <div class="h2">Your Direction</div>
      <div class="kv"><div class="kicker">Focus Area</div><div>${cat?cat.name:'—'}</div></div>
      <div class="kv"><div class="kicker">Top Traits</div><div>${traits.join(', ')}</div></div>
      <div class="kv"><div class="kicker">Suggested Roles</div><div>${App.state.topRoles.map(r=>r.title).join(', ')}</div></div>
    </div>
  `;

  const textarea = document.querySelector('#reflection');
  textarea.value = App.state.reflection || '';
  textarea.addEventListener('input', ()=>{ App.state.reflection = textarea.value; App.save(); });

  document.querySelector('#toInvest').addEventListener('click', ()=>location.href='invest.html');
}

/* Invest Page */
async function renderInvest(){
  await App.init();
  // (Nothing special needed here; Payhip embed is in HTML)
  document.querySelector('#toNavi').addEventListener('click', ()=>location.href='navi.html');
}

/* Navi Transition */
function renderNavi(){
  // purely static page w/ link out to Navi
}

/* Utility to index traits by id for quick lookups */
(async function prime(){
  // Build traitsById map once, after data fetch:
  // This script may run on every page; safe to guard:
  const ensure = async()=>{
    if(!App.data) return;
    if(!App.data.traitsById){
      App.data.traitsById = {};
      App.data.traits.forEach(t=>App.data.traitsById[t.id]=t);
    }
  };
  // attempt immediate; if not yet loaded, wait for init() callers
  if(App.data) ensure();
})();
</script>
