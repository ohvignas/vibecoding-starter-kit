import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshProject, readVibecodingManifest } from './refresh.mjs';
import { renderAgentsFile } from './agents-file.mjs';
import { MARK_START_PREFIX } from './managed-section.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('refresh : régénère le bloc managé, préserve zone user + src/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} vieux -->\nVIEUX\n<!-- vibecoding:end -->\n\n## Perso\nGARDE-MOI`);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  fs.mkdirSync(path.join(dir, 'src')); fs.writeFileSync(path.join(dir, 'src/a.ts'), 'CODE');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Règle design/); assert.doesNotMatch(agents, /VIEUX/); assert.match(agents, /GARDE-MOI/);
  assert.equal(fs.readFileSync(path.join(dir, 'src/a.ts'), 'utf8'), 'CODE');
  assert.ok(r.changed.includes('AGENTS.md')); assert.equal(r.migrated.length, 0, 'marqueurs présents → pas de migration');
});

test('refresh : projet SANS marqueurs → migrated signalé, contenu conservé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-old-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Vieux\nANCIENNE REGLE');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /ANCIENNE REGLE/, 'ancien contenu conservé');
  assert.match(agents, /Règle design/, 'nouveau bloc ajouté');
  assert.ok(r.migrated.includes('AGENTS.md'), 'migration signalée');
});

test('refresh --dry-run : n\'écrit rien', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-dry-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  const before = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: true });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), before);
});

// E2 — `renderAgentsFile` avalait chaque règle manquante (`catch { return '' }`). Une source
// amputée (kit partiellement installé, paquet npm incomplet, mauvais `--source`) produisait donc
// un rendu DÉGÉNÉRÉ — l'ossature sans aucune des 9 règles — que `--refresh` écrivait par-dessus
// l'AGENTS.md complet du projet, en annonçant « Régénéré ». Mesuré : 15 022 → 1 398 octets,
// 2 189 → 190 mots, exit 0. Un rendu qui a perdu ses règles n'est pas une mise à jour : c'est
// une perte de données silencieuse. On refuse de l'écrire.
test('E2 — refresh refuse d\'écrire un AGENTS.md dégénéré et laisse l\'ancien intact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-degen-'));
  const ampute = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ampute-'));
  // Une source qui a tout SAUF templates/agents/ : les copies marchent, les règles manquent.
  fs.mkdirSync(path.join(ampute, 'templates'), { recursive: true });
  const dest = path.join(dir, 'AGENTS.md');
  const avant = `${MARK_START_PREFIX} v -->\nCONTENU COMPLET\n<!-- vibecoding:end -->\n\n## Perso\nGARDE-MOI`;
  fs.writeFileSync(dest, avant);
  assert.throws(
    () => refreshProject({ source: ampute, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: false }),
    /règle/i,
    'la source amputée doit être dénoncée, pas contournée',
  );
  assert.equal(fs.readFileSync(dest, 'utf8'), avant, 'AGENTS.md ne doit pas avoir été touché');
});

test('E2 — le rendu nomme les règles manquantes (on ne devine pas ce qui manque)', () => {
  const ampute = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ampute2-'));
  try {
    renderAgentsFile({ source: ampute, stack: 'saas', assistant: 'cursor', commandsDir: '.cursor/commands' });
    assert.fail('renderAgentsFile aurait dû refuser de rendre');
  } catch (e) {
    assert.match(e.message, /proof-rule\.md/, 'la liste des fichiers introuvables est dans le message');
    assert.match(e.message, /templates\/agents/, 'et le dossier où les chercher');
  }
});

// E4 — le mode apprentissage était un choix du wizard que RIEN ne mémorisait : `refreshProject`
// appelait `renderAgentsFile` sans `learning`, donc avec son défaut `true`. Un projet créé en
// `--no-learning` voyait la section « Mode apprentissage » (et son `/build --all` désactivé)
// revenir au premier `--refresh`, sans un mot.
test('E4 — refresh respecte le mode apprentissage mémorisé dans le manifeste', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-learning-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor', learning: false }, dryRun: false });
  assert.doesNotMatch(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /Mode apprentissage/, 'le choix de l\'utilisateur est ressuscité par le refresh');
});

test('E4 — manifeste sans `learning` (projet d\'avant) → apprentissage activé, comme au scaffold', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-learning2-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: false });
  assert.match(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /Mode apprentissage/);
});

// E6 — `--refresh` ne connaissait que les fichiers COPIÉS (commandes, agents, règles Cursor).
// Tout ce que le scaffold GÉNÈRE — hooks de l'assistant, runner de checks, pre-commit/pre-push,
// config MCP, docs/RUN.md — n'était jamais mis à jour : un correctif de sécurité dans
// `guard-shell.mjs`, ou un nouveau serveur MCP dans la stack, n'atteignait aucun projet existant.
const scaffold = (assistant, extra = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-cov-'));
  execFileSync(process.execPath, ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', assistant, '--project', dir, '--no-skills', '--yes', ...extra],
    { cwd: KIT, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@t.local', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@t.local' } });
  return dir;
};

test('E6 — refresh régénère les hooks de l\'assistant et le runner de checks', () => {
  const dir = scaffold('claude-code');
  const casses = ['.claude/hooks/guard-shell.mjs', '.claude/hooks/inject-memory.mjs', '.githooks/checks.mjs', '.githooks/pre-push', '.githooks/pre-commit'];
  for (const f of casses) fs.writeFileSync(path.join(dir, f), '// CASSÉ PAR L\'ÉLÈVE\n');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8')) });
  for (const f of casses) {
    assert.doesNotMatch(fs.readFileSync(path.join(dir, f), 'utf8'), /CASSÉ/, `${f} : jamais régénéré par --refresh`);
    assert.ok(r.changed.includes(f), `${f} : absent du rapport de régénération`);
  }
  // Et le résultat est CELUI DU SCAFFOLD, à l'octet près : sinon chaque refresh réécrirait tout.
  const r2 = refreshProject({ source: KIT, projectDir: dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8')) });
  assert.deepEqual(r2.changed.filter((c) => casses.includes(c)), [], 'refresh idempotent : rien ne rebouge au 2e passage');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E6 — --dry-run n\'écrit aucun des fichiers générés non plus', () => {
  const dir = scaffold('claude-code');
  const cible = path.join(dir, '.githooks/pre-push');
  fs.writeFileSync(cible, '# CASSÉ\n');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8')), dryRun: true });
  assert.ok(r.changed.includes('.githooks/pre-push'), 'le dry-run doit ANNONCER le changement');
  assert.equal(fs.readFileSync(cible, 'utf8'), '# CASSÉ\n', '…sans l\'appliquer');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E6 — refresh complète .mcp.json sans toucher aux serveurs de l\'utilisateur', () => {
  const dir = scaffold('claude-code');
  const mcp = path.join(dir, '.mcp.json');
  const j = JSON.parse(fs.readFileSync(mcp, 'utf8'));
  delete j.mcpServers.convex;                                  // le kit a ajouté un serveur depuis
  j.mcpServers.amoi = { command: 'node', args: ['x.mjs'] };    // et l'utilisateur a le sien
  fs.writeFileSync(mcp, JSON.stringify(j, null, 2) + '\n');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8')) });
  const apres = JSON.parse(fs.readFileSync(mcp, 'utf8')).mcpServers;
  assert.ok(apres.convex, 'le serveur MCP de la stack doit revenir');
  assert.deepEqual(apres.amoi, { command: 'node', args: ['x.mjs'] }, 'le serveur de l\'utilisateur est à lui');
  assert.ok(r.changed.includes('.mcp.json'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E6 — docs/RUN.md modifié : la version fraîche part en .new, jamais par-dessus', () => {
  const dir = scaffold('claude-code');
  const run = path.join(dir, 'docs/RUN.md');
  fs.writeFileSync(run, 'MES NOTES À MOI');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8')) });
  assert.equal(fs.readFileSync(run, 'utf8'), 'MES NOTES À MOI', 'les notes de l\'utilisateur restent');
  assert.match(fs.readFileSync(`${run}.new`, 'utf8'), /npm run dev|convex/i, 'la version fraîche est livrée à côté');
  assert.ok(r.changed.includes('docs/RUN.md.new'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E6 — Cursor : ses hooks et sa config MCP sont couverts aussi', () => {
  const dir = scaffold('cursor');
  fs.writeFileSync(path.join(dir, '.cursor/hooks/guard-shell.mjs'), '// CASSÉ\n');
  fs.writeFileSync(path.join(dir, '.cursor/mcp.json'), '{"mcpServers":{}}\n');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8')) });
  assert.doesNotMatch(fs.readFileSync(path.join(dir, '.cursor/hooks/guard-shell.mjs'), 'utf8'), /CASSÉ/);
  assert.ok(r.changed.includes('.cursor/mcp.json'), 'Cursor lit .cursor/mcp.json, pas .mcp.json');
  assert.ok(JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8')).mcpServers.convex);
  assert.equal(fs.existsSync(path.join(dir, '.mcp.json')), false, 'et surtout pas les deux');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('readVibecodingManifest : lit stack/assistant, jette si absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-'));
  assert.throws(() => readVibecodingManifest(dir), /vibecoding\.json/);
  fs.writeFileSync(path.join(dir, '.vibecoding.json'), '{"stack":"saas","assistant":"cursor"}');
  assert.equal(readVibecodingManifest(dir).stack, 'saas');
});

// ── LE REFUS SUR MARQUEURS DÉPAREILLÉS, SUR LE CHEMIN `--refresh` ─────────────────────────────
//
// `mergeManagedSection` jette désormais quand les marqueurs du fichier ne forment pas UNE paire
// (perte de texte mesurée — managed-section.test.mjs). `--refresh` traite DEUX fichiers : son
// message doit dire lequel a été refusé, sinon l'utilisateur ouvre les deux et ne trouve rien.
//
// ⛔ CE TEST EXISTE PARCE QU'UNE MUTATION A SURVÉCU : retirer le `name` passé à
// `mergeManagedSection` (refresh.mjs) laissait 53/53 verts, alors que le refus tombait sur
// « le fichier » — le message par défaut, qui ne nomme rien.
test('refresh : un fichier aux marqueurs dépareillés est refusé, en le NOMMANT, sans rien écrire', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-depareille-'));
  // AGENTS.md sain, CLAUDE.md abîmé : c'est le second qui doit être nommé, pas « le fichier ».
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  const abime = `Collé du .new : ${MARK_START_PREFIX} — bloc généré -->\nÀ MOI\n\n${MARK_START_PREFIX} v -->\nY\n<!-- vibecoding:end -->`;
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), abime);

  assert.throws(
    () => refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: false }),
    (e) => {
      assert.match(e.message, /CLAUDE\.md/, 'le refus doit NOMMER le fichier refusé');
      assert.doesNotMatch(e.message, /^le fichier/m, 'et pas retomber sur le libellé par défaut, qui ne nomme rien');
      return true;
    },
  );
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), abime, 'le fichier refusé ne doit pas avoir été touché');
});
