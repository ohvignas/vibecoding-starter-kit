#!/usr/bin/env node
// Assemble un plugin Cursor (cursor-plugin/) à partir des templates du kit — source de vérité unique.
// Publiable via cursor.com/marketplace ou une Team Marketplace : donne les 9 commandes + la règle de base
// dans Cursor sans cloner ni scaffolder. Le scaffold complet d'un projet reste `npm create vibecoding-kit`.
// Structure Cursor : .cursor-plugin/plugin.json + commands/*.md + rules/*.mdc (auto-découverts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const COMMANDS = ['help', 'new-project', 'build', 'new-feature', 'edit-design', 'doctor', 'next', 'sos', 'debug', 'deploy'];

export function pluginManifest() {
  return {
    name: 'vibecoding',
    description: "Commandes vibecoding (/new-project, /build, /sos, /debug…) + règle de base, pour Cursor.",
    version: '0.2.0',
  };
}

export function buildCursorPlugin(kitRoot, outDir) {
  const done = [];
  const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); done.push(path.relative(outDir, to)); };

  fs.mkdirSync(path.join(outDir, '.cursor-plugin'), { recursive: true });
  fs.writeFileSync(path.join(outDir, '.cursor-plugin', 'plugin.json'), JSON.stringify(pluginManifest(), null, 2) + '\n');
  done.push('.cursor-plugin/plugin.json');

  for (const c of COMMANDS) cp(path.join(kitRoot, 'templates/commands', `${c}.md`), path.join(outDir, 'commands', `${c}.md`));
  cp(path.join(kitRoot, 'templates/cursor/rules/00-project.mdc'), path.join(outDir, 'rules', '00-project.mdc'));

  return { done };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = path.join(kitRoot, 'cursor-plugin');
  const { done } = buildCursorPlugin(kitRoot, outDir);
  console.log('Plugin Cursor assemblé dans cursor-plugin/ :\n' + done.map((d) => '  ' + d).join('\n'));
}
