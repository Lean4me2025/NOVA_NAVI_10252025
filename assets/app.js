/* NOVA NavigationFlow v11.2 — Full File
   Data priority (no stitching needed):
   1) assets/data/config.json  + assets/data/ooh_roles.json
   2) assets/data/nova_data.json  (or data/nova_data.json)
   3) Legacy trio (data/categories.json, data/traits_with_categories.json, data/roles_400.json)
   4) Tiny demo fallback (prevents blank screens)

   Pages supported:
   - categories.html        (pick 1–2 focus areas)
   - subcategories.html     (6 families grouped; pick up to 3)
   - traits.html            (pick ≥5; continue only when valid)
   - roles.html             (shows Outlook, Salary, Match % + label)
   - reveal.html            (summary + top roles + notes + invest)

   State is persisted in localStorage so users can go back & edit.
*/

(() => {
  const STORE_KEY = 'nova_state_v11';
  const $  = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const App = {
    data: null,
    state: { categoryIds: [], subcategoryIds: [], traitIds: [], notes: '' },

    loadState() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) Object.assign(this.state, JSON.parse(raw));
      } catch {}
    },
    saveState() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.state)); } catch {}
    },
    resetAll() {
      this.state = { categoryIds: [], subcategoryIds: [], traitIds: [], notes: '' };
      this.saveState();
    },

    async fetchJSON(path) {
      try {
        const r = await fetch(path, { cache: 'no-store' });
        if (!r.ok) throw 0;
        return await r.json();
      } catch { return null; }
    },

    async init() {
      if (this.data) return;
      this.loadState();

      // Preferred pair in assets/data
      let cfg  = await this.fetchJSON('assets/data/config.json');
      let ooh  = await this.fetchJSON('assets/data/ooh_roles.json');

      // Single master if present
      let nova = await this.fetchJSON('assets/data/nova_data.json');
      if (!nova) nova = await this.fetchJSON('data/nova_data.json');

      // Fallback: data pair
      if (!cfg) cfg = await this.fetchJSON('data/config.json');
      if (!ooh) ooh = await this.fetchJSON('data/ooh_roles.json');

      // Legacy trio last
      let cats=null, traits=null, roles400=null;
      if (!cfg && !nova) {
        cats     = await this.fetchJSON('data/categories.json');
        traits   = await this.fetchJSON('data/traits_with_categories.json');
        roles400 = await this.fetchJSON('data/roles_400.json');
      }

      if (cfg && ooh) {
        this.data = normalizeFromConfigOOH(cfg, ooh);
      } else if (nova) {
        this.data = normalizeFromNova(nova);
      } else if (cats || traits || roles400) {
        this.data = normalizeFromLegacy(cats, traits, roles400);
      } else {
        this.data = demoData();
      }

      // lookups
      this.data.focusById = Object.fromEntries((this.data.focus||[]).map(x => [x.id, x]));
      this.data.subById   = Object.fromEntries((this.data.subcats||[]).map(x => [x.id, x]));
      this.data.traitById = Object.fromEntries((this.data.traits||[]).map(x => [x.id, x]));
    }
  };

  /* ---------------- Normalizers & Demo ---------------- */
  function normalizeFromConfigOOH(cfg, ooh) {
    const focus   = cfg.focus   || cfg.categories || [];
    const subcats = cfg.subcats || [];
    const traits  = (cfg.traits || []).map(t => ({
      id: t.id, name: t.name, desc: t.desc || t.description || '',
      subcatIds: t.subcatIds || t.categoryIds || []
    }));
    const roles   = normalizeRoles(ooh || []);
    return { focus, subcats, traits, roles };
  }
  function normalizeFromNova(nova) {
    const focus   = nova.focus   || nova.categories || [];
    const subcats = nova.subcats || [];
    const traits  = (nova.traits||[]).map(t => ({
      id: t.id, name: t.name, desc: t.desc || t.description || '',
      subcatIds: t.subcatIds || (t.categoryId ? [t.categoryId] : (t.categoryIds||[]))
    }));
    const roles   = normalizeRoles(nova.roles || []);
    return { focus, subcats, traits, roles };
  }
  function normalizeFromLegacy(cats, traits, roles400) {
    const focus   = cats?.focus || cats?.categories || [];
    const subcats = cats?.subcats || [];
    const traitsN = (traits||[]).map(t => ({
      id: t.id, name: t.name || t.title || 'Trait', desc: t.desc || '',
      subcatIds: t.subcatIds || t.categoryIds || []
    }));
    const roles   = normalizeRoles(roles400 || []);
    return { focus, subcats, traits: traitsN, roles };
  }
  function normalizeRoles(arr) {
    return (Array.isArray(arr)?arr:[]).map(r => ({
      id: r.id || r.code || ('role_'+Math.random().toString(36).slice(2,10)),
      title: r.title || r.occupation || 'Role',
      why: r.why || r.description || '',
      outlook: r.outlook || r.outlook_text || r.outlook_label || '—',
      salary: r.salary || r.median_salary || r.pay || '—',
      category: r.category || r.family || null,
      traits: Array.isArray(r.traits) ? r.traits : [],
      keywords: Array.isArray(r.keywords) ? r.keywords :
        (typeof r.keywords==='string' ? r.keywords.split(/[,;]\s*/) : [])
    }));
  }
  function demoData() {
    return {
      focus: [
        {id:'create',  name:'Create',  summary:'Builders, makers, designers'},
        {id:'analyze', name:'Analyze', summary:'Data, finance, process'}
      ],
      subcats: [
        {id:'engineering', name:'Engineering', parentId:'create'},
        {id:'finance',     name:'Finance',     parentId:'analyze'}
      ],
      traits: [
        {id:'t_systems', name:'Systems thinker',  subcatIds:['engineering']},
        {id:'t_numbers', name:'Numbers-driven',   subcatIds:['finance']},
        {id:'t_process', name:'Process improver', subcatIds:['engineering','finance']},
        {id:'t_detail',  name:'Detail oriented',  subcatIds:['engineering','finance']},
        {id:'t_comm',    name:'Clear communicator', subcatIds:['engineering','finance']}
      ],
      roles: normalizeRoles([
        {title:'Industrial Engineer', outlook:'Faster than average', salary:'$82k–$115k', keywords:['process','quality','systems']},
        {title:'Process Improvement Manager', outlook:'Average', salary:'$95k–$135k', keywords:['lean','kaizen','six sigma']},
        {title:'Financial Analyst', outlook:'Average', salary:'$70k–$100k', keywords:['finance','analysis','modeling']}
      ])
    };
  }

  /* ---------------- Scoring ---------------- */
  function buildKeywordSet(traitIds, data) {
    const names = (traitIds||[])
      .map(id => data.traitById[id]?.name || '')
      .filter(Boolean).map(s => s.toLowerCase());
    return new Set(names);
  }
  function scoreRole(role, kwSet, selectedFocusIds, data) {
    let hits=0, denom=0;

    // direct trait-id overlap (if provided on role)
    if (Array.isArray(role.traits) && role.traits.length) {
      denom += Math.min(role.traits.length, 12);
      role.traits.slice(0,12).forEach(tid => {
        const name = data.traitById[tid]?.name?.toLowerCase();
        if (name && kwSet.has(name)) hits++;
      });
    }

    // keyword fallback
    const hay = `${role.title} ${role.why} ${(role.keywords||[]).join(' ')}`.toLowerCase();
    kwSet.forEach(k => { if (k && hay.includes(k)) { hits++; denom++; }});
    if (denom===0) denom = Math.max(1, kwSet.size || 1);

    let pct = Math.round(100 * (hits/denom));

    // focus boost if role.category contains a selected focus name
    const focusNames = (selectedFocusIds||[]).map(id => (data.focusById[id]?.name||'').toLowerCase());
    if (focusNames.length && role.category) {
      const rc = String(role.category).toLowerCase();
      if (focusNames.some(fn => rc.includes(fn))) pct = Math.min(100, Math.round(pct*1.15 + 6));
    }

    let label = 'Consider';
    if (pct>=80) label='Excellent match';
    else if (pct>=60) label='Strong match';
    else if (pct>=40) label='Good match';

    return { pct, label };
  }
  function scoreAllRoles(state, data) {
    const kwSet = buildKeywordSet(state.traitIds, data);
    return (data.roles||[]).map(r => {
      const s = scoreRole(r, kwSet, state.categoryIds, data);
      return {...r, _score:s.pct, _label:s.label};
    }).sort((a,b) => b._score - a._score);
  }

  /* ---------------- Renderers ---------------- */
  async function renderCategories(){
    await App.init();
    const grid = $('#categoryGrid'); if (!grid) return;
    const btn  = $('#catsContinue');
    const count= $('#catCount');

    const list = App.data.focus || [];
    grid.innerHTML = list.map(c => `
      <a class="tile ${App.state.categoryIds.includes(c.id)?'selected':''}" data-id="${c.id}">
        <div class="h3">${c.name}</div>
        <p class="p">${c.summary||''}</p>
      </a>
    `).join('');

    const update = () => {
      const n = App.state.categoryIds.length;
      if (count) count.textContent = n;
      if (btn) btn.disabled = (n<1 || n>2);
      App.saveState();
    };

    grid.addEventListener('click', (e)=>{
      const t = e.target.closest('.tile'); if (!t) return;
      const id = t.dataset.id;
      const i = App.state.categoryIds.indexOf(id);
      if (i>=0){ App.state.categoryIds.splice(i,1); t.classList.remove('selected'); }
      else {
        if (App.state.categoryIds.length<2){ App.state.categoryIds.push(id); t.classList.add('selected'); }
        else {
          const removed = App.state.categoryIds.shift();
          grid.querySelector(`[data-id="${removed}"]`)?.classList.remove('selected');
          App.state.categoryIds.push(id); t.classList.add('selected');
        }
      }
      // upstream change → clear downstream
      App.state.subcategoryIds = [];
      App.state.traitIds = [];
      update();
    });

    btn?.addEventListener('click', ()=> location.href='subcategories.html');
    $('#resetAll')?.addEventListener('click', (e)=>{ e.preventDefault(); App.resetAll(); location.href='categories.html'; });
    update();
  }

  async function renderSubcategories(){
    await App.init();
    const wrap = $('#subcatWrap'); if (!wrap) return;
    const btn  = $('#subsContinue');
    const count= $('#subCount');

    // Group subcats by their parent (6 families)
    const groups = {};
    (App.data.subcats||[]).forEach(s => {
      const parent = App.data.focusById[s.parentId]?.name || 'Other';
      (groups[parent] ||= []).push(s);
    });

    wrap.innerHTML = Object.entries(groups).map(([label, arr]) => `
      <div class="groupLabel">${label}</div>
      <section class="grid-4">
        ${arr.map(s => `
          <a class="tile ${App.state.subcategoryIds.includes(s.id)?'selected':''}" data-id="${s.id}">
            <div class="h3">${s.name}</div>
            <p class="p">${s.summary||''}</p>
          </a>`).join('')}
      </section>
    `).join('');

    const update = () => {
      const n = App.state.subcategoryIds.length;
      if (count) count.textContent = n;
      if (btn) btn.disabled = (n<1 || n>3);
      App.saveState();
    };

    wrap.addEventListener('click', (e)=>{
      const t = e.target.closest('.tile'); if (!t) return;
      const id = t.dataset.id;
      const i = App.state.subcategoryIds.indexOf(id);
      if (i>=0){ App.state.subcategoryIds.splice(i,1); t.classList.remove('selected'); }
      else {
        if (App.state.subcategoryIds.length<3){ App.state.subcategoryIds.push(id); t.classList.add('selected'); }
        else {
          const removed = App.state.subcategoryIds.shift();
          wrap.querySelector(`[data-id="${removed}"]`)?.classList.remove('selected');
          App.state.subcategoryIds.push(id); t.classList.add('selected');
        }
      }
      // upstream change → clear traits
      App.state.traitIds = [];
      update();
    });

    $('#clearSubs')?.addEventListener('click', (e)=>{ e.preventDefault(); App.state.subcategoryIds=[]; App.state.traitIds=[]; App.saveState(); location.reload(); });
    btn?.addEventListener('click', ()=> location.href='traits.html');
    update();
  }

  async function renderTraits(){
    await App.init();
    if (!(App.state.categoryIds||[]).length){ location.href='categories.html'; return; }
    if (!(App.state.subcategoryIds||[]).length){ location.href='subcategories.html'; return; }

    const focusNames = (App.state.categoryIds||[]).map(id => App.data.focusById[id]?.name || '').filter(Boolean).join(' + ');
    const subNames   = (App.state.subcategoryIds||[]).map(id => App.data.subById[id]?.name || '').filter(Boolean).join(', ');
    if ($('#focusNames')) $('#focusNames').textContent = focusNames || '—';
    if ($('#subNames'))   $('#subNames').textContent   = subNames   || '—';

    const grid = $('#traitsGrid'); if (!grid) return;
    const btn  = $('#toRoles');
    const count= $('#traitCount');

    // Filter traits by chosen subcats
    const pool = (App.data.traits||[]).filter(t => {
      const a = t.subcatIds || t.categoryIds || [];
      return a.some(x => App.state.subcategoryIds.includes(x));
    });

    grid.innerHTML = pool.map(t => `
      <a class="tile ${App.state.traitIds.includes(t.id)?'selected':''}" data-id="${t.id}">
        <div class="h3">${t.name}</div>
        <p class="p">${t.desc||''}</p>
      </a>
    `).join('');

    const update = () => {
      const n = App.state.traitIds.length;
      if (count) count.textContent = n;
      if (btn) btn.disabled = (n < 5);
      App.saveState();
    };

    grid.addEventListener('click', (e)=>{
      const t = e.target.closest('.tile'); if (!t) return;
      const id = t.dataset.id;
      const i = App.state.traitIds.indexOf(id);
      if (i>=0){ App.state.traitIds.splice(i,1); t.classList.remove('selected'); }
      else { App.state.traitIds.push(id); t.classList.add('selected'); }
      update();
    });

    btn?.addEventListener('click', ()=> location.href='roles.html');
    update();
  }

  async function renderRoles(){
    await App.init();
    const list = $('#rolesList'); if (!list) return;

    const scored = scoreAllRoles(App.state, App.data).slice(0, 30);
    list.innerHTML = scored.map(r => `
      <article class="card role">
        <div class="h3">${r.title}</div>
        <div class="meta" style="margin:4px 0 6px">
          <span class="badge">Outlook: ${r.outlook}</span>
          <span class="badge">Salary: ${r.salary}</span>
          <span class="badge badge-accent">${r._label} — ${r._score}%</span>
        </div>
        <div class="meter" aria-label="Match level"><span style="width:${r._score}%"></span></div>
        <p class="p">${r.why || ''}</p>
      </article>
    `).join('');

    $('#toReveal')?.addEventListener('click', ()=> location.href='reveal.html');
  }

  async function renderReveal(){
    await App.init();
    const focusNames = (App.state.categoryIds||[]).map(id => App.data.focusById[id]?.name || '').filter(Boolean).join(' + ');
    const subNames   = (App.state.subcategoryIds||[]).map(id => App.data.subById[id]?.name || '').filter(Boolean).join(', ');
    const traitNames = (App.state.traitIds||[]).map(id => App.data.traitById[id]?.name || '').filter(Boolean);

    if ($('#focusNames')) $('#focusNames').textContent = focusNames || '—';
    if ($('#subNames'))   $('#subNames').textContent   = subNames || '—';
    if ($('#topTraits'))  $('#topTraits').textContent  = traitNames.length ? traitNames.join(', ') : '—';

    const wrap = $('#topRoles');
    if (wrap) {
      const top = scoreAllRoles(App.state, App.data).slice(0,8);
      wrap.innerHTML = top.map(r => `
        <article class="card role">
          <div class="h3">${r.title}</div>
          <div class="meta" style="margin:4px 0 6px">
            <span class="badge">Outlook: ${r.outlook}</span>
            <span class="badge">Salary: ${r.salary}</span>
            <span class="badge badge-accent">${r._label} — ${r._score}%</span>
          </div>
          <div class="meter" aria-label="Match level"><span style="width:${r._score}%"></span></div>
          <p class="p">${r.why || ''}</p>
        </article>
      `).join('');
    }

    const notes = $('#notes');
    if (notes) {
      notes.value = App.state.notes || '';
      notes.addEventListener('input', ()=>{ App.state.notes = notes.value; App.saveState(); });
    }
  }

  /* expose renderers globally for each page to call */
  window.renderCategories    = renderCategories;
  window.renderSubcategories = renderSubcategories;
  window.renderTraits        = renderTraits;
  window.renderRoles         = renderRoles;
  window.renderReveal        = renderReveal;
})();
