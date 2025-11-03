// ===== Nova unified app.js (Build 9.0 for /assets layout) =====

// Cache-buster to avoid stale JSON
const CACHE_BUST = `?v=${Date.now()}`;

// JSON loader — checks all common relative paths
async function loadJSON(file) {
  const candidates = [
    `/assets/data/${file}${CACHE_BUST}`,
    `./assets/data/${file}${CACHE_BUST}`,
    `assets/data/${file}${CACHE_BUST}`
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
  }
  throw new Error(`Failed to load ${file}. Verify /assets/data path and filename.`);
}

// Small inline error helper
function showInlineError(targetSelector, message) {
  const host = document.querySelector(targetSelector) || document.body;
  const el = document.createElement('div');
  el.style.cssText =
    'margin:16px;padding:12px;border:1px solid #e33;background:#fff5f5;color:#900;border-radius:8px;font-size:14px;';
  el.textContent = message;
  host.prepend(el);
}

// ---- PAGE-LEVEL INITS ----
async function initWelcome() {
  const btn = document.querySelector('[data-intro-audio]');
  if (btn) {
    const audio = new Audio('/assets/audio/intro.mp3');
    btn.addEventListener('click', () => audio.play());
  }
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
    showInlineError('#categoryGrid', 'We couldn’t load categories. Please refresh.');
    return;
  }

  const grid = document.querySelector('#categoryGrid');
  if (!grid) return console.error('Missing #categoryGrid container.');

  grid.innerHTML = '';
  data.forEach(cat => {
    const card = document.createElement('button');
    card.className = 'category-card';
    card.type = 'button';
    card.dataset.categoryId = cat.id;
    card.innerHTML = `
      <div class="cat-title">${cat.name}</div>
      <div class="cat-sub">${cat.subtitle || ''}</div>
    `;
    card.onclick = () => {
      try {
        localStorage.setItem('nova.selectedCategoryId', String(cat.id));
      } catch (_) {}
      window.location.href = 'traits.html';
    };
    grid.appendChild(card);
  });

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 2 of 6';
}

async function initTraits() {
  const selectedId = localStorage.getItem('nova.selectedCategoryId');
  if (!selectedId) return (window.location.href = 'categories.html');

  let data;
  try {
    data = await loadJSON('traits_with_categories.json');
    if (!Array.isArray(data)) throw new Error('traits_with_categories.json did not return an array.');
  } catch (err) {
    console.error(err);
    showInlineError('#traitsGrid', 'Couldn’t load traits.');
    return;
  }

  const traits = data.filter(t => String(t.categoryId) === String(selectedId));
  const grid = document.querySelector('#traitsGrid');
  if (!grid) return console.error('Missing #traitsGrid.');

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

  const next = document.querySelector('[data-next="roles"]');
  if (next)
    next.onclick = () => {
      const checked = [...grid.querySelectorAll('input:checked')].map(i => i.value);
      try {
        localStorage.setItem('nova.selectedTraitIds', JSON.stringify(checked));
      } catch (_) {}
      window.location.href = 'roles.html';
    };

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 3 of 6';
}

async function initRoles() {
  let roles;
  try {
    roles = await loadJSON('roles_400.json');
    if (!Array.isArray(roles)) throw new Error('roles_400.json did not return an array.');
  } catch (err) {
    console.error(err);
    showInlineError('#rolesGrid', 'Couldn’t load roles.');
    return;
  }

  const selectedTraits = JSON.parse(localStorage.getItem('nova.selectedTraitIds') || '[]');
  const scored = roles
    .map(r => {
      const overlap = (r.traitIds || []).filter(id => selectedTraits.includes(String(id))).length;
      return { ...r, score: overlap };
    })
    .sort((a, b) => b.score - a.score);

  const grid = document.querySelector('#rolesGrid');
  if (!grid) return console.error('Missing #rolesGrid.');

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
      try {
        localStorage.setItem('nova.selectedRoleId', String(role.id));
      } catch (_) {}
      window.location.href = 'reveal.html';
    };
    grid.appendChild(card);
  });

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 4 of 6';
}

function initReveal() {
  const btn = document.querySelector('[data-next="invest"]');
  if (btn) btn.onclick = () => (window.location.href = 'invest.html');

  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 5 of 6';
}

function initInvest() {
  const step = document.querySelector('[data-progress]');
  if (step) step.textContent = 'Step 6 of 6';
}

// ---- ROUTER ----
document.addEventListener('DOMContentLoaded', () => {
  const p = (location.pathname || '').toLowerCase().replace(/[?#].*$/, '');
  const is = name =>
    p.endsWith(`/${name}`) || p.endsWith(`/${name}.html`) || p.includes(`/${name}/`);

  if (is('') || is('index')) return void initWelcome();
  if (is('categories')) return void initCategories();
  if (is('traits')) return void initTraits();
  if (is('roles')) return void initRoles();
  if (is('reveal')) return void initReveal();
  if (is('invest')) return void initInvest();

  initWelcome();
});

// ---- GLOBAL SHIMS ----
window.initCategories = initCategories;
window.renderCategories = initCategories; // backward compatibility
window.initTraits = initTraits;
window.initRoles = initRoles;
window.initReveal = initReveal;
window.initInvest = initInvest;
