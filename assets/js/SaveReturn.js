import { state, $, log } from './app.js';

(function init(){
  const form = $('#saveForm');
  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = (document.getElementById('email')||{}).value?.trim();
    const pin   = (document.getElementById('pin')||{}).value?.trim();
    if (!email || !pin) return;

    state.saveIdentity(email, pin);

    // Persist the last journey snapshot for this identity
    const snapshot = {
      ts: Date.now(),
      categories: state.categories || [],
      traits: state.traits || []
    };
    localStorage.setItem(`nova:${email}`, JSON.stringify(snapshot));

    alert('Saved! You can return to your results anytime.');
    log('Saved identity and snapshot', snapshot);
  });
})();
