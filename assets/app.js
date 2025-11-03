// ===== NOVA unified app.js (full) =====

// Bust caches after deploys
const CACHE_BUST = `?v=${Date.now()}`;

// ---------- Utilities ----------
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function setLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
function getLS(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } }

// Normalize unknown category schema -> { id, name, subtitle }
function normalizeCategory(c, idx) {
  if (typeof c === 'string') {
    return { id: String(idx + 1), name: c, subtitle: '' };
  }
  const name = c.name ?? c.title ?? c.label ?? c.category ?? c.Category ?? `Item ${idx+1}`;
  const subtitle = c.subtitle ?? c.sub ?? c.description ?? c.desc ?? '';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id: String(idRaw), name: String(name), subtitle: String(subtitle) };
}

// Robust JSON loader (absolute path from site root)
async function loadJSON(filename) {
  // Always fetch from /assets/data/ so it works at any route depth
  const url = `/assets/data/${filename}${CACHE_BUST}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} loading ${url}`);
  }
  return res.json();
}

// ---------- Welcome ----------
function initWelcome() {
  // nothing dynamic yet; placeholder for any future welcome logic
  // keep for router completeness
}

// ---------- Categories ----------
async function renderCategories() {
  const grid = qs('#categoryGrid');
  if (!grid) return;

  // Reset grid
  grid.innerHTML = '';

  // Load categories.json (supports 5 or 35 items)
  let raw;
  try {
    raw = await loadJSON('categories.json');
  } catch (err) {
    grid.innerHTML = `<p style="color:#b00020">Could not load categories.json<br>${err.message}</p>`;
    console.error('[categories] load error:', err);
    return;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    grid.innerHTML = `<p style="color:#b00020">No categories found in categories.json</p>`;
    return;
  }

  const cats = raw.map((c, i) => normalizeCategory(c, i));

  // Render pills/cards
  const frag = document.createDocumentFragment();
  cats.forEach(cat => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'cat-pill';
    a.dataset.id = cat.id;
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

  // After initial render, sync UI with stored selection if any
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

  // Store selection
  setLS('selectedCategories', ids);

  // Counter: "Selected: x / 2"
  const bar = qs('.bar');
  if (bar) {
    const existing = qs('#selCount') || (() => {
      const s = document.createElement('span');
      s.id = 'selCount';
      return bar.appendChild(s);
    })();
    existing.textContent = `Selected: ${ids.length} / ${limit}`;
  }

  // Enforce limit visually
  if (selected.length >= limit) {
    pills.forEach(p => { if (!p.classList.contains('selected')) p.classList.add('disabled'); });
  } else {
    pills.forEach(p => p.classList.remove('disabled'));
  }

  // Continue button enabled when 1–2 selected
  const btn = qs('#continueBtn');
  if (btn) {
    btn.disabled = !(selected.length >= 1 && selected.length <= limit);
    btn.onclick = (e) => {
      e.preventDefault();
      if (!btn.disabled) {
        // go to traits step
        location.href = 'traits.html';
      }
    };
  }

  // Reset link
  const reset = qs('#resetLink');
  if (reset) {
    reset.onclick = (e) => {
      e.preventDefault();
      pills.forEach(p => p.classList.remove('selected', 'disabled'));
      updateCategorySelectionUI();
    };
  }
}

async function initCategories() {
  // Ensure target mount exists
  if (!qs('#categoryGrid')) {
    console.warn('[categories] #categoryGrid not found');
    return;
  }
  await renderCategories();
}

// Expose for console / safety
window.renderCategories = renderCategories;

// ---------- Traits (stub – reads traits later) ----------
async function initTraits() {
  // Placeholder; we keep router intact
  // In future: load traits_with_categories.json and render by selectedCategories
}

// ---------- Roles (stub) ----------
async function initRoles() {
  // Placeholder; in future load roles_400.json filtered by selected traits
}

// ---------- Reflection ----------
function initReflection() {
  const box = qs('#reflectionBox');
  if (box) box.innerHTML = `<p>Take a moment to reflect on your selections…</p>`;
}

// ---------- Invest ----------
function initInvest() {
  const box = qs('#investBox');
  if (box) box.innerHTML = `<p>Now invest in yourself — your purpose journey begins here.</p>`;
}

// ---------- Simple Router ----------
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname.toLowerCase();

  if (path.includes('index'))   return initWelcome();
  if (path.includes('categories')) return initCategories();
  if (path.includes('traits'))  return initTraits();
  if (path.includes('roles'))   return initRoles();
  if (path.includes('reflection')) return initReflection();
  if (path.includes('invest'))  return initInvest();

  // Fallback: if the router doesn't match, try categories (useful in flat previews)
  try { renderCategories(); } catch (_) {}
  console.warn('[router] No page match for', path);
});
window.renderTraits = initTraits;
// ===== END of app.js =====
