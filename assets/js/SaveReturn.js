<script>
window.SaveReturn = (function(){
  function render(){
    const email = document.getElementById('email');
    const pin = document.getElementById('pin');
    email.value = NOVA.state.email||'';
    pin.value = NOVA.state.pin||'';
  }
  function save(){
    const email = (document.getElementById('email').value||'').trim();
    const pin = (document.getElementById('pin').value||'').trim();
    NOVA.state.email=email; NOVA.state.pin=pin;
    NOVA.saveState();
    const msg = document.getElementById('savedMsg');
    msg.textContent='Saved. You can return later using this device.';
    setTimeout(()=>msg.textContent='',3000);
  }
  function resetAll(){
    NOVA.clearState(); location.href='./index.html';
  }
  async function init(){ await NOVA.loadAll(); NOVA.loadState(); render();
    document.getElementById('saveBtn').onclick=save;
    const reset = document.getElementById('resetBtn'); if(reset) reset.onclick=resetAll;
  }
  return { init };
})();
</script>
