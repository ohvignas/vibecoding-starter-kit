import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const AGENTS = ['verificateur', 'test-runner', 'security-reviewer', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux'];

// Les ÉTAPES de `/new-project` : `templates/commands/new-project/` portera le runbook découpé.
// Vide, voire absent (git ne suit pas un dossier vide), tant que le découpage n'a pas eu lieu.
const ETAPES = () => (fs.existsSync(path.join(ROOT, 'templates/commands/new-project'))
  ? fs.readdirSync(path.join(ROOT, 'templates/commands/new-project')).filter((n) => n.endsWith('.md')).sort()
  : []);

test('droits : rédacteurs d\'artefacts écrivent, les autres sont bridés', () => {
  for (const a of ['verificateur', 'security-reviewer']) {
    assert.match(read(`templates/agents/subagents/${a}.md`), /^tools:.*\bWrite\b/m, `${a} écrit son artefact`);
  }
  for (const a of ['test-runner', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux']) {
    assert.match(read(`templates/agents/subagents/${a}.md`), /^disallowedTools:.*\bEdit\b/m, `${a} ne modifie pas le code`);
  }
});

test('frontmatter : skills en liste, AUCUN mcpServers (aucun MCP n\'est présent sur les 4 stacks)', () => {
  for (const a of AGENTS) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.doesNotMatch(t, /^skills: \S/m, `${a} : skills doit être une liste`);
    assert.doesNotMatch(t, /^mcpServers:/m, `${a} : pas de mcpServers en frontmatter (dépend de la stack)`);
  }
});

test('règles portées par chaque agent (il ne voit pas AGENTS.md)', () => {
  for (const a of AGENTS) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.match(t, /3 tentatives/, `${a} : règle d'arrêt`);
    assert.match(t, /ne (modifies?|touches?)[^.]*tests?/i, `${a} : tests intouchables`);
    assert.match(t, /Règles que tu portes/, `${a} : bloc de règles présent`);
  }
});

test('verificateur câblé en gate + state.yaml lu', () => {
  for (const f of ['templates/commands/build.md', 'templates/commands/new-feature.md', 'templates/agents/verify-rule.md']) {
    assert.match(read(f), /verificateur/, `${f}`);
  }
  assert.match(read('templates/agents/verify-rule.md'), /state\.yaml/);
});

test('aucune référence morte ni chemin d\'agents figé sur un seul assistant', () => {
  assert.doesNotMatch(read('scripts/lib/matrix.mjs'), /pixelbrowse/);
  // GARDE DE MONTAGE. L'interdit ci-dessous est NÉGATIF et porte sur une liste de fichiers écrite
  // à la main : la ligne visée part en `06-…` au découpage, l'interdit reste vert sur un fichier
  // qui ne la contient plus, et `.claude/agents/` peut se figer dans une étape sans être vu.
  assert.deepEqual(ETAPES(), [],
    'montage : ce contrôle ne lit que help.md et new-project.md. Des étapes existent dans '
    + 'templates/commands/new-project/ et échappent à l\'interdit `.claude/agents/` — ajoute-les à la liste.');
  for (const f of ['templates/commands/help.md', 'templates/commands/new-project.md']) {
    assert.doesNotMatch(read(f), /`\.claude\/agents\/`/, `${f} : chemin figé claude-code`);
  }
  // la chaîne exigée par validateMemoryTemplates reste présente
  assert.match(read('templates/agents/memory-rules.md'), /consolidate-memory/);
});

test('proof-rule : statuts, hiérarchie, interdits, max 3 tentatives', () => {
  const t = read('templates/agents/proof-rule.md');
  for (const s of ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ', 'sortie brute', 'ROUGE avant', 'requête réseau', 'contexte frais', 'skip', '3 tentatives']) {
    assert.match(t, new RegExp(s));
  }
});

test('verificateur : contexte frais, checks anti-faux-succès, verdict', () => {
  const t = read('templates/agents/subagents/verificateur.md');
  for (const s of ['model: claude-sonnet-5', 'PROUVÉ', 'oxlint', 'knip', 'JOURNAL', 'ne codes? pas', 'expect-expect']) {
    assert.match(t, new RegExp(s));
  }
});

test('security-reviewer : outils réels + tests négatifs + artefact', () => {
  const t = read('templates/agents/subagents/security-reviewer.md');
  for (const s of ['semgrep', 'gitleaks', 'osv-scanner', 'IDOR', 'tests négatifs', '\\.security/', 'model: claude-opus-5']) {
    assert.match(t, new RegExp(s));
  }
});

test('journal : graines JOURNAL.md + state.yaml (append-only, statuts)', () => {
  const j = read('templates/journal/JOURNAL.md');
  assert.match(j, /append-only/);
  assert.match(j, /lit ce fichier avant/);
  const s = read('templates/journal/state.yaml');
  assert.match(s, /repair_attempts/);
  assert.match(s, /blocked_reason/);
});
