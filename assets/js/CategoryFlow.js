<script>
window.CategoryFlow = (function(){
  const MAX = 999; // no hard cap now
  function render(){
    const wrap = document.getElementById('categoriesContainer');
    const list = NOVA.data.categories || [];
    wrap.innerHTML = '';
    const sel = NOVA.state.selectedCategories || [];
    list.forEach(cat=>{
      const chip = document.createElement('button');
      chip.type='button';
      chip.className='nv-chip' + (sel.includes(cat.id)?' active':'');
      chip.innerHTML = `<strong>${cat.name}</strong>${cat.desc?`<small>${cat.desc}</small>`:''}`;
      chip.onclick = ()=>toggle(cat.id);
      wrap.appendChild(chip);
    });
    updateNext();
  }
  function toggle(id){
    const sel = NOVA.state.selectedCategories;
    const i = sel.indexOf(id);
    if(i>=0) sel.splice(i,1);
    else if(sel.length<MAX) sel.push(id);
    NOVA.saveState();
    render();
  }
  function updateNext(){
    const btn = document.getElementById('toTraits');
    const ok = (NOVA.state.selectedCategories||[]).length>0;
    if(btn) btn.toggleAttribute('disabled', !ok);
  }
  async function init(){
    await NOVA.loadAll(); NOVA.loadState(); render();
  }
  return { init };
})();
</script>
