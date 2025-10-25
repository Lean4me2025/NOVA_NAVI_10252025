import { getJSON, state, log, $, $$, toggleSelect } from './app.js';

(async function init(){
  const MIN = 3, MAX = 7;
  const cats = state.categories || [];
  if (!cats.length){ window.location.replace('categories.html'); return; }

  const map = await getJSON('data/traits_with_categories.json'); // { Category: ["Trait A","Trait B", ...], ... }
  const traitSet = new Set();
  cats.forEach(c => (map[c]||[]).forEach(t => traitSet.add(t)));
  const traits = [...traitSet].sort();

  const listEl = $('#traitList');
  const toRoles = $('#toRoles');
  const chosen = new Set(state.traits || []);

  // Render
  listEl.innerHTML = traits.map(t => `
    <div class="tile ${chosen.has(t) ? 'selected':''}" data-id="${t}" role="button" tabindex="0">
      <div class="badge">Trait</div>
      <div><h3>${t}</h3></div>
    </div>
  `).join('');

  const evaluate = ()=>{
    const count = chosen.size;
    toRoles.disabled = !(count>=MIN && count<=MAX);
  };

  // Interactions
  $$('.tile', listEl).forEach(tile=>{
    tile.addEventListener('click', ()=>{
      const id = tile.dataset.id;
      if (chosen.has(id)){ chosen.delete(id); tile.classList.remove('selected'); }
      else{
        if (chosen.size>=MAX) return; // cap
        chosen.add(id); tile.classList.add('selected');
      }
      evaluate();
    });
  });

  evaluate();

  toRoles.onclick = ()=>{
    state.traits = [...chosen];
    window.location.href = 'roles.html';
  };

  log('Traits loaded for categories:', cats);
})().catch(err=>{ console.error(err); alert('Failed to load traits.'); });
