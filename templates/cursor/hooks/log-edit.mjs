#!/usr/bin/env node
// Cursor afterFileEdit hook : journalise les fichiers édités (aide la consolidation mémoire + le dream).
import fs from 'node:fs';
let file = '';
try { file = JSON.parse(fs.readFileSync(0, 'utf8')).file_path || ''; } catch {}
try { if (file) fs.appendFileSync('docs/memory/.edit-queue.log', file + '\n'); } catch {}
process.stdout.write('{}');
