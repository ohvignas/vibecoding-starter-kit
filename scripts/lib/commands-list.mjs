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
