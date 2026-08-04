// scripts/lib/commands-list.mjs — SOURCE UNIQUE des 10 runbooks et du dossier où chaque
// assistant les attend. Trois listes vivaient en parallèle (scaffold, refresh, plugin Cursor)
// et deux cartes identiques portaient deux noms (`TARGET` dans matrix, `CMD_DIR` dans
// kit-owned) : l'ordre avait déjà divergé, et il aurait suffi d'ajouter une 11ᵉ commande à
// deux endroits sur trois pour qu'un projet la reçoive au scaffold mais jamais au `--refresh`.
// Toute notion « la liste des commandes » se lit ici, et nulle part ailleurs.
import fs from 'node:fs';
import path from 'node:path';

export const COMMANDS = ['init-vibecoding', 'help', 'new-project', 'new-feature', 'edit-design', 'doctor', 'build', 'next', 'sos', 'deploy'];

// ── OÙ VIT UN RUNBOOK DANS LE KIT ─────────────────────────────────────────────────────────────
// Un runbook trop long se lit mal d'un bloc. Il se découpe alors en ÉTAPES : l'entrée
// `templates/commands/<cmd>.md` devient un sommaire court, et chaque étape est un fichier de
// `templates/commands/<cmd>/`. Ces trois chemins sont la SEULE définition de cet emplacement —
// le scaffold, le `--refresh`, le plugin Cursor et le validateur les lisent tous ici.
export const cheminRunbook = (cmd) => `templates/commands/${cmd}.md`;
export const dossierEtapes = (cmd) => `templates/commands/${cmd}`;
export const cheminEtape = (cmd, etape) => `templates/commands/${cmd}/${etape}`;

// Les étapes d'un runbook, dans l'ordre des numéros. Le dossier peut être ABSENT (runbook jamais
// découpé) ou VIDE — git ne suit pas un dossier vide, il n'y porte qu'un `.gitkeep`. Les deux
// valent « aucune étape », et le runbook reste alors le seul fichier livré.
// Le filtre `.md` n'est pas cosmétique : sans lui le `.gitkeep` compterait pour une étape, et un
// éventuel sous-dossier partirait dans `readFileSync` → `EISDIR`.
export function etapesDuRunbook(kitRoot, cmd) {
  try { return fs.readdirSync(path.join(kitRoot, dossierEtapes(cmd))).filter((n) => n.endsWith('.md')).sort(); }
  catch { return []; }
}

// TOUS les fichiers d'un runbook : l'entrée, puis ses étapes dans l'ordre des numéros. Un runbook
// non découpé n'a que son entrée. C'est la forme dont les CONTRÔLES ont besoin : un balayage qui ne
// lirait que l'entrée resterait vert sur un corpus amputé, et un interdit ne porterait plus sur le
// texte parti en étape. Dérivé des trois chemins ci-dessus, jamais recopié : aucun test n'a donc à
// nommer une étape pour la lire.
export function fichiersDuRunbook(kitRoot, cmd) {
  return [cheminRunbook(cmd), ...etapesDuRunbook(kitRoot, cmd).map((e) => cheminEtape(cmd, e))];
}

// Recolle une entrée et ses étapes en UN seul texte. PUR (aucune E/S) : la même fonction sert au
// scaffold (`setup.mjs`) et à la mise à jour (`refresh.mjs`), jamais deux vérités.
// À quoi ça sert — chez Codex les runbooks du kit ne sont pas des slash-commands mais des
// FICHIERS qu'un humain ouvre et fait suivre à l'IA (cf. NOTE_CODEX_COMMANDES plus bas). Un
// runbook découpé lui demanderait d'ouvrir l'entrée puis chaque étape à la main, dans l'ordre,
// sans que rien ne vérifie qu'il n'en a pas sauté une. Il reçoit donc le tout d'un bloc.
// SANS ÉTAPE, le résultat est l'entrée À L'OCTET PRÈS : le câblage est neutre tant qu'il n'y a
// rien à recoller.
export function collerRunbook(entree, etapes) {
  if (etapes.length === 0) return entree;
  return [entree, ...etapes].map((t) => t.replace(/\s*$/, '\n')).join('\n---\n\n');
}

// La version E/S de `collerRunbook`, pour le scaffold : lit l'entrée et ses étapes sous `kitRoot`.
export function runbookConcatene(kitRoot, cmd) {
  const lu = (rel) => fs.readFileSync(path.join(kitRoot, rel), 'utf8');
  return collerRunbook(lu(cheminRunbook(cmd)), etapesDuRunbook(kitRoot, cmd).map((e) => lu(cheminEtape(cmd, e))));
}

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
// « slash-commands » tout court se contredisait avec la ligne suivante, qui dit à Codex de taper
// `/plugins` — une commande de SON client, qui elle existe. Le débutant ne pouvait pas trancher
// laquelle des deux était vraie. On nomme donc précisément ce qui n'existe pas chez lui : les
// runbooks du kit.
//
// ⚠️ CE QU'UN PROJET CODEX REÇOIT VRAIMENT, depuis le découpage — mesuré, pas supposé. Pour un
// runbook découpé, il reçoit DEUX choses : `docs/commands/<cmd>.md`, l'entrée SUIVIE de toutes
// ses étapes en un seul fichier (`runbookConcatene`), ET `docs/commands/<cmd>/`, les mêmes
// étapes en fichiers séparés — parce que l'entrée les cite par leur chemin et qu'un chemin cité
// qui n'existe pas est un renvoi mort (`kit-owned.mjs`). « Chacun est un fichier » restait vrai
// pour ce qu'il faut OUVRIR, mais laissait le débutant devant un dossier de neuf fichiers sans
// savoir s'il devait les ouvrir aussi — alors que celui qu'il a déjà sous les yeux les contient.
// La note dit donc les deux, et `codex.test.mjs` vérifie que les deux livraisons ont bien lieu.
export const NOTE_CODEX_COMMANDES = 'Chez Codex, les runbooks du kit ne sont pas des slash-commands : chacun est un **fichier** — ouvre-le et suis-le pas à pas (taper `/son-nom` ne ferait rien). Un runbook long arrive aussi **découpé en étapes** dans un dossier à son nom, juste à côté : tu n\'as pas à les ouvrir une par une, le fichier que tu ouvres **les contient déjà**, dans l\'ordre. Les commandes de Codex lui-même, comme `/plugins`, marchent normalement.';
