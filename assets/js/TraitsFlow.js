<script>
window.TraitsFlow = (function(){
  function filteredTraits(){
    const s = new Set(NOVA.state.selectedCategories||[]);
    const all = NOVA.data.traits || [];
    if(s.size===0) return [];
    return all.filter(t => (t.categories||t.categoryIds||[]).some(id=>s.has(id)));
  }
  function render(){
    const wrap = document.getElementById('traitsContainer');
    wrap.innerHTML='';
    const sel = new Set(NOVA.state.selectedTraits||[]);
    filteredTraits().forEach(tr=>{
      const chip=document.createElement('button');
      chip.type='button';
      chip.className='nv-chip'+(sel.has(tr.id)?' active':'');
      chip.innerHTML=`<strong>${tr.name}</strong>${tr.desc?`<small>${tr.desc}</small>`:''}`;
      chip.onclick=()=>toggle(tr.id);
      wrap.appendChild(chip);
    });
    updateNext();
  }
  function toggle(id){
    const sel = NOVA.state.selectedTraits;
    const i = sel.indexOf(id);
    if(i>=0) sel.splice(i,1); else sel.push(id);
    NOVA.saveState(); render();
  }
  function updateNext(){
    const btn=document.getElementById('toRoles');
    const ok=(NOVA.state.selectedTraits||[]).length>0;
    if(btn) btn.toggleAttribute('disabled', !ok);
  }
  async function init(){ await NOVA.loadAll(); NOVA.loadState(); render(); }
  return { init };
})();
</script>
