<script>
(async function(){
  try{
    await NOVA.loadAll(); NOVA.loadState();
    const page = document.body.getAttribute('data-page');
    if(page==='categories') CategoryFlow.init();
    if(page==='traits') TraitsFlow.init();
    if(page==='roles') ResultsRenderer.init();
    if(page==='invest') SaveReturn.init();
  }catch(err){
    console.error(err);
    const host = document.getElementById('app-error')||document.body;
    const div=document.createElement('div');
    div.className='note'; div.textContent='Problem loading data. Confirm ./data/*.json exists and paths are relative.';
    host.prepend(div);
  }
})();
</script>
