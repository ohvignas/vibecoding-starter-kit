// Le prompt de PREMIER CONTACT : ce que l'utilisateur colle dans son assistant juste après le
// scaffold, et le premier texte du kit qu'il lit. Il vit ici — et non en dur dans setup.mjs —
// pour être rendu, donc testé, sur les 12 combinaisons sans avoir à scaffolder.
//
// Deux pièges, tous deux tombés dessus : il imposait `/mcp` aux trois assistants (Cursor et Codex
// ne l'ont pas), et il disait « lance /doctor » à Codex, qui n'exécute aucun runbook du kit.
// L'entrée annoncée est `/help` — la même que la sortie console (report.mjs).
//
// TROISIÈME PIÈGE, celui du parcours ADOPTÉ : la dernière ligne envoyait sur `/new-project` (PRD +
// tech spec + design) un projet qui a déjà son code, et l'étape 1 lui faisait « installer les
// plugins » et « autoriser les MCP » alors que la stack `aucune` n'en déclare AUCUN — deux gestes
// sans objet, sur le tout premier texte qu'il lit.
import { SUPERPOWERS, MCP_CONNECT } from './matrix.mjs';
import { refCommande, NOTE_CODEX_COMMANDES } from './commands-list.mjs';
import { estAdopte } from './adoption.mjs';

export function renderColleMoi({ assistant, stack, skillsInstalled = true }) {
  const mcp = MCP_CONNECT[assistant];
  if (!mcp) throw new Error(`Assistant inconnu : ${assistant} (attendu: ${Object.keys(MCP_CONNECT).join('|')})`);
  // `stack` EST OBLIGATOIRE, et ce n'est pas de la rigueur gratuite : une valeur par défaut ferait
  // retomber un appelant distrait sur le parcours NEUF — donc sur `/new-project` — exactement le
  // défaut que ce paramètre existe pour fermer, et en silence. On échoue plutôt que de deviner.
  if (!stack) throw new Error('renderColleMoi : `stack` manquante — sans elle, un projet adopté recevrait le prompt du parcours neuf (`/new-project`).');
  const adopte = estAdopte(stack);
  const cmd = (c) => refCommande(assistant, c);
  const L = ["Finalise l'install et démarre :"];
  if (assistant === 'codex') L.push(`⚠️ ${NOTE_CODEX_COMMANDES}`);
  // Sur un projet adopté, `docs/A-FAIRE.md` n'a plus ni section « Plugins », ni « Skills portables
  // (stack) », ni « MCP à autoriser » : la stack `aucune` n'en déclare aucun (setup-ai.mjs ne rend
  // pas une section vide). Citer ces gestes — ou pire, des NUMÉROS de section — serait un renvoi
  // mort dès la première ligne. On renvoie donc au fichier, pas à son sommaire.
  if (adopte) {
    L.push(skillsInstalled
      ? '1. Ouvre docs/A-FAIRE.md → fais chaque case. (Les skills — design + crew — sont déjà installés par le wizard.)'
      : '1. Ouvre docs/A-FAIRE.md → fais chaque case, et lance les commandes de skills qui y sont listées.');
  } else {
    L.push(skillsInstalled
      ? `1. Ouvre docs/A-FAIRE.md → installe les plugins et autorise les MCP (${mcp.court}). (Les skills — design + stack — sont déjà installés par le wizard.)`
      : `1. Ouvre docs/A-FAIRE.md → installe les plugins, lance les commandes de skills listées (sections 2 et 5), autorise les MCP (${mcp.court}).`);
  }
  L.push(`2. Boucle superpowers : ${SUPERPOWERS[assistant]}`);
  L.push(`3. ${cmd('help')} — l'aide-mémoire : les 10 runbooks et par où continuer. C'est le seul à retenir.`);
  L.push(`4. ${cmd('doctor')} — vérifie que tout est branché.`);
  // LA DERNIÈRE LIGNE, celle qui dit « et maintenant ? ». Sur un projet neuf c'est `/new-project`
  // (il n'y a rien) ; sur un projet adopté c'est `docs/ETAT-DES-LIEUX.md` (il y a déjà tout, et
  // c'est ce fichier — posé vide, jamais régénéré — qui apprend le projet à l'IA).
  L.push(adopte
    ? '5. Ouvre docs/ETAT-DES-LIEUX.md → fais-le remplir par ton IA, qui lit TON code : c\'est le point de départ ici, tout part de là.'
    : `5. ${cmd('new-project')} (PRD + tech spec + design), puis ${cmd('build')}.`);
  return L;
}
