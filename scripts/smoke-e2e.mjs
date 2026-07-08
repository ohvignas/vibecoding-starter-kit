#!/usr/bin/env node
// Smoke E2E cross-platform (zéro bash) : joue le VRAI setup.mjs dans un dossier temporaire
// et vérifie que le kit tient ses promesses (fichiers clés, dépôt git + hooks, codes de sortie).
// Lancé par la CI après node --test ; utilisable en local : node scripts/smoke-e2e.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const setup = path.join(kitRoot, 'scripts', 'setup.mjs');
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'Vibecoding Smoke',
  GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'smoke@vibecoding.local',
  GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'Vibecoding Smoke',
  GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'smoke@vibecoding.local',
};

let echecs = 0;
const check = (label, cond) => { console.log(`${cond ? 'OK' : 'KO'}  ${label}`); if (!cond) echecs++; };

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-smoke-'));
const project = path.join(base, 'demo-app');

// 1. Run nominal, non-interactif (sans installation réseau des skills npx)
execFileSync(process.execPath, [setup, '--stack', 'saas', '--assistant', 'cursor', '--project', project, '--no-skills', '--yes'], { stdio: 'inherit', env: gitEnv });

for (const f of [
  'AGENTS.md', 'CLAUDE.md', '.gitignore', '.env.example',
  '.githooks/pre-commit', '.githooks/pre-push',
  '.cursor/rules/00-project.mdc', '.cursor/commands/new-project.md',
  'docs/SETUP-AI.md', 'docs/ONBOARDING.md', 'docs/ROADMAP.md',
]) check(`fichier ${f}`, fs.existsSync(path.join(project, f)));

check('dépôt git initialisé (.git présent)', fs.existsSync(path.join(project, '.git')));
let hooksPath = '';
try { hooksPath = execFileSync('git', ['-C', project, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim(); } catch {}
check('core.hooksPath = .githooks', hooksPath === '.githooks');
let log = '';
try { log = execFileSync('git', ['-C', project, 'log', '--oneline'], { encoding: 'utf8', env: gitEnv }); } catch {}
check('commit initial présent', /environnement vibecoding initial/.test(log));

// 2. Cas d'échec attendu : stack inconnue → code de sortie ≠ 0 (hors-ligne friendly)
let code = 0;
try { execFileSync(process.execPath, [setup, '--stack', 'inexistante', '--assistant', 'cursor', '--project', path.join(base, 'x'), '--no-skills', '--yes'], { stdio: 'pipe', env: gitEnv }); }
catch (e) { code = e.status ?? 1; }
check('stack invalide → exit ≠ 0', code !== 0);

try { fs.rmSync(base, { recursive: true, force: true }); } catch { /* nettoyage best-effort (fichiers .git en lecture seule sous Windows) */ }
if (echecs > 0) { console.error(`\nSmoke E2E : ${echecs} vérification(s) en échec.`); process.exit(1); }
console.log('\nSmoke E2E : tout est vert.');
