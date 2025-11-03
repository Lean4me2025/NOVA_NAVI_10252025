// app.js — page router + tiny helpers
(function () {
  function onReady(fn){ if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  onReady(async () => {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    // Shared: ensure DataLoader available
    window.NOVA = window.NOVA || {};
    if (!window.NOVA.DataLoader) {
      console.error("DataLoader missing");
      return;
    }

    if (path.includes("categories.html")) {
      await window.NOVA.DataLoader.loadAll();
      const cats = window.NOVA.DataLoader.getCategories();
      window.NOVA.CategoryFlow.renderCategories(cats);
      return;
    }

    if (path.includes("traits.html")) {
      await window.NOVA.TraitsFlow.init();
      return;
    }

    if (path.includes("roles.html")) {
      await window.NOVA.ResultsRenderer.init();
      return;
    }

    // Reveal: simple echo of selections
    if (path.includes("reveal.html")) {
      const chosenCats = JSON.parse(sessionStorage.getItem("nova.selectedCategories") || "[]");
      const chosenTraits = JSON.parse(sessionStorage.getItem("nova.selectedTraits") || "[]");
      await window.NOVA.DataLoader.loadAll();
      const cats = window.NOVA.DataLoader.getCategories().filter(c => chosenCats.includes(c.id)).map(c => c.name);
      document.getElementById("revealFocus").textContent = cats.join(" + ") || "—";
      document.getElementById("revealTraits").textContent = chosenTraits.length ? (chosenTraits.join(", ")) : "—";
      const investBtn = document.getElementById("toInvest");
      if (investBtn) investBtn.addEventListener("click", () => location.href = "invest.html");
      const backBtn = document.getElementById("revealBack");
      if (backBtn) backBtn.addEventListener("click", () => history.back());
      return;
    }
  });
})();
