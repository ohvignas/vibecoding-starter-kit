#!/usr/bin/env node
// Smoke E2E cross-platform (zéro bash) : joue le VRAI setup.mjs dans un dossier temporaire
// et vérifie que le kit tient ses promesses (fichiers clés, dépôt git + hooks, codes de sortie).
// Lancé par la CI après node --test ; utilisable en local : node scripts/smoke-e2e.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, etapesDuRunbook } from './lib/commands-list.mjs';

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
  '.cursor/agents/verificateur.md',
  'docs/A-FAIRE.md', 'docs/ROADMAP.md',
  // Mémoire partagée du crew : les agents la reçoivent PAR SON CHEMIN — si le fichier n'est pas
  // là, ils lisent le vide et l'inventaire de complétude n'a plus d'existence (Lot C).
  'docs/agents/JOURNAL.md', 'docs/agents/state.yaml', 'docs/agents/inventaire.md',
  // Templates que /new-project OUVRE au lieu de les recopier (Lot D9) : il les cite par ces
  // chemins-là — absents, la Phase 2 et la Phase 4 renvoient dans le vide.
  'docs/templates/PRD.md', 'docs/templates/architecture.md',
]) check(`fichier ${f}`, fs.existsSync(path.join(project, f)));

// Les ÉTAPES d'un runbook découpé, livrées dans le dossier natif de l'assistant. Ce contrôle SUIT
// le kit : chaque étape que porte `templates/commands/<cmd>/` doit être arrivée dans le projet.
let etapesVues = 0;
for (const c of COMMANDS) {
  for (const e of etapesDuRunbook(kitRoot, c)) {
    etapesVues++;
    check(`étape .cursor/commands/${c}/${e}`, fs.existsSync(path.join(project, '.cursor/commands', c, e)));
  }
}
// GARDE DE MONTAGE. La boucle ci-dessus ne peut échouer que sur une étape MANQUANTE : à zéro
// étape énumérée, elle est verte sans rien avoir vérifié. Or c'est exactement l'état qu'aurait le
// gate si `templates/commands/<cmd>/` cessait d'être livré (dossier renommé, filtre `.md` cassé,
// `etapesDuRunbook` qui avale son erreur) — le projet sortirait avec une entrée dont chaque ligne
// de checklist renvoie à un fichier absent, et le smoke le déclarerait vert.
check(`au moins une étape de runbook attendue (vues : ${etapesVues})`, etapesVues > 0);

check('dépôt git initialisé (.git présent)', fs.existsSync(path.join(project, '.git')));
let hooksPath = '';
try { hooksPath = execFileSync('git', ['-C', project, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim(); } catch {}
check('core.hooksPath = .githooks', hooksPath === '.githooks');
let log = '';
try { log = execFileSync('git', ['-C', project, 'log', '--oneline'], { encoding: 'utf8', env: gitEnv }); } catch {}
check('commit initial présent', /environnement vibecoding initial/.test(log));

// 1bis. Même run pour la stack vitrine (Astro, sans backend), dans un dossier frère
const projectVitrine = path.join(base, 'demo-vitrine');
execFileSync(process.execPath, [setup, '--stack', 'vitrine', '--assistant', 'cursor', '--project', projectVitrine, '--no-skills', '--yes'], { stdio: 'inherit', env: gitEnv });

check('vitrine : fichier docs/A-FAIRE.md', fs.existsSync(path.join(projectVitrine, 'docs', 'A-FAIRE.md')));
check('vitrine : fichier .cursor/rules/stack-vitrine.mdc', fs.existsSync(path.join(projectVitrine, '.cursor', 'rules', 'stack-vitrine.mdc')));

// 1ter. Parité Codex : les agents arrivent dans docs/agents/crew/ et AUCUN .claude/ n'est écrit
// (Codex n'a ni dossier d'agents ni hook d'édition — un .claude/ fantôme induirait l'élève en erreur).
const projectCodex = path.join(base, 'demo-codex');
execFileSync(process.execPath, [setup, '--stack', 'saas', '--assistant', 'codex', '--project', projectCodex, '--no-skills', '--yes'], { stdio: 'inherit', env: gitEnv });

check('codex : docs/agents/crew/verificateur.md présent', fs.existsSync(path.join(projectCodex, 'docs', 'agents', 'crew', 'verificateur.md')));
check('codex : aucun dossier .claude/', !fs.existsSync(path.join(projectCodex, '.claude')));

// 2. Cas d'échec attendu : stack inconnue → code de sortie ≠ 0 (hors-ligne friendly)
let code = 0;
try { execFileSync(process.execPath, [setup, '--stack', 'inexistante', '--assistant', 'cursor', '--project', path.join(base, 'x'), '--no-skills', '--yes'], { stdio: 'pipe', env: gitEnv }); }
catch (e) { code = e.status ?? 1; }
check('stack invalide → exit ≠ 0', code !== 0);

try { fs.rmSync(base, { recursive: true, force: true }); } catch { /* nettoyage best-effort (fichiers .git en lecture seule sous Windows) */ }
if (echecs > 0) { console.error(`\nSmoke E2E : ${echecs} vérification(s) en échec.`); process.exit(1); }
console.log('\nSmoke E2E : tout est vert.');
