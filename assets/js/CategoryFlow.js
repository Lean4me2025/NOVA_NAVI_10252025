// CategoryFlow.js — owns Categories page (no other pages)
(function () {
  const { NOVA } = window;
  if (!NOVA) return;

  const mount = NOVA.mount('#categories', '[data-page="categories"]', '#category', '[data-page="category"]');
  if (!mount) return; // not on this page

  const UI = document.createElement('section');
  UI.className = 'grid';
  mount.appendChild(UI);

  const footer = document.createElement('div');
  footer.className = 'actions';
  footer.innerHTML = `
    <button id="toTraits" class="btn" disabled>Continue → Traits</button>
  `;
  mount.appendChild(footer);

  const btn = footer.querySelector('#toTraits');
  const picked = new Set(NOVA.read(NOVA.keys.cats, [])); // restore if present

  const tick = NOVA.enableWhen(btn, () => picked.size, 1);

  function render(categories) {
    UI.innerHTML = '';
    categories.forEach(c => {
      const card = document.createElement('label');
      card.className = 'card';
      card.innerHTML = `
        <input type="checkbox" value="${c.id}" ${picked.has(c.id) ? 'checked' : ''} />
        <div>
          <div class="name">${c.name}</div>
          ${c.desc ? `<div class="desc">${c.desc}</div>` : ''}
        </div>`;
      const box = card.querySelector('input');
      box.addEventListener('change', () => {
        box.checked ? picked.add(c.id) : picked.delete(c.id);
        NOVA.save(NOVA.keys.cats, Array.from(picked));
        tick();
      });
      UI.appendChild(card);
    });
    tick();
  }

  async function init() {
    try {
      const cats = await NOVA.loadJSON('./assets/data/categories.json');
      render(cats);
    } catch (e) {
      console.error('categories.json load failed', e);
      // minimal fallback
      render([
        { id:'mind',  name:'Mind'  },
        { id:'heart', name:'Heart' },
        { id:'drive', name:'Drive' },
        { id:'spirit',name:'Spirit'}
      ]);
    }
  }

  btn.addEventListener('click', () => {
    NOVA.save(NOVA.keys.cats, Array.from(picked));
    window.location.href = 'traits.html';
  });

  init();
})();
