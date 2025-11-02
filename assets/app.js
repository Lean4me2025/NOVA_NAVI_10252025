/* NOVA Core v8
   - Loads full dataset from assets/data/config.json and assets/data/ooh_roles.json
   - Categories: select 1–2 (manual Continue)
   - Traits: >=5 (sticky Continue)
   - Roles: 2-column cards with Outlook, Salary, Match %
   - Reveal: summary + top matches + notes
*/

const NOVA_STATE_KEY = 'nova_state_v1';
const byId = id => document.getElementById(id);
const qs = (s,root=document)=>root.querySelector(s);
const qsa = (s,root=document)=>Array.from(root.querySelectorAll(s));

const App = {
  data: null,
  state: { categoryIds: [], selectedTraits: [], notes: '' },

  load(){ try{ const raw = localStorage.getItem(NOVA_STATE_KEY); if(raw) Object.assign(this.state, JSON.parse(raw)); }catch{} },
  save(){ try{ localStorage.setItem(NOVA_STATE_KEY, JSON.stringify(this.state)); }catch{} },

  async init(){
    if (this.data) return;
    this.load();

    // Load config (categories + traits, optional)
    let cfg = null;
    for (const url of ['assets/data/config.json','data/config.json','./data/config.json']){
      try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; cfg = await r.json(); console.info('[NOVA] config',url); break; }catch{}
    }
    if (!cfg) cfg = { categories: [], traits: [] };

    // Load roles (full OOH/O*NET list)
    let roles = null;
    for (const url of ['assets/data/ooh_roles.json','data/ooh_roles.json','./data/ooh_roles.json']){
      try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; roles = await r.json(); console.info('[NOVA] roles',url); break; }catch{}
    }
    if (!Array.isArray(roles)) roles = [];

    // Normalize maps
    const categories = cfg.categories || [];
    const traits = cfg.traits || [];
    const traitsById = Object.fromEntries(traits.map(t => [t.id, t]));
    const catById = Object.fromEntries(categories.map(c => [c.id, c]));

    // A light transform on roles so renderer always has fields
    const norm = r => ({
      id: r.id || r.code || r.title,
      title: r.title || r.occupation || 'Role',
      why: r.why || r.description || '',
      outlook: r.outlook || r.outlook_text || r.outlook_label || '—',
      salary: r.salary || r.median_salary || r.pay || '—',
      category: r.category || r.family || null,
      traits: Array.isArray(r.traits) ? r.traits : (Array.isArray(r.tags) ? r.tags : []),
      keywords: Array.isArray(r.keywords) ? r.keywords : []
    });

    this.data = {
      categories, traits, roles: roles.map(norm),
      traitsById, catById
    };
  }
};

/* ---------------------- Scoring ---------------------- */
function buildSelectedKeywordSet(selectedTraits, data){
  const names = selectedTraits
    .map(id => data.traitsById[id]?.name || '')
    .filter(Boolean)
    .map(s => s.toLowerCase());
  return new Set(names);
}

function scoreRole(role, kwSet, selectedCats){
  // 1) Direct trait-id overlap (if role.traits contain trait IDs)
  let hits = 0, denom = 0;
  if (Array.isArray(role.traits) && role.traits.length){
    denom += Math.min(role.traits.length, 12);
    role.traits.slice(0,12).forEach(tid=>{
      const name = App.data.traitsById[tid]?.name?.toLowerCase();
      if (name && kwSet.has(name)) hits++;
    });
  }

  // 2) Keyword text overlap (fallback)
  const hay = `${role.title} ${role.why} ${(role.keywords||[]).join(' ')}`.toLowerCase();
  kwSet.forEach(k=>{
    if (k && hay.includes(k)) { hits++; denom++; }
  });

  // Avoid zero denominator
  if (denom === 0) denom = Math.max(1, kwSet.size);

  let pct = Math.round(100 * (hits / denom));

  // 3) Category boost if role.category matches selected focus
  const catMatch = selectedCats.some(cid => {
    const c = App.data.catById[cid];
    if (!c) return false;
    const cname = (c.name||'').toLowerCase();
    return (role.category||'').toLowerCase().includes(cname);
  });
  if (catMatch) pct = Math.min(100, Math.round(pct * 1.15 + 6)); // gentle boost

  // Friendly label
  let label = 'Consider';
  if (pct >= 80) label = 'Excellent match';
  else if (pct >= 60) label = 'Strong match';
  else if (pct >= 40) label = 'Good match';

  return { pct, label };
}

function scoreAllRoles(){
  const data = App.data;
  const selectedTraits = App.state.selectedTraits || [];
  const selectedCats = App.state.categoryIds || [];

  const kwSet = buildSelectedKeywordSet(selectedTraits, data);

  return data.roles.map(r=>{
    const { pct, label } = scoreRole(r, kwSet, selectedCats);
    return Object.assign({}, r, { _score: pct, _label: label });
  }).sort((a,b)=> b._score - a._score);
}

/* ---------------------- Renderers ---------------------- */
// categories.html and traits.html can keep using your existing files;
// the two critical pages we’re fixing here are Roles and Reveal.

async function renderRoles(){
  await App.init();
  const list = byId('rolesList'); if (!list) return;

  const scored = scoreAllRoles();
  const top = scored.slice(0, 30); // keep it focused

  list.innerHTML = top.map(r=>`
    <article class="card role">
      <div class="h3">${r.title}</div>
      <div class="meta" style="margin:4px 0 6px">
        <span class="badge">Outlook: ${r.outlook}</span>
        <span class="badge">Salary: ${r.salary}</span>
        <span class="badge badge-accent">${r._label} — ${r._score}%</span>
      </div>
      <div class="meter" aria-label="Match level"><span style="width:${r._score}%"></span></div>
      <p class="p">${r.why}</p>
    </article>
  `).join('');

  byId('toReveal')?.addEventListener('click', ()=> location.href='reveal.html');
}

async function renderReveal(){
  await App.init();

  // Summary
  const focusNames = (App.state.categoryIds||[])
    .map(id => App.data.catById[id]?.name || '')
    .filter(Boolean).join(' + ');
  byId('focusNames').textContent = focusNames || '—';

  const traitNames = (App.state.selectedTraits||[])
    .map(id => App.data.traitsById[id]?.name || '')
    .filter(Boolean);
  byId('topTraits').textContent = traitNames.length ? traitNames.join(', ') : '—';

  // Top matches
  const wrap = byId('topRoles');
  const top = scoreAllRoles().slice(0, 8);
  wrap.innerHTML = top.map(r=>`
    <article class="card role">
      <div class="h3">${r.title}</div>
      <div class="meta" style="margin:4px 0 6px">
        <span class="badge">Outlook: ${r.outlook}</span>
        <span class="badge">Salary: ${r.salary}</span>
        <span class="badge badge-accent">${r._label} — ${r._score}%</span>
      </div>
      <div class="meter" aria-label="Match level"><span style="width:${r._score}%"></span></div>
      <p class="p">${r.why}</p>
    </article>
  `).join('');

  // Notes persistence
  const notes = byId('notes');
  if (notes){
    notes.value = App.state.notes || '';
    notes.addEventListener('input', ()=>{ App.state.notes = notes.value; App.save(); });
  }
}

/* expose */
window.renderRoles  = renderRoles;
window.renderReveal = renderReveal;
