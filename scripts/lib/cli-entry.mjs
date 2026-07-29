// scripts/lib/cli-entry.mjs — « ce module est-il celui que la ligne de commande a lancé ? »
// Source UNIQUE du garde d'entrée des trois exécutables du kit (setup, update, build-cursor-plugin).
//
// Le piège : `import.meta.url` est toujours le REALPATH du module, `process.argv[1]` est le chemin
// tel que le shell l'a écrit. Dès qu'un symlink est dans le chemin, les deux diffèrent et un
// `import.meta.url === pathToFileURL(process.argv[1]).href` est FAUX — le script sort en 0 sans
// rien faire, et l'utilisateur n'a aucun moyen de le savoir. Ce n'est pas un cas d'école :
// `npm create` / `npx` passent par `node_modules/.bin/<bin>` qui est un symlink, `npm link` aussi,
// et sur macOS `/tmp` lui-même est un symlink vers `/private/tmp`.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function isCliEntry(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false; // REPL, `node --eval` : pas d'entrée CLI
  let href;
  try { href = pathToFileURL(fs.realpathSync(argv1)).href; }
  catch { return false; } // argv[1] illisible (chemin effacé entre-temps) : on n'exécute rien
  return moduleUrl === href;
}
