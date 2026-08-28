import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsWizard, buildArgsFromAnswers, renderBackendNote, runWizard, wireSigint, renderNonTtyHelp, ASSISTANTS, choisirMode } from './wizard.mjs';
import { ASSISTANT_KEYS } from './args.mjs';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..', '..');

const NULL_OUT = { write() {} };
const scripted = (answers) => { let i = 0; return async () => answers[i++]; };

test('needsWizard : TTY + config incomplète (le wizard complète) ; --yes = jamais de questions', () => {
  assert.equal(needsWizard([], true), true);
  assert.equal(needsWizard([], false), false);
  assert.equal(needsWizard(['--stack', 'saas'], true), true); // incomplet + TTY → le wizard complète
  assert.equal(needsWizard(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x'], true), false);
  assert.equal(needsWizard(['--stack', 'saas'], false), false);
  assert.equal(needsWizard(['--yes'], true), false);
});

test('buildArgsFromAnswers : mappe + défauts + validation', () => {
  const a = buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local' }, { caveman: true });
  assert.equal(a.stack, 'saas');
  assert.equal(a.source, null); // null = setup.mjs y mettra la racine du kit
  assert.equal(a.backend, 'local');
  assert.equal(a.caveman, true); // caveman vient du flag --caveman (base), plus du wizard
  assert.equal(a.dryRun, false);
});

test('buildArgsFromAnswers : conserve les drapeaux CLI déjà passés (base)', () => {
  const base = { source: '../kit', noSkills: true, force: true, dryRun: false };
  const a = buildArgsFromAnswers({ stack: 'mobile', assistant: 'cursor', project: 'app' }, base);
  assert.equal(a.source, '../kit');
  assert.equal(a.noSkills, true);
  assert.equal(a.force, true);
});

test('buildArgsFromAnswers : rejette une entrée invalide', () => {
  assert.throws(() => buildArgsFromAnswers({ stack: 'flutter', assistant: 'claude-code', project: 'x' }), /stack/);
  assert.throws(() => buildArgsFromAnswers({ stack: 'saas', assistant: 'claude-code', project: 'nom invalide!' }), /project/);
});

test('caveman opt-in : buildArgsFromAnswers ne l\'active que via le flag --caveman', () => {
  const off = buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, {});
  assert.equal(off.caveman, false);
  const on = buildArgsFromAnswers({ stack: 'saas', assistant: 'cursor', project: 'x' }, { caveman: true });
  assert.equal(on.caveman, true);
});

test('renderBackendNote : saas+local seulement', () => {
  assert.match(renderBackendNote('saas', 'local'), /convex deployment select local/);
  assert.equal(renderBackendNote('saas', 'cloud'), '');
  assert.equal(renderBackendNote('desktop', 'local'), '');
});

test('runWizard : saas → demande le backend, produit les bons args', async () => {
  const ask = scripted(['1', '2', 'mon-app', '2', 'o']); // saas, claude-code, nom, backend local, apprentissage oui (ni caveman ni code d'accès)
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'saas', assistant: 'claude-code', project: 'mon-app', backend: 'local', learning: true });
});

test('runWizard : redemande sur choix invalide (mobile → pas de backend)', async () => {
  const ask = scripted(['9', '2', '1', 'app', 'n']); // stack 9 invalide→2 mobile ; assistant 1 cursor ; nom ; apprentissage non
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'mobile', assistant: 'cursor', project: 'app', backend: 'cloud', learning: false });
});

test('runWizard : vitrine (choix 4) → pas de question backend', async () => {
  const ask = scripted(['4', '1', 'site', 'n']); // vitrine, cursor, nom, apprentissage non
  const a = await runWizard(ask, false, NULL_OUT);
  assert.deepEqual(a, { stack: 'vitrine', assistant: 'cursor', project: 'site', backend: 'cloud', learning: false });
});

test('wireSigint : Ctrl+C → message + exit 130', () => {
  const handlers = {};
  const rl = { on(evt, cb) { handlers[evt] = cb; } };
  const codes = [], msgs = [];
  wireSigint(rl, (c) => codes.push(c), (m) => msgs.push(m));
  handlers.SIGINT();
  assert.deepEqual(codes, [130]);
  assert.match(msgs[0], /annulée/);
});

test('renderNonTtyHelp : mentionne les drapeaux, PowerShell et Git Bash', () => {
  const h = renderNonTtyHelp();
  assert.match(h, /--stack/);
  assert.match(h, /--assistant/);
  assert.match(h, /--project/);
  assert.match(h, /PowerShell/);
  assert.match(h, /Git Bash/);
});

test('une seule liste d\'assistants : le menu accroche ses libellés aux clés d\'args.mjs', () => {
  // Elles vivaient en double — les clés dans `args.mjs` (que `validateArgs` exige), la liste
  // complète ici — et le parcours adopté jugeait contre CELLE-CI pendant que les autres branches
  // jugeaient contre l'autre. Deux vérités pour la même chose : le menu DÉRIVE désormais des clés.
  assert.deepEqual(ASSISTANTS.map((a) => a.key), ASSISTANT_KEYS);
  for (const a of ASSISTANTS) {
    assert.ok(a.label && a.label !== a.key, `assistant « ${a.key} » : libellé manquant dans le menu`);
  }
});

test('choisirMode : l\'ordre des modes du CLI, asserté sans TTY réel', () => {
  // `needsWizard` sort à la première ligne hors TTY : un test qui lance le CLI par un pipe ne
  // mesure jamais l'ordre. Ici il est pur, donc mesurable.
  assert.equal(choisirMode(['--refresh'], true), 'refresh');
  assert.equal(choisirMode(['--adopt'], true), 'adopt');
  assert.equal(choisirMode([], true), 'wizard');
  assert.equal(choisirMode([], false), 'drapeaux');
  assert.equal(choisirMode(['--yes'], true), 'drapeaux', '--yes = jamais de questions, même en TTY');
});

// ── LA PREMIÈRE PHRASE QUE LE DÉBUTANT LIT, ET QUE PERSONNE NE RELISAIT ────────────────────────
// Le menu du wizard décrit chaque stack en une ligne. C'est le TOUT PREMIER texte technique qu'un
// débutant lit, et c'est sur lui qu'il choisit. Il a annoncé « Astro + shadcn/ui + Keystatic
// (CMS) » pendant tout le temps où la stack quittait Keystatic pour Convex : les six documents de
// la stack avaient été réécrits, le menu non, et RIEN ne rougissait — aucun test ne lisait ces
// libellés.
//
// La propriété : une techno nommée dans un libellé doit être nommée dans le README de la stack
// concernée. Le README est la source de vérité (il est tenu par `agents-templates`, `faits-stacks`
// et `promesses-livrees`) ; le menu n'est qu'un résumé. Un résumé qui cite ce que la source ne
// cite plus est périmé, par construction.
//
// ⚠️ ON LIT LE MENU RÉEL, PAS LA CONSTANTE. `STACKS` n'est pas exportée par `wizard.mjs`, et c'est
// tant mieux : on joue le wizard, on capture ce qu'il ÉCRIT, et on rattache chaque ligne à sa
// stack en relisant la clé que ce choix produit. Aucun ordre supposé, aucun libellé recopié.
async function libellesDuMenu() {
  const lignes = [];
  const out = { write: (s) => lignes.push(s) };
  await runWizard(scripted(['1', '1', 'x', '1', '']), false, out);
  const menu = lignes.find((l) => /^\s*1\)/m.test(l));
  assert.ok(menu, 'montage : le menu des stacks n\'a pas été capturé');
  return menu.split('\n').flatMap((l) => l.match(/^\s*(\d+)\)\s+(.+)$/)?.slice(1) ? [[Number(RegExp.$1), RegExp.$2]] : []);
}

test('menu du wizard : aucun libellé de stack ne nomme une techno absente du README de cette stack', async () => {
  const entrees = await libellesDuMenu();
  assert.ok(entrees.length >= 4, `montage : ${entrees.length} lignes de menu lues`);
  const fautes = [];
  for (const [numero, ligne] of entrees) {
    // La clé de la stack est celle que CE choix produit — relue, pas devinée.
    const { stack } = await runWizard(scripted([String(numero), '1', 'x', '1', '']), false, NULL_OUT);
    const readme = fs.readFileSync(path.join(RACINE, `stacks/${stack}/README.md`), 'utf8');
    // Une « techno » = un mot capitalisé du libellé (Convex, Astro, TanStack, Electron, SEO…).
    // Les mots en minuscules (« site », « dashboard ») décrivent la disposition, pas un outil.
    for (const mot of ligne.match(/\b[A-Z][A-Za-z0-9.]*\b/g) ?? []) {
      if (!readme.includes(mot)) fautes.push(`menu ${numero} (${stack}) : « ${mot} » — absent de stacks/${stack}/README.md`);
    }
  }
  assert.deepEqual(fautes, [], [
    'Le menu du wizard annonce une techno que le README de la stack ne nomme plus :',
    ...fautes.map((f) => `  ${f}`),
    '',
    'C\'est la première phrase que lit un débutant, et il choisit dessus. Si la stack a changé,',
    'le libellé de `STACKS` dans `scripts/lib/wizard.mjs` doit changer avec elle.',
  ].join('\n'));
});
