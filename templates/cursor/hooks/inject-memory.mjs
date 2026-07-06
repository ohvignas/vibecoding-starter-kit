#!/usr/bin/env node
// Cursor sessionStart hook : injecte la mémoire du projet (docs/memory/index.md)
// ET le prochain jalon de la roadmap (docs/ROADMAP.md) — pour que l'agent sache où il en est.
import fs from 'node:fs';

// Renvoie le titre du 1er jalon non coché (`- [ ] ## <titre>`), ou null.
export function nextRoadmapStep(roadmapText) {
  for (const line of String(roadmapText || '').split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*\[ \]\s*##\s*(.+?)\s*$/);
    if (m) return m[1];
  }
  return null;
}

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

if (process.argv[1] && process.argv[1].endsWith('inject-memory.mjs')) {
  const mem = read('docs/memory/index.md');
  const step = nextRoadmapStep(read('docs/ROADMAP.md'));
  const parts = [];
  if (mem) parts.push(`# Mémoire du projet (docs/memory/index.md)\n\n${mem}`);
  if (step) parts.push(`# Prochain jalon (docs/ROADMAP.md)\n\nProchain : **${step}** — construis-le avec \`/build\`.`);
  process.stdout.write(JSON.stringify({ additional_context: parts.join('\n\n') }));
}
