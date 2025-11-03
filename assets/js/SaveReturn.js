// CategoryFlow.js — multi-select up to 2 categories
(function () {
  const SEL_KEY = "nova.selectedCategories"; // stores array of category ids

  function saveSelected(ids) { sessionStorage.setItem(SEL_KEY, JSON.stringify(ids)); }
  function loadSelected() {
    try { return JSON.parse(sessionStorage.getItem(SEL_KEY)) || []; }
    catch { return []; }
  }

  function renderCategories(categories) {
    const grid = document.getElementById("categoryGrid");
    const counter = document.getElementById("catCount");
    const btn = document.getElementById("continueCategories");
    const selected = new Set(loadSelected());

    grid.innerHTML = "";
    categories.forEach(c => {
      const card = document.createElement("button");
      card.className = "tile";
      card.innerHTML = `
        <div class="kicker">${c.group || ""}</div>
        <div class="title">${c.name}</div>
        <div class="sub">${c.summary || ""}</div>
      `;
      card.setAttribute("data-id", c.id);
      if (selected.has(c.id)) card.classList.add("selected");
      card.addEventListener("click", () => {
        if (selected.has(c.id)) {
          selected.delete(c.id);
          card.classList.remove("selected");
        } else {
          if (selected.size >= 2) return; // cap at 2
          selected.add(c.id);
          card.classList.add("selected");
        }
        counter.textContent = String(selected.size);
        btn.disabled = selected.size === 0;
      });
      grid.appendChild(card);
    });

    counter.textContent = String(selected.size);
    btn.disabled = selected.size === 0;
    btn.addEventListener("click", () => {
      saveSelected([...selected]);
      window.location.href = "traits.html";
    });

    const reset = document.getElementById("resetAll");
    if (reset) reset.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "categories.html";
    });
  }

  window.NOVA = window.NOVA || {};
  window.NOVA.CategoryFlow = { renderCategories };
})();
