// SaveReturn.js — optional “save & return” helpers (no page ownership)
(function () {
  const { NOVA } = window;
  if (!NOVA) return;

  // Expose simple resume link builder
  NOVA.buildResumeState = function () {
    const cats = NOVA.read(NOVA.keys.cats, []);
    const traits = NOVA.read(NOVA.keys.traits, []);
    return { cats, traits, when: new Date().toISOString() };
  };

  // Example: attach to any "Save & Return" button by id
  const btn = document.getElementById('saveReturn');
  if (btn) {
    btn.addEventListener('click', () => {
      const state = NOVA.buildResumeState();
      localStorage.setItem('nova.resume', JSON.stringify(state));
      alert('Progress saved. You can return later from this device.');
    });
  }
})();
