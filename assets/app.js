// ===== NOVA unified app.js (Baseline) =====

// Avoid stale JSON after deploys
const CACHE_BUST = `?v=${Date.now()}`;

// Robust JSON loader that works locally and on Vercel
async function loadJSON(file) {
  const paths = [
    `/assets/data/${file}${CACHE_BUST}`,
    `./assets/data/${file}${CACHE_BUST}`,
    `assets/data/${file}${CACHE_BUST}`
  ];
  for (const url of paths) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
  }
  throw new Error(`Failed to load ${file} from /assets/data`);
}

// ---------- Helpers ----------
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function setLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
function getLS(k, d = null) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; }
}

// Normalize unknown category schemas -> {id, name, subtitle}
function normalizeCategory(c) {
  const name = c.name ?? c.title ?? c.label ?? c.category ?? c.Category ?? c.cat ?? 'Unnamed';
  const subtitle = c.subtitle ?? c.sub ?? c.description ?? c.desc ?? '';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id: String(idRaw), name: String(name), subtitle: String(subtitle) };
}

// ---------- Welcome ----------
function initWelcome() {
  const start = qsa('[data-next="categories"], a[href="categories.html"]')[0];
  if (start) start.onclick = (e) => { e.preventDefault(); location.href = 'categories.html'; };
}

// ---------- Categories ----------
async function initCategories() {
  const grid = qs('#categoryGrid') || qs('.container');
  if (!grid) return console.error('Missing #categoryGrid');

  // Load & normalize data
  let raw = [];
  try {
    raw = await loadJSON('categories.json');
    if (!Array.isArray(raw)) throw new Error('categories.json should be an array');
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div style="color:#900">Couldn’t load categories.json</div>`;
    return;
  }
  const cats = raw.map(normalizeCategory);

  // Render pills
  grid.innerHTML = '';
  const selected = new Set(getLS('nova.selectedCategoryIds', []));
  const selCountEl = qs('#selCount');
  const continueBtn = qs('#continueBtn');
  const resetLink = qs('#resetLink');

  const updateUI = () => {
    selCountEl && (selCountEl.textContent = String(selected.size));
    if (continueBtn) continueBtn.disabled = !(selected.size >= 1 && selected.size <= 2);
  };
  updateUI();

  cats.forEach(cat => {
    const el = document.createElement('button');
    el.className = 'cat-pill';
    if (selected.has(String(cat.id))) el.classList.add('selected');
    el.innerHTML = `<strong>${cat.name}</strong><small>${cat.subtitle || ''}</small>`;
    el.onclick = () => {
      const id = String(cat.id);
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        if (selected.size >= 2) return; // limit 2
        selected.add(id);
      }
      setLS('nova.selectedCategoryIds', [...selected]);
      el.classList.toggle('selected');
      updateUI();
    };
    grid.appendChild(el);
  });

  if (continueBtn) {
    continueBtn.onclick = () => {
      if (selected.size === 0) return;
      location.href = 'traits.html';
    };
  }
  if (resetLink) {
    resetLink.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('nova.selectedCategoryIds');
      location.reload();
    };
  }
}

// ---------- Traits ----------
async function initTraits() {
  const selectedIds = getLS('nova.selectedCategoryIds', []);
  if (!selectedIds.length) return (location.href = 'categories.html');

  let traitsAll = [];
  try {
    traitsAll = await loadJSON('traits_with_categories.json');
    if (!Array.isArray(traitsAll)) throw new Error('traits_with_categories.json must be an array');
  } catch (err) {
    console.error(err);
    const host = qs('#traitsGrid') || document.body;
    host.insertAdjacentHTML('afterbegin', `<div style="color:#900">Couldn’t load traits data.</div>`);
    return;
  }

  const traits = traitsAll.filter(t => selectedIds.includes(String(t.categoryId)) || selectedIds.includes(String(t.category)));
  const grid = qs('#traitsGrid');
  if (!grid) return;

  grid.innerHTML = '';
  traits.forEach(tr => {
    const id = String(tr.id ?? tr.key ?? tr.slug ?? tr.label);
    const label = String(tr.label ?? tr.name ?? tr.title ?? 'Trait');
    const node = document.createElement('label');
    node.className = 'trait-chip';
    node.innerHTML = `<input type="checkbox" value="${id}" /> <span>${label}</span>`;
    grid.appendChild(node);
  });

  const next = qsa('[data-next="roles"]')[0] || qs('#toRoles');
  if (next) {
    next.onclick = () => {
      const chosen = qsa('input[type="checkbox"]:checked', grid).map(i => i.value);
      setLS('nova.selectedTraitIds', chosen);
      location.href = 'roles.html';
    };
  }
}

// ---------- Roles ----------
async function initRoles() {
  let roles = [];
  try {
    roles = await loadJSON('roles_400.json');
    if (!Array.isArray(roles)) throw new Error('roles_400.json must be an array');
  } catch (err) {
    console.error(err);
    const host = qs('#rolesGrid') || document.body;
    host.insertAdjacentHTML('afterbegin', `<div style="color:#900">Couldn’t load roles data.</div>`);
    return;
  }

  const pickedTraits = new Set(getLS('nova.selectedTraitIds', []));
  const scored = roles
    .map(r => {
      const ids = (r.traitIds || r.traits || []).map(String);
      const overlap = ids.filter(id => pickedTraits.has(id)).length;
      return { ...r, score: overlap };
    })
    .sort((a, b) => b.score - a.score);

  const grid = qs('#rolesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  scored.slice(0, 12).forEach(role => {
    const title = role.title ?? role.name ?? 'Role';
    const outlook = role.outlook ?? '—';
    const salary = role.salary ?? '—';
    const why = role.whyFit ?? '';
    const id = String(role.id ?? title);

    const card = document.createElement('div');
    card.className = 'role-card';
    card.innerHTML = `
      <div class="role-title">${title}</div>
      <div class="role-meta">
        <span class="badge">Outlook: ${outlook}</span>
        <span class="badge">Salary: ${salary}</span>
      </div>
      <p class="role-why">${why}</p>
      <button class="btn btn-primary" data-role="${id}">Select</button>
    `;
    card.querySelector('button').onclick = () => {
      setLS('nova.selectedRoleId', id);
      location.href = 'reveal.html';
    };
    grid.appendChild(card);
  });
}

// ---------- Reveal / Invest (light stubs) ----------
function initReveal() {
  const btn = qsa('[data-next="invest"]')[0] || qs('#toInvest');
  if (btn) btn.onclick = () => (location.href = 'invest.html');
}
function initInvest() { /* no-op for now */ }

// ---------- Simple Router ----------
document.addEventListener('DOMContentLoaded', () => {
  const p = (location.pathname || '').toLowerCase();
  const ends = (name) =>
    p.endsWith(`/${name}`) || p.endsWith(`/${name}.html`);

  if (ends('index') || p.endsWith('/') || p === '') return initWelcome();
  if (ends('categories')) return initCategories();
  if (ends('traits')) return initTraits();
  if (ends('roles')) return initRoles();
  if (ends('reveal')) return initReveal();
  if (ends('invest')) return initInvest();

  // default to welcome if unknown route
  initWelcome();
});

// ---------- Global shims (legacy support) ----------
window.initWelcome = initWelcome;
window.initCategories = initCategories;
window.renderCategories = initCategories; // legacy name used in older pages
window.initTraits = initTraits;
window.initRoles = initRoles;
window.initReveal = initReveal;
window.initInvest = initInvest;
