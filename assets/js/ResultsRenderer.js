// ResultsRenderer.js — owns Roles page (filters roles by selected traits)
(function () {
  const { NOVA } = window;
  if (!NOVA) return;

  const mount = NOVA.mount('#roles', '[data-page="roles"]', '#results', '[data-page="results"]');
  if (!mount) return; // not on this page

  const header = document.createElement('div');
  header.className = 'top';
  const cats = NOVA.read(NOVA.keys.cats, []);
  const traits = NOVA.read(NOVA.keys.traits, []);
  header.innerHTML = `Focus: <strong>${cats.join(', ') || '—'}</strong> • Traits selected: <strong>${traits.length}</strong>`;
  mount.appendChild(header);

  const list = document.createElement('section');
  list.className = 'grid';
  mount.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <button id="toReflection" class="btn">Continue → Reflection</button>
    <a href="traits.html">Back to Traits</a>
  `;
  mount.appendChild(footer);

  function scoreRole(role, picked) {
    // basic match count
    const have = new Set(picked);
    return (role.matchTraits || []).reduce((s, t) => s + (have.has(t) ? 1 : 0), 0);
  }

  function card(role) {
    const div = document.createElement('article');
    div.className = 'card';
    const m = role.match || 0;
    div.innerHTML = `
      <div class="name">${role.title}</div>
      <div class="desc">
        ${role.why ? `<div><strong>Why this fits:</strong> ${role.why}</div>` : ''}
        ${role.outlook ? `<div><strong>Outlook:</strong> ${role.outlook}</div>` : ''}
        ${role.salary ? `<div><strong>Salary band:</strong> ${role.salary}</div>` : ''}
        <div><strong>Match:</strong> ${m} trait${m===1?'':'s'}</div>
        ${role.next ? `<div class="desc"><em>Next step:</em> ${role.next}</div>` : ''}
      </div>
    `;
    return div;
  }

  async function init() {
    if (!traits.length) {
      const msg = document.createElement('div');
      msg.className = 'empty';
      msg.innerHTML = `No traits selected. <a href="traits.html">Pick at least 5 traits</a> to see roles.`;
      mount.insertBefore(msg, list);
      return;
    }

    try {
      const roles = await NOVA.loadJSON('./assets/data/roles.json');
      const scored = roles
        .map(r => ({ ...r, match: scoreRole(r, traits) }))
        .filter(r => r.match > 0)
        .sort((a,b) => b.match - a.match)
        .slice(0, 12);

      if (!scored.length) {
        const msg = document.createElement('div');
        msg.className = 'empty';
        msg.textContent = 'No roles matched your current traits. Try adjusting your picks.';
        mount.insertBefore(msg, list);
        return;
      }
      list.innerHTML = '';
      scored.forEach(r => list.appendChild(card(r)));
    } catch (e) {
      console.error('roles.json load failed', e);
      const msg = document.createElement('div');
      msg.className = 'empty';
      msg.textContent = `Couldn’t load roles (check /assets/data/roles.json).`;
      mount.insertBefore(msg, list);
    }
  }

  footer.querySelector('#toReflection').addEventListener('click', () => {
    window.location.href = 'reflection.html';
  });

  init();
})();
