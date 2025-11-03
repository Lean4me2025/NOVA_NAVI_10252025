// TraitsFlow.js — choose >=5 traits from selected categories
(function () {
  const CAT_KEY = "nova.selectedCategories";
  const TRAIT_KEY = "nova.selectedTraits";

  function loadCatIds() { try { return JSON.parse(sessionStorage.getItem(CAT_KEY)) || []; } catch { return []; } }
  function saveTraits(ids) { sessionStorage.setItem(TRAIT_KEY, JSON.stringify(ids)); }
  function loadTraits() { try { return JSON.parse(sessionStorage.getItem(TRAIT_KEY)) || []; } catch { return []; } }

  function renderTraits(traits, categoryNames) {
    const titleCat = document.getElementById("selectedCategoryNames");
    if (titleCat) titleCat.textContent = categoryNames.join(" + ");

    const grid = document.getElementById("traitGrid");
    const counter = document.getElementById("traitCount");
    const btn = document.getElementById("continueTraits");
    const back = document.getElementById("backToCategories");
    const selected = new Set(loadTraits());

    grid.innerHTML = "";
    traits.forEach(t => {
      const card = document.createElement("button");
      card.className = "tile";
      card.innerHTML = `
        <div class="title">${t.name}</div>
        <div class="sub">${t.desc || ""}</div>
      `;
      card.setAttribute("data-id", t.id);
      if (selected.has(t.id)) card.classList.add("selected");
      card.addEventListener("click", () => {
        if (selected.has(t.id)) { selected.delete(t.id); card.classList.remove("selected"); }
        else { selected.add(t.id); card.classList.add("selected"); }
        counter.textContent = String(selected.size);
        btn.disabled = selected.size < 5;
      });
      grid.appendChild(card);
    });

    counter.textContent = String(selected.size);
    btn.disabled = selected.size < 5;

    btn.addEventListener("click", () => {
      if (selected.size < 5) return;
      saveTraits([...selected]);
      window.location.href = "roles.html";
    });

    if (back) back.addEventListener("click", () => {
      window.location.href = "categories.html";
    });
  }

  async function init() {
    const catIds = loadCatIds();
    if (!catIds.length) { window.location.href = "categories.html"; return; }
    await window.NOVA.DataLoader.loadAll();
    const categories = window.NOVA.DataLoader.getCategories();
    const catNames = categories.filter(c => catIds.includes(c.id)).map(c => c.name);
    const traits = window.NOVA.DataLoader.getTraitsForCategoryIds(catIds);
    renderTraits(traits, catNames);
  }

  window.NOVA = window.NOVA || {};
  window.NOVA.TraitsFlow = { init };
})();
