// scripts/lib/validate-commands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNewProjectCommand } from './validate-commands.mjs';

const PHASES = ['Brainstorm', 'PRD', 'stack', 'architecture', 'Design', 'Roadmap', 'Mise en place'];
const OUTPUTS = ['docs/PRD.md', 'docs/ROADMAP.md', 'docs/design.md', 'docs/ARCHITECTURE.md', 'docs/memory'];
const RENVOIS = ['docs/templates/PRD.md', 'docs/templates/architecture.md'];
// Les marqueurs de profondeur ont suivi le contenu : le runbook garde les siens, les templates
// PRD/architecture portent les leurs depuis qu'ils vivent dans `templates/` (Lot D9).
const DEPTH_RUNBOOK = ['EXPERIENCE.md', 'maquette', 'index.html', 'ui.shadcn.com/create', '@shadcnblocks'];
const DEPTH_PRD = ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses'];
const DEPTH_ARCHI = ['Invariants', 'Graine structurelle'];

// Le découpage à venir : une entrée courte + un fichier par étape. La carte ci-dessous dit quel
// marqueur doit vivre dans QUELLE étape — c'est le miroir de celle de `validate-commands.mjs`, et
// c'est ce qui distingue un ancrage d'une concaténation : dans `makeRoot`, l'ENTRÉE porte
// toujours TOUS les marqueurs, donc un validateur qui recollerait les fichiers passerait quoi
// qu'il arrive. Seul un contrôle ancré peut échouer sur une étape amputée.
const ETAPES = {
  '01-cadrage.md': ['Brainstorm'],
  '02-prd.md': ['PRD', 'docs/PRD.md', 'docs/templates/PRD.md'],
  '03-stack-et-architecture.md': ['stack', 'architecture', 'docs/ARCHITECTURE.md', 'docs/templates/architecture.md'],
  '05-design-maquette.md': ['Design', 'docs/design.md', 'EXPERIENCE.md', 'maquette', 'index.html', 'ui.shadcn.com/create'],
  '06-roadmap.md': ['Roadmap', 'docs/ROADMAP.md'],
  '07-scaffold.md': ['Mise en place', 'docs/memory', '@shadcnblocks'],
};

// `etapes` : null → pas de dossier d'étapes (l'état d'avant le découpage).
//            'toutes' → les 6 étapes, chaque marqueur à sa place.
//            { omitEtape } → toutes sauf celle-là. { etape, omitMarqueur } → une étape amputée.
function poserEtapes(root, spec) {
  if (!spec) return;
  const dir = path.join(root, 'templates/commands/new-project');
  fs.mkdirSync(dir, { recursive: true });
  for (const [nom, marqueurs] of Object.entries(ETAPES)) {
    if (spec.omitEtape === nom) continue;
    const gardes = spec.etape === nom ? marqueurs.filter((m) => m !== spec.omitMarqueur) : marqueurs;
    fs.writeFileSync(path.join(dir, nom), `${gardes.join('\n')}\n`);
  }
}

function makeRoot({ omitPhase = null, omitTemplate = false, omitDepth = null, omitRenvoi = null, omitDepthFile = null, etapes = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  fs.mkdirSync(path.join(root, 'templates/commands'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/agents'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/prd'), { recursive: true });
  fs.mkdirSync(path.join(root, 'templates/specs'), { recursive: true });
  const phases = PHASES.filter(p => p !== omitPhase).join(' ');
  const outputs = OUTPUTS.join(' ');
  const renvois = RENVOIS.filter(r => r !== omitRenvoi).join(' ');
  const depth = DEPTH_RUNBOOK.filter(d => d !== omitDepth).join(' ');
  fs.writeFileSync(path.join(root, 'templates/commands/new-project.md'), `${phases}\n${outputs}\n${renvois}\n${depth}\n`);
  poserEtapes(root, etapes);
  if (omitDepthFile !== 'templates/prd/PRD.md') {
    fs.writeFileSync(path.join(root, 'templates/prd/PRD.md'), DEPTH_PRD.filter(d => d !== omitDepth).join('\n') + '\n');
  }
  if (omitDepthFile !== 'templates/specs/architecture.md') {
    fs.writeFileSync(path.join(root, 'templates/specs/architecture.md'), DEPTH_ARCHI.filter(d => d !== omitDepth).join('\n') + '\n');
  }
  if (!omitTemplate) {
    fs.writeFileSync(path.join(root, 'templates/agents/loop-section.md'), 'boucle');
    fs.writeFileSync(path.join(root, 'templates/agents/design-rule.md'), 'design');
    fs.writeFileSync(path.join(root, 'templates/agents/subagents-rule.md'), 'subagents');
    fs.writeFileSync(path.join(root, 'templates/agents/verify-rule.md'), 'verify');
    fs.writeFileSync(path.join(root, 'templates/agents/reality-rule.md'), 'reality');
    fs.writeFileSync(path.join(root, 'templates/agents/proof-rule.md'), 'proof');
    fs.writeFileSync(path.join(root, 'templates/agents/secrets-cost-rule.md'), 'secrets');
    fs.writeFileSync(path.join(root, 'templates/agents/css-maquette-rule.md'), 'css');
  }
  return root;
}

test('runbook complet + templates → aucune erreur, dossier d\'étapes vide OU peuplé', () => {
  // (a) Avant le découpage : aucun dossier d'étapes. Tout retombe sur l'entrée.
  assert.deepEqual(validateNewProjectCommand(makeRoot()), []);
  // (b) Après le découpage : chaque marqueur dans SON étape. Même verdict — c'est l'équivalence
  //     qui rend le repli sur l'entrée honnête, au lieu d'un simple « on ne regarde pas ».
  assert.deepEqual(validateNewProjectCommand(makeRoot({ etapes: { } })), []);
});
test('phase manquante → erreur (dans l\'entrée, comme dans SON étape)', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitPhase: 'PRD' })).some(e => /PRD/.test(e)));
  // ANCRAGE. L'entrée porte toujours « Roadmap » : un validateur qui concatènerait les étapes
  // trouverait le mot et passerait. Ancré, il exige la phase dans l'étape qui la porte.
  const errs = validateNewProjectCommand(makeRoot({ etapes: { etape: '06-roadmap.md', omitMarqueur: 'Roadmap' } }));
  assert.ok(errs.some(e => /new-project\/06-roadmap\.md : phase manquante « Roadmap »/.test(e)), `vu : ${JSON.stringify(errs)}`);
  // …et un marqueur de profondeur est ancré comme une phase : `@shadcnblocks` appartient à
  // l'étape scaffold (Phase 7), pas à l'étape design qui, elle, ne doit pas l'appeler.
  const prof = validateNewProjectCommand(makeRoot({ etapes: { etape: '07-scaffold.md', omitMarqueur: '@shadcnblocks' } }));
  assert.ok(prof.some(e => /07-scaffold\.md : template pas assez détaillé, manque « @shadcnblocks »/.test(e)), `vu : ${JSON.stringify(prof)}`);
  // …et une étape que la carte nomme mais qui n'est pas sur le disque est DITE, jamais repliée en
  // silence sur l'entrée : c'est ce repli-là qui viderait la carte de son sens.
  const trou = validateNewProjectCommand(makeRoot({ etapes: { omitEtape: '02-prd.md' } }));
  assert.ok(trou.some(e => /étape manquante : templates\/commands\/new-project\/02-prd\.md/.test(e)), `vu : ${JSON.stringify(trou)}`);
  assert.equal(trou.some(e => /phase manquante « PRD »/.test(e)), false, 'l\'étape absente ne doit pas être confondue avec un contenu manquant');
});
test('template manquant → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitTemplate: true })).some(e => /loop-section/.test(e)));
});
test('runbook pas assez détaillé (marqueur de profondeur manquant) → erreur', () => {
  assert.ok(validateNewProjectCommand(makeRoot({ omitDepth: 'EXPERIENCE.md' })).some(e => /profondeur|EXPERIENCE/.test(e)));
});
// D9 — le contrôle de profondeur a SUIVI le contenu déplacé. Sans ces deux cas, vider
// templates/prd/PRD.md repasserait au vert : le validateur ne regarderait plus que le runbook.
test('template PRD amputé d\'un marqueur → erreur', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitDepth: 'Métriques de succès' }));
  assert.ok(errs.some(e => /templates\/prd\/PRD\.md.*Métriques de succès/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('template architecture amputé d\'un marqueur → erreur', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitDepth: 'Graine structurelle' }));
  assert.ok(errs.some(e => /templates\/specs\/architecture\.md.*Graine structurelle/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('template déplacé absent → erreur', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitDepthFile: 'templates/prd/PRD.md' }));
  assert.ok(errs.some(e => /template manquant : templates\/prd\/PRD\.md/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('runbook qui ne cite plus le template déplacé → erreur (un template que personne n\'ouvre)', () => {
  const errs = validateNewProjectCommand(makeRoot({ omitRenvoi: 'docs/templates/PRD.md' }));
  assert.ok(errs.some(e => /jamais cité.*docs\/templates\/PRD\.md/.test(e)), `vu : ${JSON.stringify(errs)}`);
});
test('runbook absent → erreur unique', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-'));
  const errs = validateNewProjectCommand(root);
  assert.ok(errs.some(e => /new-project\.md/.test(e)));
});
