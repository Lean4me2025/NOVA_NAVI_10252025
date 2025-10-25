import { getJSON, state, log, $, $$ } from './app.js';

function scoreRole(role, pickedTraits){
  // role.requiredTraits: string[] (hard signals)
  // role.bonusTraits: string[] (soft signals) — optional
  const picked = new Set(pickedTraits);
  const required = role.requiredTraits || [];
  const bonus = role.bonusTraits || [];

  let hardHits = required.filter(t => picked.has(t)).length;
  let softHits = bonus.filter(t => picked.has(t)).length;

  // If role requires traits but none matched, down-rank heavily
  if (required.length && hardHits===0) return 0;

  // Weighted score: hard = 2 pts, soft = 1 pt, normalize by possible
  const denom = (required.length*2) + (bonus.length*1) || 1;
  return ((hardHits*2) + softHits) / denom;
}

(async function init(){
  const chosenTraits = state.traits || [];
  if (!chosenTraits.length){ window.location.replace('traits.html'); return; }

  const roles = await getJSON('data/roles_400.json'); // [{title, soc, requiredTraits, bonusTraits, outlook, salaryMedian}, ...]
  const ranked = roles
    .map(r => ({ ...r, _score: scoreRole(r, chosenTraits) }))
    .filter(r => r._score > 0)           // hide total mismatches
    .sort((a,b) => b._score - a._score)  // highest first
    .slice(0, 25);                        // top N

  const container = $('#rolesContainer');
  if (!ranked.length){
    container.innerHTML = `<div class="card">No strong matches yet. Try different traits.</div>`;
    return;
  }

  container.innerHTML = ranked.map(r => `
    <div class="role">
      <div class="badge">Match ${(r._score*100).toFixed(0)}%</div>
      <h3>${r.title}</h3>
      <div class="meta">${r.soc ? `SOC: ${r.soc} · `:''}${r.outlook||'Outlook: n/a'} · ${r.salaryMedian?`Median: $${r.salaryMedian.toLocaleString()}`:''}</div>
      ${r.summary?`<p>${r.summary}</p>`:''}
      ${r.requiredTraits?.length?`<p><strong>Core traits:</strong> ${r.requiredTraits.join(', ')}</p>`:''}
      ${r.bonusTraits?.length?`<p><strong>Helpful:</strong> ${r.bonusTraits.join(', ')}</p>`:''}
    </div>
  `).join('');

  log('Rendered roles:', ranked.length);
})().catch(err=>{ console.error(err); alert('Failed to load roles.'); });
