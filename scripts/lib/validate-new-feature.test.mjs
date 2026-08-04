// scripts/lib/validate-new-feature.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewFeatureCommand } from './validate-commands.mjs';

// Miroir de la liste `steps` de validateNewFeatureCommand. `main` nu y était un contrôle vide
// (« Gates humains » suffisait à le satisfaire) : c'est `--base main`, la cible réelle du merge,
// qui est exigée — d'où le cas « cible du merge changée » plus bas.
const STEPS = ['worktree', 'brainstorming', 'writing-plans', 'subagent-driven-development', 'code-review', 'Règle de vérification', 'security-review', 'git commit', 'gh pr create', 'gh run watch', 'finishing-a-development-branch', '--base main'];
const DEPTH = ["Critères d'acceptation", 'En tant que', 'Périmètre'];

// Le CADRE que l'entrée doit porter. Il a changé de nature : il citait la SOURCE
// (`templates/agents/loop-section.md`), un dossier du kit absent du projet livré, donc un renvoi
// mort chez l'utilisateur ; il cite maintenant la DESTINATION, le fichier qu'il peut ouvrir.
const CADRE = 'Suis la **boucle d\'itération** de l\'`AGENTS.md`, sans sauter d\'étape.';
// Le second maillon, vérifié sur le disque et non dans le fichier livré : la boucle annoncée est
// bien celle que ce template rend dans l'`AGENTS.md` du projet.
const SOURCE_BOUCLE = 'templates/agents/loop-section.md';

function makeRoot({ omitStep = null, omitLoopRef = false, omitRunbook = false, omitDepth = null, omitSource = false, ajoute = '' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
  if (!omitSource) {
    fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
    fs.writeFileSync(path.join(root, SOURCE_BOUCLE), '## Boucle d\'itération\nbrainstorming → plan → code → Merge\n');
  }
  if (!omitRunbook) {
    fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
    const steps = STEPS.filter(s => s !== omitStep).join(' \n');
    const depth = DEPTH.filter(d => d !== omitDepth).join(' \n');
    const loopRef = omitLoopRef ? '' : CADRE;
    fs.writeFileSync(path.join(root, 'templates/commands/new-feature.md'), `${steps}\n${depth}\n${loopRef}\n${ajoute}\n`);
  }
  return root;
}

test('runbook complet → aucune erreur', () => {
  assert.deepEqual(validateNewFeatureCommand(makeRoot()), []);
});
test('étape manquante → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitStep: 'security-review' })).some(e => /security-review/.test(e)));
});
test('cadre de la boucle manquant dans l\'entrée → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitLoopRef: true })).some(e => /boucle de l'AGENTS\.md/.test(e)));
});
// Le second maillon doit MORDRE seul : une entrée qui annonce parfaitement sa boucle, mais plus
// rien pour l'écrire dans l'`AGENTS.md`, renvoie l'utilisateur vers une section qui n'existera
// pas. Sans ce cas, retirer `loop-section.md` du kit passerait au vert.
test('boucle annoncée mais plus rendue dans AGENTS.md → erreur', () => {
  const errs = validateNewFeatureCommand(makeRoot({ omitSource: true }));
  assert.ok(errs.some(e => /loop-section\.md/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
// Et le CADRE exigé ne doit pas pouvoir citer un dossier source du kit : c'est exactement la
// forme qui a fait naître le défaut (« (issue de `templates/agents/loop-section.md`) »), verte
// pendant tout le chantier. Le garde de destination, lui, ne s'en satisfait pas.
test('l\'ancienne forme (chemin du kit seul) ne suffit plus à satisfaire le cadre', () => {
  const errs = validateNewFeatureCommand(makeRoot({ omitLoopRef: true, ajoute: 'templates/agents/loop-section.md' }));
  assert.ok(errs.some(e => /boucle de l'AGENTS\.md/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
test('spec pas assez détaillée (critères d\'acceptation manquants) → erreur', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitDepth: "Critères d'acceptation" })).some(e => /profondeur|acceptation/i.test(e)));
});
test('runbook absent → erreur unique', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitRunbook: true })).some(e => /new-feature\.md/.test(e)));
});
// D1/D2 — le validateur ne se contente plus d'exiger le bon : il refuse le faux. Sans ces deux
// cas, remplacer `gh pr create` par le plugin fantôme repasserait au vert (il suffisait d'ajouter
// la chaîne exigée), et rien n'empêcherait de réintroduire la branche `dev`.
test('plugin de commit fantôme → erreur', () => {
  const errs = validateNewFeatureCommand(makeRoot({ ajoute: '### 7. Commit (`commit-commands:commit`)' }));
  assert.ok(errs.some(e => /plugin de commit jamais installé/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
test('branche `dev` réintroduite → erreur', () => {
  const errs = validateNewFeatureCommand(makeRoot({ ajoute: 'Merge sur `dev`' }));
  assert.ok(errs.some(e => /branche `dev`/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
test('étape `gh pr create` manquante → erreur (la PR ne s\'ouvre pas toute seule)', () => {
  assert.ok(validateNewFeatureCommand(makeRoot({ omitStep: 'gh pr create' })).some(e => /gh pr create/.test(e)));
});
// Le contrôle de la cible du merge doit MORDRE : un runbook qui ne nomme aucune branche, ou qui
// vise une autre base, doit échouer. Avec l'ancien `main` nu, ce test passait au vert sans que le
// runbook ne dise nulle part où atterrit la PR — le mot « humains » suffisait.
test('cible du merge absente → erreur (un runbook sans branche cible ne doit pas passer)', () => {
  const errs = validateNewFeatureCommand(makeRoot({ omitStep: '--base main' }));
  assert.ok(errs.some(e => /--base main/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
test('cible du merge changée (`--base master`) → erreur', () => {
  const errs = validateNewFeatureCommand(makeRoot({ omitStep: '--base main', ajoute: 'gh pr create --fill --base master' }));
  assert.ok(errs.some(e => /--base main/.test(e)), `attendu une erreur, vu : ${JSON.stringify(errs)}`);
});
