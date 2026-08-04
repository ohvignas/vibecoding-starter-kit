// scripts/lib/degraissage.test.mjs
// Lot A — dégraissage. Un test par suppression : ce qui part doit partir PARTOUT
// (fichier, code qui le copie, validateur qui l'exige, doc qui le cite).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as validators from './validate-commands.mjs';
import { validateExtras, validateMemoryTemplates } from './validate-commands.mjs';
import { parseArgs } from './args.mjs';
import { runWizard, buildArgsFromAnswers } from './wizard.mjs';
import { kitOwnedFiles } from './kit-owned.mjs';
import { COMMANDS, etapesDuRunbook } from './commands-list.mjs';
import { buildCursorPlugin } from '../build-cursor-plugin.mjs';
import { renderSetupAi } from './setup-ai.mjs';
import { resolveAssets, resolveStackManifest } from './matrix.mjs';
import { pickFromClone } from './external.mjs';
import { renderProjectAgentsMd } from './templates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NULL_OUT = { write() {} };
const scripted = (answers) => { let i = 0; return async () => answers[i++]; };
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

test('A1 — le dream hook a disparu (template, validateur, rendu AGENTS.md)', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates/dream')), 'templates/dream/ doit être supprimé');
  assert.equal(validators.validateDreamTemplate, undefined, 'validateDreamTemplate ne doit plus exister');
  assert.doesNotMatch(renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor' }), /DREAM\.md/);
});

test('A2 — l\'Action memory-consolidate a disparu, la consolidation reste une instruction', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates/memory-consolidate')), 'templates/memory-consolidate/ doit être supprimé');
  assert.deepEqual(validateMemoryTemplates(ROOT), []);
  const rules = fs.readFileSync(path.join(ROOT, 'templates/agents/memory-rules.md'), 'utf8');
  // La chaîne littérale reste exigée par validateMemoryTemplates — mais plus comme un cron.
  assert.match(rules, /consolidate-memory/);
  assert.doesNotMatch(rules, /hebdomadaire|Action planifiée|cron/i);
});

test('A3 — le code d\'accès a disparu (module, drapeau, question du wizard)', async () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts/lib/license.mjs')), 'scripts/lib/license.mjs doit être supprimé');
  assert.equal('license' in parseArgs(['--project', 'x']), false, 'parseArgs ne doit plus porter license');
  assert.throws(() => parseArgs(['--project', 'x', '--license', 'VIBE-0000']), /Argument inconnu/);
  assert.equal('license' in buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, {}), false);
  // Le wizard pose 5 questions max (stack, assistant, nom, backend, apprentissage) — plus de 6e.
  const a = await runWizard(scripted(['1', '2', 'mon-app', '2', 'o']), false, NULL_OUT);
  assert.deepEqual(a, { stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', learning: true });
});

test('A4 — templates/ONBOARDING.md a disparu (fichier + validateur extras)', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates/ONBOARDING.md')), 'templates/ONBOARDING.md doit être supprimé');
  assert.deepEqual(validateExtras(ROOT), []);
});

// Les ÉTAPES que le kit porte aujourd'hui, `<cmd>/<fichier>`. Un runbook trop long se découpe en
// `templates/commands/<cmd>/NN-….md` ; le dossier est vide tant que le découpage n'a pas eu lieu.
const ETAPES_KIT = () => COMMANDS.flatMap((c) => etapesDuRunbook(ROOT, c).map((e) => `${c}/${e}`));

test('A5 — /debug a disparu (template, scaffold, refresh, plugin Cursor, aide)', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates/commands/debug.md')), 'templates/commands/debug.md doit être supprimé');
  const owned = kitOwnedFiles('saas', 'cursor').map((p) => p.to);
  assert.ok(!owned.some((t) => t.endsWith('/debug.md')), '--refresh ne doit plus régénérer debug.md');

  // « exactement 10 fichiers sous `.cursor/commands/` » devient faux à la première étape livrée.
  // On ne relâche pas le compte pour autant (un `>= 10` laisserait rentrer une 11ᵉ commande
  // fantôme) : on sépare les deux populations, et CHACUNE reste exacte — les ENTRÉES sont les 10
  // runbooks, les ÉTAPES sont exactement celles que porte le kit, ni plus ni moins.
  const sousCommands = owned.filter((t) => t.startsWith('.cursor/commands/'));
  const profondeur = (t) => t.split('/').length; // `.cursor/commands/x.md` = 3, une étape = 4
  assert.equal(sousCommands.filter((t) => profondeur(t) === 3).length, 10, '10 commandes attendues');
  assert.deepEqual(
    sousCommands.filter((t) => profondeur(t) > 3).sort(),
    ETAPES_KIT().map((e) => `.cursor/commands/${e}`).sort(),
    '--refresh doit régénérer exactement les étapes du kit, aucune de plus',
  );

  const out = tmp('vs-degraissage-plugin-');
  buildCursorPlugin(ROOT, out);
  assert.ok(!fs.existsSync(path.join(out, 'commands', 'debug.md')), 'le plugin Cursor ne doit plus embarquer debug.md');
  const dansPlugin = fs.readdirSync(path.join(out, 'commands'), { withFileTypes: true });
  assert.equal(dansPlugin.filter((d) => d.isFile()).length, 10, 'le plugin embarque les 10 entrées');
  // …et leurs étapes : la copie est fichier par fichier, un sous-dossier oublié publierait un
  // sommaire qui renvoie à des fichiers absents.
  assert.deepEqual(
    dansPlugin.filter((d) => d.isDirectory()).flatMap((d) => fs.readdirSync(path.join(out, 'commands', d.name)).map((n) => `${d.name}/${n}`)).sort(),
    ETAPES_KIT().sort(),
    'le plugin Cursor doit embarquer exactement les étapes du kit',
  );
  fs.rmSync(out, { recursive: true, force: true });

  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'templates/commands/help.md'), 'utf8'), /\/debug\b/);
});

test('A6 — PixelRAG n\'est plus un prérequis : cité, jamais installé', () => {
  const render = (stack) => renderSetupAi({ stack, assistant: 'cursor', manifest: resolveStackManifest(stack, 'cursor'), superpowersCmd: 'x', skillsInstalled: true });
  for (const s of ['saas', 'mobile', 'desktop', 'vitrine']) {
    assert.doesNotMatch(render(s), /pip install/, `${s} : aucune install Python en prérequis`);
  }
  const md = render('saas');
  assert.match(md, /PixelRAG/, 'PixelRAG reste cité comme comparaison visuelle');
  // Cité ≠ à faire : aucune case à cocher ne porte PixelRAG.
  for (const line of md.split('\n')) {
    if (/PixelRAG/.test(line)) assert.doesNotMatch(line, /^\s*-\s*\[ \]/, `case à cocher interdite : ${line}`);
  }
});

test('A7 — la règle karpathy clonée est chargée à la demande, jamais en permanence', () => {
  const pick = resolveAssets('saas', 'cursor').clones[0].picks[0];
  assert.equal(pick.transform, 'mdc-on-demand', 'la copie Cursor doit être transformée');

  const clone = tmp('vs-degraissage-clone-'), proj = tmp('vs-degraissage-proj-');
  fs.mkdirSync(path.join(clone, '.cursor/rules'), { recursive: true });
  fs.writeFileSync(path.join(clone, pick.src), '---\ndescription: Karpathy\nglobs:\nalwaysApply: true\n---\n\n# Guidelines\n');
  const res = pickFromClone(clone, [pick], proj);
  assert.equal(res[0].status, 'copied');
  const copied = fs.readFileSync(path.join(proj, pick.to), 'utf8');
  assert.match(copied, /^alwaysApply: false$/m);
  assert.doesNotMatch(copied, /alwaysApply: true/);
  assert.match(copied, /# Guidelines/, 'le contenu de la règle est préservé');
  fs.rmSync(clone, { recursive: true, force: true });
  fs.rmSync(proj, { recursive: true, force: true });
});

test('A8 — .gitignore couvre les dossiers de travail des agents', () => {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.match(gi, /^\.superpowers\/$/m);
  assert.match(gi, /^\.claude\/worktrees\/$/m);
});

// @garde-orphelins — ce fichier PORTE les motifs traqués : ils n'y sont pas des références.

// Les fichiers suivis que A9 inspecte. ai-context/ = dumps de docs tierces ; docs/superpowers/ =
// plans et audits (mémoire du projet). Le marqueur n'exempte de rien dans ces deux dossiers,
// puisqu'ils sont déjà hors périmètre : A10 les ignore pour la même raison.
const suivis = () => execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0')
  .filter(Boolean)
  .filter((f) => !f.startsWith('ai-context/') && !f.startsWith('docs/superpowers/'));

// PORTÉE DU MARQUEUR — les tests de `scripts/lib/`, et eux seuls.
// CONTREPARTIE, à dire puisqu'elle est réelle : un fichier qui porte `@garde-orphelins` se
// soustrait ENTIÈREMENT à A9, motifs compris — ce n'est pas une exemption ligne à ligne. Sans
// restriction de portée, n'importe quel fichier du dépôt (un template, un doc, un runbook livré à
// l'utilisateur) pouvait donc s'exempter du contrôle « zéro orphelin » en portant ce mot. Le
// marqueur n'a de raison d'être que là où un test TRAQUE ces chaînes et les contient forcément ;
// A10 refuse qu'il apparaisse ailleurs.
const ZONE_GARDE = /^scripts\/lib\/[\w.-]+\.test\.mjs$/;

test('A9 — zéro orphelin : plus aucune référence aux éléments supprimés', () => {
  const files = suivis();

  const MOTIFS = [
    /ONBOARDING/,
    /DREAM\.md/,
    /templates\/dream/,
    /dream hook/i,
    /memory-consolidate/,
    /\/debug\b/,
    /VIBE-/,
    /pip install pixelrag/,
    /license\.mjs/,
  ];
  const restes = [];
  for (const f of files) {
    const abs = path.join(ROOT, f);
    let txt;
    try { txt = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    if (txt.includes('\0')) continue; // binaire
    // Un fichier qui TRAQUE ces chaînes en contient forcément : ses motifs ne sont pas des
    // références orphelines. Il le déclare lui-même par le marqueur ci-dessous, au lieu d'être
    // ajouté ici à la main — sinon chaque nouveau garde casse celui-ci le jour où il est
    // commité (et pas avant : `git ls-files` ne voit pas un fichier encore non suivi).
    // Seuls les tests de `scripts/lib/` peuvent se déclarer garde (cf. ZONE_GARDE et A10) :
    // ailleurs, le marqueur serait une porte de sortie ouverte à tout le dépôt.
    if (ZONE_GARDE.test(f) && txt.includes('@garde-orphelins')) continue;
    txt.split('\n').forEach((line, i) => {
      for (const m of MOTIFS) if (m.test(line)) restes.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(restes, [], `références orphelines :\n${restes.join('\n')}`);
});

test('A10 — le marqueur @garde-orphelins ne s\'utilise que dans les tests de scripts/lib/', () => {
  const MARQUEUR = ['@garde', 'orphelins'].join('-'); // concaténé : ce test n'est pas un garde.
  const hors = [];
  for (const f of suivis()) {
    if (ZONE_GARDE.test(f)) continue;
    let txt;
    try { txt = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    if (txt.includes('\0')) continue; // binaire
    if (txt.includes(MARQUEUR)) hors.push(f);
  }
  assert.deepEqual(hors, [], [
    `Fichiers hors zone qui portent le marqueur « ${MARQUEUR} » :`,
    ...hors,
    '',
    'Ce marqueur ne rend pas une ligne acceptable : il retire le fichier ENTIER du contrôle A9.',
    'Il est réservé aux tests de scripts/lib/, qui traquent ces chaînes et les contiennent donc',
    'forcément. Ailleurs, c\'est une exemption gratuite au contrôle « zéro orphelin ».',
  ].join('\n'));
});
