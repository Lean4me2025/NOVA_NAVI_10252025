// ===== Nova unified app.js =====

// Simple cache-buster to avoid stale JSON after deploys
const CACHE_BUST = `?v=${(window.BUILD_STAMP || Date.now())}`;

// Robust JSON loader: tries absolute and relative paths automatically
async function loadJSON(file) {
  const candidates = [
    `/assets/data/${file}${CACHE_BUST}`,   // for /public assets on Vercel
    `./assets/data/${file}${CACHE_BUST}`,  // for repo-root local testing
    `assets/data/${file}${CACHE_BUST}`     // final fallback
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
  }
  throw new Error(`Failed to load ${file}. Check asset paths/public folder.`);
}

// Utility: mount a simple, clear error block for the user
function showInlineError(targetSelector, message) {
  const host = document.querySelector(targetSelector) || document.body;
  const el = document.createElement('div');
  el.style.cssText = 'margin:16px;padding:12px;border:1px solid #e33;background:#fff5f5;color:#900;border-radius:8px;font-size:14px;';
  el.textContent = message;
  host.prepend(el);
}

// ---- Page Inits ----
async function initWelcome() {
  // Optional: bind voice intro button if present
  const btn = document.querySelector('[data-intro-audio]');
  if (btn) {
    const audio = new Audio('/assets/audio/intro.mp3');
    btn.addEventListener('click', () => audio.play());
  }
  // Next button wiring (if using data-next)
  const next = document.querySelector('[data-next="categories"]');
  if (next) next.addEventListener('click', () => (window.location.href = 'categories.html'));
}

async function initCategories() {
  let data;
  try {
    data = await loadJSON('categories.json');
    if (!Array.isArray(data)) throw new Error('categories.json did not return an array.');
  } catch (err) {
    console.error(err);
    showInlineError('#categoryGrid', 'We couldn’t load categories. Please refresh. If this persists, verify assets/data paths.');
    return;
  }

  const grid = document.querySelector('#categoryGrid');
  if (!grid) {
    console.error('Missing #categoryGrid container on categories.html');
    return;
  }

  grid.innerHTML = '';
  data.forEach(cat => {
    const card = document.createElement('button');
    card.className = 'category-card';
    card.type = 'button';
    card.setAttribute('data-category-id', cat.id);
    card.innerHTML = `
      <div class="cat-title">${cat.name}</div>
      <div class="cat-sub">${cat.subtitle || ''}</div>
    `;
    card.addEventListener('click', () => {
      // Persist selected category and go to traits
      try { localStorage.setItem('nova.selectedCategoryId', String(cat.id)); } catch (_){}
      window.location.href = 'traits.html';
    });
    grid.appendChild(card);
  });

  // Progress header (optional)
  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 2 of 6';
}

async function initTraits() {
  const selectedId = localStorage.getItem('nova.selectedCategoryId');
  if (!selectedId) {
    window.location.replace('categories.html');
    return;
  }

  let data;
  try {
    data = await loadJSON('traits.json');
    if (!Array.isArray(data)) throw new Error('traits.json did not return an array.');
  } catch (err) {
    console.error(err);
    showInlineError('#traitsGrid', 'We couldn’t load traits. Please refresh. If this persists, verify assets/data paths.');
    return;
  }

  const traits = data.filter(t => String(t.categoryId) === String(selectedId));
  const grid = document.querySelector('#traitsGrid');
  if (!grid) {
    console.error('Missing #traitsGrid on traits.html');
    return;
  }

  grid.innerHTML = '';
  traits.forEach(tr => {
    const tag = document.createElement('label');
    tag.className = 'trait-chip';
    tag.innerHTML = `
      <input type="checkbox" value="${tr.id}" />
      <span>${tr.label}</span>
    `;
    grid.appendChild(tag);
  });

  // Continue button
  const next = document.querySelector('[data-next="roles"]');
  if (next) {
    next.onclick = () => {
      const checked = [...grid.querySelectorAll('input[type="checkbox"]:checked')].map(i => i.value);
      try { localStorage.setItem('nova.selectedTraitIds', JSON.stringify(checked)); } catch (_){}
      window.location.href = 'roles.html';
    };
  }

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 3 of 6';
}

async function initRoles() {
  let roles;
  try {
    roles = await loadJSON('roles.json');
    if (!Array.isArray(roles)) throw new Error('roles.json did not return an array.');
  } catch (err) {
    console.error(err);
    showInlineError('#rolesGrid', 'We couldn’t load roles. Please refresh.');
    return;
  }

  // Simple relevance scoring by selected traits (can be replaced with your richer logic)
  const selectedTraits = JSON.parse(localStorage.getItem('nova.selectedTraitIds') || '[]');
  const scored = roles
    .map(r => {
      const overlap = (r.traitIds || []).filter(id => selectedTraits.includes(String(id))).length;
      return { ...r, score: overlap };
    })
    .sort((a, b) => b.score - a.score);

  const grid = document.querySelector('#rolesGrid');
  if (!grid) {
    console.error('Missing #rolesGrid on roles.html');
    return;
  }

  grid.innerHTML = '';
  scored.slice(0, 12).forEach(role => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.innerHTML = `
      <div class="role-title">${role.title}</div>
      <div class="role-meta">
        <span class="badge">Outlook: ${role.outlook || '—'}</span>
        <span class="badge">Salary: ${role.salary || '—'}</span>
      </div>
      <p class="role-why">${role.whyFit || ''}</p>
      <button class="btn btn-primary" data-role="${role.id}">Select</button>
    `;
    card.querySelector('button').onclick = () => {
      try { localStorage.setItem('nova.selectedRoleId', String(role.id)); } catch (_){}
      window.location.href = 'reveal.html';
    };
    grid.appendChild(card);
  });

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 4 of 6';
}

function initReveal() {
  // Minimal placeholder: you can add PDF generation wiring here
  const btn = document.querySelector('[data-next="invest"]');
  if (btn) btn.onclick = () => (window.location.href = 'invest.html');

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 5 of 6';
}

function initInvest() {
  // Payhip embeds already in HTML -> no JS needed beyond step
  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 6 of 6';
}

// ---- Router ----
document.addEventListener('DOMContentLoaded', () => {
  const path = (location.pathname || '').toLowerCase();

  // endsWith is resilient to subpaths (e.g., /app/categories.html)
  if (path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html')) return void initWelcome();
  if (path.endsWith('categories.html')) return void initCategories();
  if (path.endsWith('traits.html')) return void initTraits();
  if (path.endsWith('roles.html')) return void initRoles();
  if (path.endsWith('reveal.html')) return void initReveal();
  if (path.endsWith('invest.html')) return void initInvest();

  // Fallback: assume welcome
  initWelcome();
});
