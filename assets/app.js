<script>
// ===== NOVA unified app.js (final today) =====

// Bust caches after deploys
const CACHE_BUST = `?v=${Date.now()}`;

// ---------- Utilities ----------
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function setLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
function getLS(k, d=null){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(_){ return d; } }

// Normalize category strings/objects → {id,name,subtitle}
function normalizeCategory(c, idx) {
  if (typeof c === 'string') return { id: String(idx+1), name: c, subtitle: '' };
  const name = c.name ?? c.title ?? c.label ?? c.category ?? c.Category ?? `Item ${idx+1}`;
  const subtitle = c.subtitle ?? c.sub ?? c.description ?? c.desc ?? '';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id: String(idRaw), name: String(name), subtitle: String(subtitle) };
}

// Generic “baseline” traits used to pad any sparse category
const GENERIC_TRAITS = [
  "Analytical Thinker","Creative Problem-Solver","Systems Thinker","Detail-Oriented","Collaborative",
  "Clear Communicator","User-Focused","Process-Improver","Results-Driven","Strategic",
  "Growth Mindset","Curious","Organized","Self-Starter","Comfort with Ambiguity"
];

// Robust loader (absolute from site root so it works anywhere)
async function loadJSON(filename) {
  const url = `/assets/data/${filename}${CACHE_BUST}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${filename}`);
  return res.json();
}

// ---------- Welcome ----------
function initWelcome(){ /* placeholder for future intro audio/logic */ }

// ---------- Categories ----------
async function renderCategories() {
  const grid = qs('#categoryGrid');
  if (!grid) return;

  grid.innerHTML = '';
  let raw;
  try { raw = await loadJSON('categories.json'); }
  catch (err) {
    grid.innerHTML = `<p style="color:#b00020">Could not load categories.json<br>${err.message}</p>`;
    console.error('[categories] load error:', err);
    return;
  }
  if (!Array.isArray(raw) || !raw.length) {
    grid.innerHTML = `<p style="color:#b00020">No categories found in categories.json</p>`;
    return;
  }

  const cats = raw.map((c,i)=>normalizeCategory(c,i));
  const frag = document.createDocumentFragment();

  cats.forEach(cat => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'cat-pill';
    a.dataset.id = cat.name;          // use name as stable key across data files
    a.innerHTML = `
      <strong>${cat.name ?? 'Unnamed'}</strong>
      <small>${cat.subtitle ?? ''}</small>
    `;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      a.classList.toggle('selected');
      updateCategorySelectionUI();
    });
    frag.appendChild(a);
  });
  grid.appendChild(frag);

  // Restore selection, if any
  const saved = getLS('selectedCategories', []);
  if (Array.isArray(saved) && saved.length) {
    qsa('.cat-pill').forEach(el => {
      if (saved.includes(el.dataset.id)) el.classList.add('selected');
    });
  }
  updateCategorySelectionUI();
}

function updateCategorySelectionUI() {
  const limit = 2;
  const pills = qsa('.cat-pill');
  const selected = pills.filter(p => p.classList.contains('selected'));
  const ids = selected.map(p => p.dataset.id);
  setLS('selectedCategories', ids);

  // Counter
  let bar = qs('#selCount');
  if (!bar) {
    const s = document.createElement('span');
    s.id = 'selCount';
    const where = qs('.bar');
    if (where) where.appendChild(s);
    bar = s;
  }
  if (bar) bar.textContent = `Selected: ${ids.length} / ${limit}`;

  // Enforce view only (not hard lock)
  if (selected.length > limit) {
    pills.forEach(p => { if (!p.classList.contains('selected')) p.classList.add('disabled'); });
  } else {
    pills.forEach(p => p.classList.remove('disabled'));
  }

  // Continue button
  const btn = qs('#continueBtn');
  if (btn) {
    btn.disabled = !(selected.length >= 1 && selected.length <= limit);
    btn.onclick = (e) => {
      e.preventDefault();
      if (!btn.disabled) location.href = 'traits.html';
    };
  }

  // Reset link
  const reset = qs('#resetLink');
  if (reset) {
    reset.onclick = (e) => {
      e.preventDefault();
      pills.forEach(p => p.classList.remove('selected','disabled'));
      updateCategorySelectionUI();
    };
  }
}

async function initCategories() {
  if (!qs('#categoryGrid')) { console.warn('[categories] #categoryGrid not found'); return; }
  await renderCategories();
  // expose for console/testing
  window.renderCategories = renderCategories;
}

// ---------- Traits ----------
async function initTraits() {
  const grid = qs('#traitsGrid');
  if (!grid) { console.warn('[traits] #traitsGrid not found'); return; }

  const selectedCats = getLS('selectedCategories', []);
  qs('#focusLine') && (qs('#focusLine').textContent = selectedCats.join(', ') || '—');

  grid.innerHTML = '';

  // Load trait data
  let raw;
  try { raw = await loadJSON('traits_with_categories.json'); }
  catch (err) {
    grid.innerHTML = `<p style="color:#b00020">Could not load traits_with_categories.json<br>${err.message}</p>`;
    console.error('[traits] load error:', err);
    return;
  }

  // Build set for selected categories
  const selectedSet = new Set(selectedCats.map(s => s.toLowerCase()));
  const bucket = new Set();

  // 1) Category-specific traits
  if (Array.isArray(raw)) {
    raw.forEach(row => {
      // row can be {category:"Technology", traits:[...]} or {categories:["Tech","AI"], traits:[...]}
      const cats = (row.categories || [row.category]).filter(Boolean).map(x=>String(x).toLowerCase());
      if (cats.some(c => selectedSet.has(c))) {
        (row.traits || []).forEach(t => bucket.add(String(t)));
      }
    });
  }

  // 2) Pad with baseline traits up to a healthy minimum (e.g., 18)
  const MIN_TRAITS = 18;
  GENERIC_TRAITS.forEach(t => { if (bucket.size < MIN_TRAITS) bucket.add(t); });

  // Render as links (pills)
  const traits = [...bucket].sort();
  if (!traits.length) {
    grid.innerHTML = `<p style="color:#b00020">No traits available for those categories.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  traits.forEach(name => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'trait-pill';
    a.dataset.id = name;
    a.textContent = name;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      a.classList.toggle('selected');
      updateTraitsSelectionUI();
    });
    frag.appendChild(a);
  });
  grid.appendChild(frag);

  // restore previously selected traits
  const saved = getLS('selectedTraits', []);
  if (saved.length) {
    qsa('.trait-pill').forEach(el => {
      if (saved.includes(el.dataset.id)) el.classList.add('selected');
    });
  }
  updateTraitsSelectionUI();
}

function updateTraitsSelectionUI() {
  const pills = qsa('.trait-pill');
  const selected = pills.filter(p => p.classList.contains('selected'));
  const ids = selected.map(p => p.dataset.id);
  setLS('selectedTraits', ids);

  const count = qs('#traitCount');
  if (count) count.textContent = String(ids.length);

  const btn = qs('#toRolesBtn');
  if (btn) {
    btn.disabled = ids.length < 5;
    btn.onclick = (e) => {
      e.preventDefault();
      if (!btn.disabled) location.href = 'roles.html';
    };
  }

  const reset = qs('#traitsReset');
  if (reset) {
    reset.onclick = (e) => {
      e.preventDefault();
      pills.forEach(p => p.classList.remove('selected'));
      updateTraitsSelectionUI();
    });
  }
}

// ---------- Roles (simple demo filter) ----------
async function initRoles() {
  const box = qs('#rolesBox');
  if (!box) return;

  const traits = getLS('selectedTraits', []);
  const cats   = getLS('selectedCategories', []);

  // Load roles file (optional; demo filters by keywords)
  let roles = [];
  try { roles = await loadJSON('roles_400.json'); } catch(_){}

  const picked = roles.filter(r => {
    // very light match: title or tags contain any chosen trait keyword
    const hay = `${r.title||''} ${(r.tags||[]).join(' ')}`.toLowerCase();
    return traits.some(t => hay.includes(String(t).toLowerCase().split(' ')[0]));
  }).slice(0, 8);

  if (!picked.length) {
    box.innerHTML = `<p>No roles matched yet. Try selecting different traits or categories.</p>`;
  } else {
    box.innerHTML = picked.map(r => `
      <div class="role">
        <div class="role-title">${r.title||'Role'}</div>
        <div class="role-meta">${r.outlook||''} ${r.salary?`• ${r.salary}`:''}</div>
      </div>
    `).join('');
  }

  const btn = qs('#toRevealBtn');
  if (btn) btn.onclick = (e)=>{ e.preventDefault(); location.href = 'reveal.html'; };
}

// ---------- Reveal ----------
function initReveal() {
  const cats   = getLS('selectedCategories', []);
  const traits = getLS('selectedTraits', []);
  qs('#revFocus')   && (qs('#revFocus').textContent   = cats.join(', ') || '—');
  qs('#revTraits')  && (qs('#revTraits').textContent  = traits.join(', ') || '—');

  qs('#toInvestBtn') && (qs('#toInvestBtn').onclick = (e)=>{ e.preventDefault(); location.href='invest.html'; });
}

// ---------- Invest ----------
function initInvest() {
  const cats   = getLS('selectedCategories', []);
  const traits = getLS('selectedTraits', []);
  qs('#invFocus')  && (qs('#invFocus').textContent  = cats.join(', ') || '—');
  qs('#invTraits') && (qs('#invTraits').textContent = traits.join(', ') || '—');

  // Download JSON
  const dl = qs('#dlJsonBtn');
  if (dl) dl.onclick = (e)=>{
    e.preventDefault();
    const blob = new Blob([JSON.stringify({categories:cats, traits}, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nova_results.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Email (opens client with nicer subject/body)
  const email = qs('#emailBtn');
  if (email) email.onclick = (e)=>{
    e.preventDefault();
    const subject = encodeURIComponent('My NOVA results');
    const body = encodeURIComponent(
`Here are my NOVA results:

Focus: ${cats.join(', ') || '—'}
Traits: ${traits.join(', ') || '—'}

(Attached or paste your JSON download.)`
    );
    location.href = `mailto:?subject=${subject}&body=${body}`;
  };
}

// ---------- Simple Router ----------
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname.toLowerCase();

  if (path.includes('index'))      return initWelcome();
  if (path.includes('categories')) return initCategories();
  if (path.includes('traits'))     return initTraits();
  if (path.includes('roles'))      return initRoles();
  if (path.includes('reveal'))     return initReveal();
  if (path.includes('invest'))     return initInvest();

  // Fallback: try categories in flat previews
  try { renderCategories(); } catch(_) {}
  console.warn('[router] No page match for', path);

  // Expose helpers for quick console checks
  window.renderCategories = renderCategories;
  window.initTraits = initTraits;
});
</script>
