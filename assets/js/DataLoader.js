<script>
window.NOVA = window.NOVA || { state:{ selectedCategories:[], selectedTraits:[] }, data:{} };

(function(){
  const BASE = './'; // IMPORTANT: use relative paths for GitHub Pages
  async function getJSON(path){
    const url = BASE + path + '?v=' + Date.now(); // cache-bust to avoid stale JSON
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    return res.json();
  }
  async function loadAll(){
    const [categories, traits, roles] = await Promise.all([
      getJSON('data/categories.json'),
      getJSON('data/traits_with_categories.json'),
      getJSON('data/roles_400.json')
    ]);
    NOVA.data.categories = categories;          // [{id,name,...}]
    NOVA.data.traits = traits;                  // [{id,name,categories:[id,...], ...}]
    NOVA.data.roles = roles;                    // [{id,title,categories:[id...], traits:[id...] }]
    return NOVA.data;
  }
  window.NOVA.loadAll = loadAll;
})();
</script>
