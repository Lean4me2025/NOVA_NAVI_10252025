<script>
window.NOVA = window.NOVA || { state:{selectedCategories:[],selectedTraits:[],email:"",pin:""}, data:{} };

(function(){
  const BASE = './'; // important for GitHub Pages

  function saveState(){
    try{ localStorage.setItem('NOVA_STATE', JSON.stringify(NOVA.state)); }catch(e){}
  }
  function loadState(){
    try{
      const raw = localStorage.getItem('NOVA_STATE');
      if(raw){ NOVA.state = Object.assign(NOVA.state, JSON.parse(raw)); }
    }catch(e){}
  }
  function clearState(){ localStorage.removeItem('NOVA_STATE'); }

  async function getJSON(path){
    const url = BASE + path + '?v=' + Date.now(); // cache-bust
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    return res.json();
  }
  async function loadAll(){
    if(NOVA.data.__loaded) return NOVA.data;
    const [categories, traits, roles] = await Promise.all([
      getJSON('data/categories.json'),
      getJSON('data/traits_with_categories.json'),
      getJSON('data/roles_400.json')
    ]);
    NOVA.data = { categories, traits, roles, __loaded:true };
    return NOVA.data;
  }

  window.NOVA.saveState = saveState;
  window.NOVA.loadState = loadState;
  window.NOVA.clearState = clearState;
  window.NOVA.loadAll = loadAll;
})();
</script>
