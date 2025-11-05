// traits.js — owns Traits page (replaces old TraitsFlow.js)
(function () {
  const { NOVA } = window;
  if (!NOVA) return;

  const mount = NOVA.mount('#traits', '[data-page="traits"]');
  if (!mount) return; // not on this page

  const header = document.createElement('div');
  header.className = 'top';
  header.innerHTML = `Focus: <span class="count" id="focusLine">—</span> • Selected: <span id="selCount">0</span>`;
  mount.appendChild(header);

  const grid = document.createElement('section');
  grid.className = 'grid';
  mount.appendChild(grid);

  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <button id="goRoles" class="btn" disabled>Continue → Roles</button>
    <a href="categories.html">Reset</a>
  `;
  mount.appendChild(footer);

  const cats = NOVA.read(NOVA.keys.cats, []);
  const focusLine = header.querySelector('#focusLine');
  focusLine.textContent = cats.length ? cats.join(', ') : '—';

  if (!cats.length) {
    const msg = document.createElement('div');
    msg.className = 'empty';
    msg.innerHTML = `No categories selected. <a href="categories.html">Choose categories</a> so we can load matching traits.`;
    mount.insertBefore(msg, grid);
    return;
  }

  const picked = new Set(NOVA.read(NOVA.keys.traits, []));
  const countEl = header.querySelector('#selCount');
  const btn = footer.querySelector('#goRoles');

  const tick = () => {
    countEl.textContent = String(picked.size);
    const ok = picked.size >= 5;
    btn.disabled = !ok;
    btn.classList.toggle('enabled', ok);
  };

  function render(traits) {
    grid.innerHTML = '';
    traits.forEach(t => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.id = t.id;
      chip.textContent = t.name;
      if (picked.has(t.id)) chip.classList.add('active');

      chip.addEventListener('click', () => {
        if (picked.has(t.id)) picked.delete(t.id); else picked.add(t.id);
        chip.classList.toggle('active');
        NOVA.save(NOVA.keys.traits, Array.from(picked));
        tick();
      });

      grid.appendChild(chip);
    });
    tick();
  }

  async function init() {
    try {
      const all = await NOVA.loadJSON('./assets/data/traits.json');
      const list = (all || []).filter(t => cats.includes(String(t.category)));
      if (!list.length) {
        const msg = document.createElement('div');
        msg.className = 'empty';
        msg.textContent = 'No traits found for your selected categories.';
        mount.insertBefore(msg, grid);
      } else {
        render(list);
      }
    } catch (e) {
      console.error('traits.json load failed', e);
      const msg = document.createElement('div');
      msg.className = 'empty';
      msg.textContent = `Couldn’t load traits (check /assets/data/traits.json).`;
      mount.insertBefore(msg, grid);
    }
  }

  btn.addEventListener('click', () => {
    NOVA.save(NOVA.keys.traits, Array.from(picked));
    window.location.href = 'roles.html';
  });

  init();
})();
