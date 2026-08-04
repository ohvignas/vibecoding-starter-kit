import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cheminRunbook, fichiersDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const AGENTS = ['verificateur', 'test-runner', 'security-reviewer', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux'];

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
  // `/new-feature` est découpé : son gate `verificateur` vit dans l'étape `03-…`. Le gate se
  // cherche donc dans le runbook ENTIER (entrée + étapes, liste dérivée de `commands-list.mjs`),
  // pas dans la seule entrée — qui n'est plus qu'une checklist.
  const gates = ['templates/commands/build.md', ...fichiersDuRunbook(ROOT, 'new-feature'), 'templates/agents/verify-rule.md'];
  assert.ok(gates.length >= 8, `montage : ${gates.length} fichiers surveillés — le runbook découpé n'est pas lu en entier`);
  for (const f of ['templates/commands/build.md', 'templates/agents/verify-rule.md']) {
    assert.match(read(f), /verificateur/, `${f}`);
  }
  assert.ok(fichiersDuRunbook(ROOT, 'new-feature').some((f) => /verificateur/.test(read(f))), '/new-feature : aucun fichier du runbook ne câble le gate `verificateur`');
  assert.match(read('templates/agents/verify-rule.md'), /state\.yaml/);
});

test('aucune référence morte ni chemin d\'agents figé sur un seul assistant', () => {
  assert.doesNotMatch(read('scripts/lib/matrix.mjs'), /pixelbrowse/);
  // L'interdit ci-dessous est NÉGATIF : il porterait sur un fichier qui ne contient plus la ligne
  // visée (elle vit en `06-…` depuis le découpage) pendant que `.claude/agents/` se figerait dans
  // une étape sans être vu. Il balaie donc `/new-project` EN ENTIER — entrée + étapes, liste
  // dérivée de `commands-list.mjs` — plus `help.md`.
  const surveilles = [cheminRunbook('help'), ...fichiersDuRunbook(ROOT, 'new-project')];
  assert.ok(surveilles.length > 2, `montage : ${surveilles.length} fichiers surveillés — les étapes de /new-project échappent à l'interdit`);
  for (const f of surveilles) {
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
