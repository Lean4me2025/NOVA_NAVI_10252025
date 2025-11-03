// ResultsRenderer.js — compute role matches & render
(function () {
  const TRAIT_KEY = "nova.selectedTraits";

  function loadTraits() { try { return JSON.parse(sessionStorage.getItem(TRAIT_KEY)) || []; } catch { return []; } }

  function scoreRoles(roles, chosenTraitIds) {
    const chosen = new Set(chosenTraitIds);
    const chosenCount = Math.max(1, chosen.size);
    return roles.map(r => {
      // Expect r.traits is array of trait ids; tolerate names too
      const ids = (r.traits || []).map(x => (typeof x === "string" ? x : x.id)).filter(Boolean);
      let matches = 0;
      ids.forEach(id => { if (chosen.has(id)) matches += 1; });
      const fit = Math.round((matches / chosenCount) * 100);
      return { ...r, _matches: matches, _fit: isFinite(fit) ? fit : 0 };
    }).sort((a, b) => b._fit - a._fit || b._matches - a._matches);
  }

  function renderRoles(scored) {
    const grid = document.getElementById("rolesGrid");
    const btn = document.getElementById("continueRoles");
    const edit = document.getElementById("editTraits");

    grid.innerHTML = "";
    scored.forEach(r => {
      const card = document.createElement("div");
      card.className = "tile";
      const outlook = r.outlook || r.Outlook || "—";
      const salary  = r.salary  || r.Salary  || "—";
      const desc    = r.desc || r.description || r.summary || "";
      const fitChip = r._fit >= 60 ? `Great — ${r._fit}%` : r._fit >= 30 ? `Consider — ${r._fit}%` : `Explore — ${r._fit}%`;

      card.innerHTML = `
        <div class="title">${r.title || r.name || "Role"}</div>
        <div class="chips">
          <span class="chip">Outlook: ${outlook}</span>
          <span class="chip">Salary: ${salary}</span>
          <span class="chip">${fitChip}</span>
        </div>
        <div class="sub">${desc}</div>
      `;
      grid.appendChild(card);
    });

    btn.addEventListener("click", () => { window.location.href = "reveal.html"; });
    if (edit) edit.addEventListener("click", () => { window.location.href = "traits.html"; });
  }

  async function init() {
    const chosen = loadTraits();
    if (!chosen.length) { window.location.href = "traits.html"; return; }
    await window.NOVA.DataLoader.loadAll();
    const roles = window.NOVA.DataLoader.getRoles();
    renderRoles(scoreRoles(roles, chosen));
  }

  window.NOVA = window.NOVA || {};
  window.NOVA.ResultsRenderer = { init };
})();
