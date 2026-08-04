import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSetupAi } from './setup-ai.mjs';
import { resolveStackManifest } from './matrix.mjs';
import { claudeSettings } from './hooks.mjs';
import { COMMANDS, COMMANDS_DIR, NOTE_CODEX_COMMANDES, cheminEtape, etapesDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETUP = path.join(ROOT, 'scripts', 'setup.mjs');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};
const call = (assistant) => renderSetupAi({ stack: 'saas', assistant, manifest: resolveStackManifest('saas', assistant), superpowersCmd: 'x', skillsInstalled: true });

test('A-FAIRE : instruction MCP propre à chaque assistant', () => {
  assert.match(call('claude-code'), /lance `\/mcp`/);
  assert.match(call('cursor'), /Settings.*MCP/i);
  const codex = call('codex');
  assert.doesNotMatch(codex, /lance `\/mcp`/);
  assert.match(codex, /recopie la définition|\.mcp\.json/, 'Codex : dire quoi recopier');
});

test('Codex : aucun fichier .claude/ écrit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-codex-'));
  const proj = path.join(dir, 'app');
  try {
    execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'saas', '--assistant', 'codex', '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
    assert.equal(fs.existsSync(path.join(proj, '.claude')), false, 'aucun .claude/ fantôme');
    assert.match(fs.readFileSync(path.join(proj, 'docs/RUN.md'), 'utf8'), /Codex n'a pas de hook d'édition/, 'note typecheck pour Codex');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── CE QUE CODEX REÇOIT VRAIMENT, ET CE QUE LA NOTE LUI PROMET ────────────────────────────────
// `NOTE_CODEX_COMMANDES` est le TOUT PREMIER texte qu'un utilisateur Codex lit (COLLE-MOI, puis
// `docs/A-FAIRE.md`). Elle disait « chacun est **un** fichier — ouvre-le et suis-le pas à pas ».
// Depuis le découpage, c'est incomplet : pour un runbook découpé, Codex reçoit le fichier
// concaténé (entrée + toutes les étapes, dans l'ordre) **ET**, à côté, le dossier des étapes
// séparées — l'entrée les cite par leur chemin, un chemin cité qui n'existe pas serait un renvoi
// mort. Le débutant qui voit `docs/commands/new-project/` apparaître ne sait pas s'il doit ouvrir
// ces neuf fichiers-là, alors que celui qu'il a déjà sous les yeux les contient tous.
// Ce test MESURE les deux livraisons, puis exige que la note dise les deux.
test('Codex : le fichier qu\'il ouvre contient déjà les étapes — et la note le dit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-codex-etapes-'));
  const proj = path.join(dir, 'app');
  try {
    execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'saas', '--assistant', 'codex', '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
    const decoupes = COMMANDS.filter((c) => etapesDuRunbook(ROOT, c).length > 0);
    assert.ok(decoupes.length > 0, 'montage : aucun runbook découpé — la note n\'aurait rien à décrire');
    for (const c of decoupes) {
      const ouvert = fs.readFileSync(path.join(proj, COMMANDS_DIR.codex, `${c}.md`), 'utf8');
      for (const e of etapesDuRunbook(ROOT, c)) {
        // 1. Le fichier qu'il ouvre porte l'étape EN ENTIER — pas seulement son titre.
        const source = fs.readFileSync(path.join(ROOT, cheminEtape(c, e)), 'utf8').trim();
        assert.ok(ouvert.includes(source), `${COMMANDS_DIR.codex}/${c}.md n'embarque pas l'étape « ${e} » : « ouvre-le et suis-le » serait faux`);
        // 2. …et l'étape séparée existe AUSSI : l'entrée la cite par son chemin.
        assert.ok(fs.existsSync(path.join(proj, COMMANDS_DIR.codex, c, e)), `${COMMANDS_DIR.codex}/${c}/${e} : chemin cité par l'entrée, jamais livré`);
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }

  // La note doit décrire CES deux faits. Sans le premier, Codex rouvre neuf fichiers déjà lus ;
  // sans le second, il croit avoir raté quelque chose en voyant le dossier arriver à côté.
  assert.match(NOTE_CODEX_COMMANDES, /étapes/i, 'la note ignore le dossier d\'étapes livré à côté du fichier');
  assert.match(NOTE_CODEX_COMMANDES, /contient|d[ée]j[àa]/i, 'la note ne dit pas que le fichier ouvert contient déjà les étapes');
  assert.match(NOTE_CODEX_COMMANDES, /`\/plugins`/, 'la note doit garder la distinction avec les vraies commandes de Codex');
});

test('claudeSettings : mémoire au démarrage + garde-fou shell', () => {
  const s = JSON.parse(claudeSettings(null, ['typecheck']));
  assert.ok(s.hooks.SessionStart, 'injection mémoire');
  assert.ok(s.hooks.PreToolUse, 'garde-fou avant commande shell');
  // Les hooks doivent pointer vers des scripts qui EXISTENT dans le kit (sinon ils pointent dans le vide).
  for (const f of ['guard-shell', 'inject-memory']) {
    assert.ok(fs.existsSync(path.join(ROOT, `templates/claude/hooks/${f}.mjs`)), `templates/claude/hooks/${f}.mjs existe`);
  }
});

test('claudeSettings : SessionStart/PreToolUse idempotents', () => {
  const once = claudeSettings(null, ['typecheck']);
  const twice = JSON.parse(claudeSettings(once, ['typecheck']));
  assert.equal(twice.hooks.SessionStart.length, 1, 'SessionStart non dupliqué');
  assert.equal(twice.hooks.PreToolUse.length, 1, 'PreToolUse non dupliqué');
});

test('hook garde-shell (format Claude Code) : bloque par exit 2 sur stderr', () => {
  const hook = path.join(ROOT, 'templates/claude/hooks/guard-shell.mjs');
  const run = (payload) => {
    try {
      const out = execFileSync(process.execPath, [hook], { input: JSON.stringify(payload), encoding: 'utf8', stdio: 'pipe' });
      return { code: 0, stderr: '', stdout: out };
    } catch (e) { return { code: e.status, stderr: String(e.stderr), stdout: String(e.stdout) }; }
  };
  const bad = run({ tool_input: { command: 'rm -rf /' } });
  assert.equal(bad.code, 2, 'commande dangereuse → exit 2');
  assert.match(bad.stderr, /bloquée/i, 'explication sur stderr');
  assert.equal(run({ tool_input: { command: 'npm test' } }).code, 0, 'commande sûre → exit 0');
});

test('hook inject-memory (format Claude Code) : texte simple sur stdout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-mem-'));
  try {
    fs.mkdirSync(path.join(dir, 'docs/memory'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'docs/memory/index.md'), 'MEMOIRE-TEST');
    fs.writeFileSync(path.join(dir, 'docs/ROADMAP.md'), '- [ ] ## Jalon-Test\n');
    const out = execFileSync(process.execPath, [path.join(ROOT, 'templates/claude/hooks/inject-memory.mjs')], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
    assert.match(out, /MEMOIRE-TEST/);
    assert.match(out, /Jalon-Test/);
    assert.doesNotMatch(out, /additional_context/, 'sortie texte simple, pas le JSON Cursor');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('claude-code : les hooks sont copiés dans .claude/hooks/ (pas pour les autres)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-claude-hooks-'));
  const proj = path.join(dir, 'app');
  try {
    execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'saas', '--assistant', 'claude-code', '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
    for (const f of ['guard-shell.mjs', 'inject-memory.mjs']) {
      assert.ok(fs.existsSync(path.join(proj, '.claude/hooks', f)), `.claude/hooks/${f}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
