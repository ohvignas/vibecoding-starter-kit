// scripts/lib/commands-list.mjs — SOURCE UNIQUE des 10 runbooks et du dossier où chaque
// assistant les attend. Trois listes vivaient en parallèle (scaffold, refresh, plugin Cursor)
// et deux cartes identiques portaient deux noms (`TARGET` dans matrix, `CMD_DIR` dans
// kit-owned) : l'ordre avait déjà divergé, et il aurait suffi d'ajouter une 11ᵉ commande à
// deux endroits sur trois pour qu'un projet la reçoive au scaffold mais jamais au `--refresh`.
// Toute notion « la liste des commandes » se lit ici, et nulle part ailleurs.

export const COMMANDS = ['init-vibecoding', 'help', 'new-project', 'new-feature', 'edit-design', 'doctor', 'build', 'next', 'sos', 'deploy'];

// Dossier de slash-commands NATIF de chaque assistant. Codex n'en a pas → docs/commands/
// (les runbooks y sont des fichiers qu'on ouvre et qu'on fait suivre à l'IA).
export const COMMANDS_DIR = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };

// Comment DÉSIGNER un runbook à l'utilisateur, selon son assistant. Corollaire de la ligne
// ci-dessus, et jamais tiré jusqu'au bout : le premier contact écrivait « lance /doctor » aux
// trois, alors que Codex n'exécute aucune de ces commandes — chez lui, ce sont des fichiers.
// Un débutant Codex qui tape `/doctor` ne voit rien se produire et croit que c'est lui.
export function refCommande(assistant, cmd) {
  return assistant === 'codex' ? `\`${COMMANDS_DIR.codex}/${cmd}.md\`` : `/${cmd}`;
}

// Dit UNE fois la convention ci-dessus, pour que les renvois qui suivent se lisent. Formulée
// pour ses deux lecteurs : l'IA (à qui ces fichiers sont adressés) et l'humain qui relit.
export const NOTE_CODEX_COMMANDES = 'Codex n\'exécute pas de slash-commands : chaque runbook cité ici est un **fichier** — ouvre-le et suis-le pas à pas (ne tape pas `/son-nom`, il ne se passerait rien).';
