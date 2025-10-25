<script>
window.ResultsRenderer = (function(){
  function scoreRole(r){
    const sCats = new Set(NOVA.state.selectedCategories||[]);
    const sTraits = new Set(NOVA.state.selectedTraits||[]);
    const catHits = (r.categories||[]).filter(c=>sCats.has(c)).length;
    const traitHits = (r.traits||[]).filter(t=>sTraits.has(t)).length;
    return (catHits*2) + (traitHits*3); // weight traits a bit higher
  }
  function getMatches(){
    const roles = NOVA.data.roles||[];
    return roles
      .map(r=>({role:r,score:scoreRole(r)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,30);
  }
  function pillList(arr,label){
    if(!arr||!arr.length) return '';
    return `<div class="small kicker">${label}</div>`+
      `<div>${arr.map(v=>`<span class="badge">${v}</span>`).join('')}</div>`;
  }
  function render(){
    const list = getMatches();
    const out = document.getElementById('rolesContainer');
    const none = document.getElementById('noMatches');
    out.innerHTML='';
    if(list.length===0){ none.style.display='block'; return; }
    none.style.display='none';
    list.forEach(({role,score})=>{
      const el = document.createElement('article'); el.className='role';
      const cats = (role.categoryNames||role.categories||[]).map(x=>String(x));
      const trs = (role.traitNames||role.traits||[]).map(x=>String(x));
      el.innerHTML = `
        <h3>${role.title||'Role'}</h3>
        <div class="small">Match score: ${score}</div>
        ${pillList(cats,'Categories')}
        ${pillList(trs,'Traits')}
        ${role.summary?`<p class="kicker">${role.summary}</p>`:''}
      `;
      out.appendChild(el);
    });
  }
  async function init(){ await NOVA.loadAll(); NOVA.loadState(); render(); }
  return { init };
})();
</script>
