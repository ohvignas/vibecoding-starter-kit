// Le prompt de PREMIER CONTACT : ce que l'utilisateur colle dans son assistant juste après le
// scaffold, et le premier texte du kit qu'il lit. Il vit ici — et non en dur dans setup.mjs —
// pour être rendu, donc testé, sur les 12 combinaisons sans avoir à scaffolder.
//
// Deux pièges, tous deux tombés dessus : il imposait `/mcp` aux trois assistants (Cursor et Codex
// ne l'ont pas), et il disait « lance /doctor » à Codex, qui n'exécute aucun runbook du kit.
// L'entrée annoncée est `/help` — la même que la sortie console (report.mjs).
import { SUPERPOWERS, MCP_CONNECT } from './matrix.mjs';
import { refCommande, NOTE_CODEX_COMMANDES } from './commands-list.mjs';

export function renderColleMoi({ assistant, skillsInstalled = true }) {
  const mcp = MCP_CONNECT[assistant];
  if (!mcp) throw new Error(`Assistant inconnu : ${assistant} (attendu: ${Object.keys(MCP_CONNECT).join('|')})`);
  const cmd = (c) => refCommande(assistant, c);
  const L = ["Finalise l'install et démarre :"];
  if (assistant === 'codex') L.push(`⚠️ ${NOTE_CODEX_COMMANDES}`);
  L.push(skillsInstalled
    ? `1. Ouvre docs/A-FAIRE.md → installe les plugins et autorise les MCP (${mcp.court}). (Les skills — design + stack — sont déjà installés par le wizard.)`
    : `1. Ouvre docs/A-FAIRE.md → installe les plugins, lance les commandes de skills listées (sections 2 et 5), autorise les MCP (${mcp.court}).`);
  L.push(`2. Boucle superpowers : ${SUPERPOWERS[assistant]}`);
  L.push(`3. ${cmd('help')} — l'aide-mémoire : les 10 runbooks et par où continuer. C'est le seul à retenir.`);
  L.push(`4. ${cmd('doctor')} — vérifie que tout est branché.`);
  L.push(`5. ${cmd('new-project')} (PRD + tech spec + design), puis ${cmd('build')}.`);
  return L;
}
