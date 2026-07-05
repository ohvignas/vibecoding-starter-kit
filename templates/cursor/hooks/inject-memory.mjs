#!/usr/bin/env node
// Cursor sessionStart hook : injecte la mémoire du projet (docs/memory/index.md) dans le contexte.
import fs from 'node:fs';
let ctx = '';
try { ctx = fs.readFileSync('docs/memory/index.md', 'utf8'); } catch {}
process.stdout.write(JSON.stringify({ additional_context: ctx ? `# Mémoire du projet (docs/memory/index.md)\n\n${ctx}` : '' }));
