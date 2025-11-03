// DataLoader.js — central place to fetch NOVA data
(function () {
  const BASE = "assets/data/";

  async function fetchJSON(name) {
    const res = await fetch(BASE + name, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`);
    return res.json();
  }

  // Cache in-memory for this session
  const cache = {
    categories: null,
    roles: null,
    matrix: null, // traits_with_categories.json
    nova: null    // nova_data.json (optional merged source)
  };

  async function loadAll() {
    // Support either split files or merged nova_data.json
    const [categoriesMaybe, matrixMaybe, rolesMaybe] = await Promise.allSettled([
      fetchJSON("categories.json"),
      fetchJSON("traits_with_categories.json"),
      fetchJSON("roles_400.json"),
    ]);

    if (categoriesMaybe.status === "fulfilled") cache.categories = categoriesMaybe.value;
    if (matrixMaybe.status === "fulfilled") cache.matrix = matrixMaybe.value;
    if (rolesMaybe.status === "fulfilled") cache.roles = rolesMaybe.value;

    // Fallback/merge source
    try {
      cache.nova = await fetchJSON("nova_data.json");
      if (!cache.categories && cache.nova?.categories) cache.categories = cache.nova.categories;
      if (!cache.matrix && cache.nova?.traits) {
        // Convert simple traits list into grouped-by-category structure
        const grouped = {};
        (cache.nova.traits || []).forEach(t => {
          grouped[t.categoryId] = grouped[t.categoryId] || [];
          grouped[t.categoryId].push({
            id: t.id,
            name: t.name,
            desc: t.desc || ""
          });
        });
        cache.matrix = grouped;
      }
    } catch (_) { /* optional */ }
  }

  function getCategories() {
    // categories.json may be array of strings or objects
    if (!cache.categories) return [];
    return cache.categories.map(c => {
      if (typeof c === "string") {
        return { id: c.toLowerCase().replace(/\s+/g, "-"), group: "", name: c, summary: "" };
      }
      return c;
    });
  }

  function getTraitsForCategoryIds(catIds) {
    if (!cache.matrix) return [];
    // matrix is expected as: { [categoryId]: Trait[] } OR array with categoryId on each
    if (Array.isArray(cache.matrix)) {
      return cache.matrix.filter(t => catIds.includes(t.categoryId)).map(t => ({
        id: t.id, name: t.name || t.title || t.trait || "Trait", desc: t.desc || t.description || ""
      }));
    } else {
      // object keyed by categoryId
      const out = [];
      catIds.forEach(id => {
        (cache.matrix[id] || []).forEach(t => {
          out.push({
            id: t.id, name: t.name || t.title || "Trait", desc: t.desc || ""
          });
        });
      });
      return out;
    }
  }

  function getRoles() {
    return Array.isArray(cache.roles) ? cache.roles : [];
  }

  window.NOVA = window.NOVA || {};
  window.NOVA.DataLoader = { loadAll, getCategories, getTraitsForCategoryIds, getRoles };
})();
