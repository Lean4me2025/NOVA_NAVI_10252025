// SaveReturn.js — auto injects a small "Save & return later" control
(function () {
  window.NOVA = window.NOVA || {};
  const NOVA = window.NOVA;

  // helper (in case DataLoader isn't loaded for some reason)
  NOVA.read = NOVA.read || ((k, d=[]) => {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; }
  });
  NOVA.keys = NOVA.keys || { cats:'nova.categories', traits:'nova.traits' };

  function inject(target) {
    if (!target) return;
    // prevent duplicates
    if (target.querySelector('#saveReturn')) return;

    const bar = document.createElement('div');
    bar.style.margin = '10px 0 24px';
    bar.innerHTML = `
      <button id="saveReturn" type="button"
        style="background:none;border:0;color:#0e6e6c;cursor:pointer;
               text-decoration:underline;font-weight:600;padding:0">
        Save & return later
      </button>
    `;
    target.appendChild(bar);

    const btn = bar.querySelector('#saveReturn');
    btn.addEventListener('click', () => {
      const payload = {
        cats: NOVA.read(NOVA.keys.cats, []),
        traits: NOVA.read(NOVA.keys.traits, []),
        when: new Date().toISOString()
      };
      localStorage.setItem('nova.resume', JSON.stringify(payload));
      alert('Progress saved on this device. You can come back later.');
      console.log('[NOVA] resume state:', payload);
    });
  }

  // Try common mounts; add under whatever page we're on
  const mount =
    document.querySelector('#categories,[data-page="categories"]') ||
    document.querySelector('#traits,[data-page="traits"]') ||
    document.querySelector('#roles,[data-page="roles"]');

  inject(mount);
})();
