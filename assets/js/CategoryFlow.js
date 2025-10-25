import { getJSON, state, log, $, $$, toggleSelect } from './app.js';

(async function init(){
  const MAX = 3;
  const listEl = $('#catList');
  const nextBtn = $('#next');

  const categories = await getJSON('data/categories.json'); // ["Business","Healthcare",...]
  const chosen = state.categories || [];

  // Render
  listEl.innerHTML = categories.map(c => `
    <div class="tile ${chosen.includes(c) ? 'selected':''}" data-id="${c}" role="button" tabindex="0">
      <div class="badge">Category</div>
      <div><h3>${c}</h3><p>Tap to select</p></div>
    </div>
  `).join('');

  // Interactions
  $$('.tile', listEl).forEach(tile=>{
    tile.addEventListener('click', ()=>{
      const set = [...(state.categories||[])];
      const updated = toggleSelect(tile, set, MAX);
      if (updated){ state.categories = updated; }
      nextBtn.disabled = (state.categories.length===0);
    });
  });

  // Carry forward
  nextBtn.onclick = ()=>{
    if (!state.categories.length){ return; }
    state.traits = []; // reset downstream
    window.location.href = 'traits.html';
  };

  // enable if preselected
  nextBtn.disabled = (state.categories.length===0);
  log('Categories loaded:', categories.length);
})().catch(err=>{ console.error(err); alert('Failed to load categories.'); });
