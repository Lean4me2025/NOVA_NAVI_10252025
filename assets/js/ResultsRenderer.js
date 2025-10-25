import { getJSON, state, log, $, $$ } from './app.js';

function scoreRole(role, pickedTraits){
  const picked = new Set(pickedTraits);
  const req = role.requiredTraits || [];
  const bonus = role.bonusTraits || [];
  const reqHits = req.filter(t=>picked.has(t));
  const bonHits = bonus.filter(t=>picked.has(t));
  if (req.length && reqHits.length===0) return {score:0, reqHits, bonHits};
  const denom = (req.length*2)+(bonus.length||0) || 1;
  const score = ((reqHits.length*2)+bonHits.length)/denom;
  return {score, reqHits, bonHits};
}

(function init(){
  // This file is now unused if you rely on roles.html's module block.
  // Keep or remove based on your preference.
  log('ResultsRenderer.js placeholder loaded.');
})();
