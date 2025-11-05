// DataLoader.js — tiny, global helpers (no page logic)
window.NOVA = window.NOVA || {};

(function () {
  const NOVA = window.NOVA;

  NOVA.keys = {
    cats:  'nova.categories',
    traits:'nova.traits'
  };

  NOVA.loadJSON = async function (url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  };

  NOVA.save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  NOVA.read = (k, d=[]) => {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }
    catch { return d; }
  };

  NOVA.q = (sel) => document.querySelector(sel);
  NOVA.mount = (...sels) => sels.map(s => document.querySelector(s)).find(Boolean);

  // Utility: enable/disable button by min count
  NOVA.enableWhen = (btn, getCount, min=1) => {
    const tick = () => {
      const ok = getCount() >= min;
      btn.disabled = !ok;
      btn.classList.toggle('enabled', ok);
    };
    return tick;
  };
})();
