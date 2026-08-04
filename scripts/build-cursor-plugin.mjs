#!/usr/bin/env node
// Assemble un plugin Cursor (cursor-plugin/) à partir des templates du kit — source de vérité unique.
// Publiable via cursor.com/marketplace ou une Team Marketplace : donne les 10 commandes + la règle de base
// dans Cursor sans cloner ni scaffolder. Le scaffold complet d'un projet reste `npm create vibecoding-kit`.
// Structure Cursor : .cursor-plugin/plugin.json + commands/*.md + rules/*.mdc (auto-découverts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCliEntry } from './lib/cli-entry.mjs';
// Les 10 commandes viennent de la source unique (lib/commands-list.mjs) : ce fichier en portait
// sa propre copie, dans un autre ordre. Ré-exportée pour que les tests puissent constater
// l'identité au lieu de la supposer.
import { COMMANDS, cheminRunbook, cheminEtape, etapesDuRunbook } from './lib/commands-list.mjs';
export { COMMANDS };

export function pluginManifest() {
  return {
    name: 'vibecoding',
    description: "Commandes vibecoding (/new-project, /build, /sos, /deploy…) + règle de base, pour Cursor.",
    version: '0.2.0',
  };
}

export function buildCursorPlugin(kitRoot, outDir) {
  const done = [];
  const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); done.push(path.relative(outDir, to)); };

  fs.mkdirSync(path.join(outDir, '.cursor-plugin'), { recursive: true });
  fs.writeFileSync(path.join(outDir, '.cursor-plugin', 'plugin.json'), JSON.stringify(pluginManifest(), null, 2) + '\n');
  done.push('.cursor-plugin/plugin.json');

  for (const c of COMMANDS) {
    cp(path.join(kitRoot, cheminRunbook(c)), path.join(outDir, 'commands', `${c}.md`));
    // Les ÉTAPES d'un runbook découpé. La copie est fichier par fichier : sans cette boucle le
    // sous-dossier resterait derrière, et le plugin publierait un sommaire qui renvoie à des
    // fichiers absents. Rien à emporter tant qu'aucun runbook n'est découpé.
    for (const e of etapesDuRunbook(kitRoot, c)) cp(path.join(kitRoot, cheminEtape(c, e)), path.join(outDir, 'commands', c, e));
  }
  cp(path.join(kitRoot, 'templates/cursor/rules/00-project.mdc'), path.join(outDir, 'rules', '00-project.mdc'));

  return { done };
}

// Garde d'entrée partagé (lib/cli-entry.mjs) : sans résolution du realpath, un lancement via
// symlink sortait en 0 sans rien assembler — le plugin publié restait celui d'avant.
if (isCliEntry(import.meta.url)) {
  const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  // `--out <dir>` : assembler ailleurs que dans le dépôt (tests hermétiques, essai avant publication).
  const i = process.argv.indexOf('--out');
  const outDir = i !== -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : path.join(kitRoot, 'cursor-plugin');
  const { done } = buildCursorPlugin(kitRoot, outDir);
  console.log(`Plugin Cursor assemblé dans ${path.relative(kitRoot, outDir) || '.'}/ :\n` + done.map((d) => '  ' + d).join('\n'));
}
