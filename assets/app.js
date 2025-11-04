// ===== NOVA unified app.js (final clean build) =====

// Bust caches after deploys
const CACHE_BUST = '?v=' + Date.now();

// ---------------- Utilities ----------------
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function setLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
function getLS(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } }

// Normalize category schema
function normalizeCategory(c, idx) {
  if (typeof c === 'string') return { id: String(idx + 1), name: c, subtitle: '' };
  const name = c.name ?? c.title ?? c.label ?? c.category ?? `Item ${idx + 1}`;
  const subtitle = c.subtitle ?? c.sub ?? c.description ?? c.desc ?? '';
  const idRaw = c.id ?? c.key ?? c.slug ?? name;
  return { id: String(idRaw), name: String(name), subtitle: String(subtitle) };
}

// Generic baseline traits to fill sparse categories
const GENERIC_TRAITS = [
  "Analytical Thinker", "Creative Problem-Solver", "Systems Thinker",
  "Clear Communicator", "User-Focused", "Process Improver", "Results-Driven",
  "Growth Mindset", "Curious", "Organized", "Self-Starter", "Comfort with Ambiguity"
];

// Robust loader (absolute path from site root)
async function loadJSON(filename) {
  const url = `/assets/data/${filename}${CACHE_BUST}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${filename}`);
  return res.json();
}

// ---------------- Welcome ----------------
function initWelcome() {
  // Placeholder for intro audio or logic
  console.log("Welcome page ready");
}

// ---------------- Categories ----------------
async function renderCategories() {
  const grid = qs('#categoryGrid');
  if (!grid) return;

  grid.innerHTML = '';
  let raw;
  try {
    raw = await loadJSON('categories.json');
  } catch (err) {
    grid.innerHTML = `<p style="color:#b00">Could not load categories.json<br>${err.message}</p>`;
    return;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    grid.innerHTML = `<p style="color:#b00">No categories found in categories.json</p>`;
    return;
  }

  const cats = raw.map((c, i) => normalizeCategory(c, i));
  const frag = document.createDocumentFragment();

  cats.forEach(c => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'cat-pill';
    a.dataset.id = c.id;
    a.innerHTML = `<strong>${c.name}</strong><small>${c.subtitle}</small>`;
    a.addEventListener('click', e => {
      e.preventDefault();
      a.classList.toggle('selected');
      updateCategorySelectionUI();
    });
    frag.appendChild(a);
  });

  grid.appendChild(frag);
  updateCategorySelectionUI();
}

function updateCategorySelectionUI() {
  const limit = 2;
  const pills = qsa('.cat-pill');
  const selected = pills.filter(p => p.classList.contains('selected'));
  const ids = selected.map(p => p.dataset.id);
  setLS('selectedCategories', ids);

  let bar = qs('.bar');
  if (bar) bar.textContent = `Selected: ${ids.length} / ${limit}`;

  pills.forEach(p => {
    if (selected.length >= limit && !p.classList.contains('selected')) {
      p.classList.add('disabled');
    } else {
      p.classList.remove('disabled');
    }
  });

  const btn = qs('#continueBtn');
  if (btn) {
    btn.disabled = !(selected.length >= 1 && selected.length <= limit);
    btn.onclick = e => {
      e.preventDefault();
      if (!btn.disabled) location.href = 'traits.html';
    };
  }

  const reset = qs('#resetLink');
  if (reset) {
    reset.onclick = e => {
      e.preventDefault();
      pills.forEach(p => p.classList.remove('selected', 'disabled'));
      updateCategorySelectionUI();
    };
  }
}

async function initCategories() {
  if (!qs('#categoryGrid')) return console.warn('[Categories] #categoryGrid not found');
  await renderCategories();
}

// ---------------- Traits ----------------
async function initTraits() {
  const box = qs('#traitsBox') || document.body;
  box.innerHTML = '<p>Loading traits...</p>';

  try {
    const data = await loadJSON('traits_with_categories.json');
    const selectedCats = getLS('selectedCategories', []);
    let traits = [];

    if (selectedCats.length) {
      selectedCats.forEach(id => {
        const match = data[id];
        if (match) traits.push(...match);
      });
    }

    if (traits.length < 10) traits = traits.concat(GENERIC_TRAITS);

    box.innerHTML = traits.map(t => `<a href="#" class="trait-pill">${t}</a>`).join('');
  } catch (err) {
    box.innerHTML = `<p style="color:#b00">Error loading traits: ${err.message}</p>`;
  }
}

// ---------------- Roles ----------------
async function initRoles() {
  const box = qs('#rolesBox') || document.body;
  box.innerHTML = '<p>Loading roles...</p>';
  try {
    const roles = await loadJSON('roles_400.json');
    box.innerHTML = roles
      .slice(0, 5)
      .map(r => `<div class="role-card"><strong>${r.title}</strong><br><small>${r.subtitle ?? ''}</small></div>`)
      .join('');
  } catch (err) {
    box.innerHTML = `<p style="color:#b00">Error loading roles: ${err.message}</p>`;
  }
}

// ---------------- Reveal ----------------
function initReveal() {
  const box = qs('#revealBox');
  if (box) box.innerHTML = '<p>Reflect on your purpose and next steps.</p>';
}

// ---------------- Invest ----------------
function initInvest() {
  const box = qs('#investBox');
  if (box) {
    box.innerHTML = `
      <p>Now invest in yourself — your purpose journey begins here.</p>
      <div class="plans">
        <button>Get Starter – $29.99/mo</button>
      </div>
    `;
  }
}

// ---------------- Simple Router ----------------
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname.toLowerCase();

  if (path.includes('index')) return initWelcome();
  if (path.includes('categories')) return initCategories();
  if (path.includes('traits')) return initTraits();
  if (path.includes('roles')) return initRoles();
  if (path.includes('reveal')) return initReveal();
  if (path.includes('invest')) return initInvest();

  // fallback
  try { renderCategories(); }
  catch (err) { console.warn('[router] No page match for', path); }

  // expose helpers
  window.renderCategories = renderCategories;
  window.initTraits = initTraits;
});

// ===== END of app.js =====
