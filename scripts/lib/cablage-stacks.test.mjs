// Lot F — le CÂBLAGE des stacks : ce que le kit exécute vraiment, par opposition à ce qu'il
// déclare. Trois mensonges de cette famille sont corrigés ici : un check qui lance une autre
// commande que celle de la stack (F4), un `prePush` qui pointe vers un check supprimé (F5),
// un catalogue de domaines dont les déclencheurs ne pilotaient rien (F11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STACKS, AI_CONTEXT, PINS, resolveAssets, resolveStackManifest } from './matrix.mjs';
import { CHECKS, selectChecks, runChecks, resolveCheckCommand } from '../../templates/hooks/framework/checks.mjs';
import { DOMAIN_TRIGGERS, SHARED_DOMAINS, renderDomains, secretsBlock, triggerWords } from './domains.mjs';
import { writeStackEnvironment } from './environment.mjs';
import { puceDeStack, blocsDeLaPuce, jsonDuBloc } from './puce-scaffold.mjs';

const RACINE = path.resolve(import.meta.dirname, '..', '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cablage-'));

// ── F4 — le check exécute la commande DÉCLARÉE par la stack ────────────────────────────────────
// Reproduit dans le rapport : sur un projet Astro réel, `tsc --noEmit` sort 0 en n'ayant lu aucun
// `.astro` ; `astro check` (ce que déclare STACKS.vitrine.scripts.typecheck) sort 1 sur la même
// erreur de type. Le hook lançait le premier en disant faire le second.
test('F4 — typecheck lance le script déclaré par la stack, pas `tsc` en dur', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { typecheck: 'astro check' } }));
  const [r] = selectChecks(['typecheck'], { cwd: d });
  assert.equal(r.willRun, true);
  assert.deepEqual(r.cmd, ['npm', 'run', 'typecheck'], 'la commande de la stack passe par son script npm');
});

test('F4 — sans script déclaré, le check retombe sur son défaut (et le dit)', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  const [r] = selectChecks(['typecheck'], { cwd: d });
  assert.deepEqual(r.cmd, ['npx', 'tsc', '--noEmit']);
});

test('F4 — runChecks LANCE cette commande-là (pas seulement la calcule)', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { typecheck: 'astro check' } }));
  const lances = [];
  runChecks(['typecheck'], { cwd: d, log: () => {}, spawn: (file, args) => { lances.push([file, ...args]); return { status: 0 }; } });
  assert.deepEqual(lances, [['npm', 'run', 'typecheck']]);
});

test('F4 — sur Windows, `npm` aussi passe par son .cmd (même motif que npx)', () => {
  assert.deepEqual(resolveCheckCommand(['npm', 'run', 'typecheck'], 'win32'), { file: 'npm.cmd', args: ['run', 'typecheck'], options: { shell: true } });
  assert.deepEqual(resolveCheckCommand(['npm', 'run', 'typecheck'], 'darwin'), { file: 'npm', args: ['run', 'typecheck'], options: {} });
});

// ── F5 — aucun `prePush` ne peut pointer dans le vide ──────────────────────────────────────────
test('F5 — tous les checks déclarés par les stacks existent dans le registre', () => {
  const fautes = [];
  for (const [nom, s] of Object.entries(STACKS)) {
    for (const [phase, ids] of Object.entries(s.checks)) {
      for (const id of ids) if (!CHECKS[id]) fautes.push(`${nom}.checks.${phase} → « ${id} » n'existe pas dans CHECKS`);
    }
  }
  assert.deepEqual(fautes, [], `Un hook qui lance un check inconnu ne vérifie RIEN et le dit à peine :\n${fautes.join('\n')}`);
});

test('F5 — desktop garde un check au push, et il ne dépend d\'aucun paquet abandonné', () => {
  assert.ok(STACKS.desktop.checks.prePush.length, 'retirer electronegativity ne doit pas laisser le push sans filet');
  for (const id of STACKS.desktop.checks.prePush) {
    assert.doesNotMatch(CHECKS[id].cmd.join(' '), /electronegativity/);
  }
});

// ── F8 — actions GitHub ────────────────────────────────────────────────────────────────────────
// `gh api repos/actions/checkout/releases/latest` → v7.0.1 · `actions/setup-node` → v7.0.0.
test('F8 — checkout et setup-node sont au majeur courant partout', () => {
  const fichiers = [
    ...fs.readdirSync(path.join(RACINE, 'templates/ci')).map((f) => `templates/ci/${f}`),
    ...fs.readdirSync(path.join(RACINE, '.github/workflows')).map((f) => `.github/workflows/${f}`),
    'templates/security/secrets.yml',
  ];
  const fautes = [];
  for (const f of fichiers) {
    lire(f).split('\n').forEach((l, i) => {
      const m = l.match(/uses:\s*actions\/(checkout|setup-node)@v(\d+)/);
      if (m && m[2] !== '7') fautes.push(`${f}:${i + 1} — actions/${m[1]}@v${m[2]}`);
    });
  }
  assert.deepEqual(fautes, [], `Actions GitHub périmées :\n${fautes.join('\n')}`);
  // `gh api repos/gitleaks/gitleaks-action/releases/latest` → v3.0.0. La v2 tourne sur le
  // runtime Node 20, retiré des runners GitHub le 16/09/2026 : elle s'arrêtera de scanner.
  assert.match(lire('templates/security/secrets.yml'), /gitleaks\/gitleaks-action@v3/, 'le scan de secrets doit survivre au retrait de Node 20');
});

test('F3 — la CI vitrine tourne sur le Node que l\'épingle exige', () => {
  const ci = lire('templates/ci/vitrine.yml');
  const m = ci.match(/node-version:\s*'([^']+)'/);
  assert.ok(m, 'la CI vitrine doit fixer une version de Node');
  assert.equal(m[1], PINS.vitrine.node, `CI vitrine sur Node ${m[1]} alors que l'épingle exige ${PINS.vitrine.node} : la CI passerait là où l'utilisateur échoue`);
});

// ── F9 — `ai-context/` par stack ───────────────────────────────────────────────────────────────
test('F9 — une stack ne reçoit que SON contexte IA', () => {
  const dossiers = (stack) => resolveAssets(stack, 'cursor').copies
    .filter((c) => c.from.startsWith('ai-context/') && c.transform === 'dir')
    .map((c) => c.from.slice('ai-context/'.length));
  // La vitrine porte maintenant deux applications sur Convex : elle a besoin du contexte Convex
  // (2,3 Mo de llms-full), de Better Auth et de TanStack Start pour son `dashboard/`. Ce qui
  // reste exclu — et le test le dit — c'est ce qu'elle n'utilise pas : Expo et Electron.
  assert.deepEqual(dossiers('vitrine').sort(), ['astro', 'better-auth', 'convex', 'tanstack-start']);
  for (const hors of ['react-native-expo', 'electron']) {
    assert.equal(dossiers('vitrine').includes(hors), false, `une vitrine n'a rien à faire de ai-context/${hors}`);
  }
  assert.deepEqual(dossiers('desktop'), ['electron']);
  assert.deepEqual(dossiers('mobile').sort(), ['convex', 'react-native-expo']);
  assert.deepEqual(dossiers('saas').sort(), ['better-auth', 'convex', 'tanstack-start']);
  // Le README (comment s'en servir) suit toujours, sinon le dossier arrive sans mode d'emploi.
  for (const s of Object.keys(STACKS)) {
    assert.ok(resolveAssets(s, 'cursor').copies.some((c) => c.from === 'ai-context/README.md'), `${s} : README du contexte manquant`);
  }
});

test('F9 — le catalogue de contexte couvre les 4 stacks, et rien qui n\'existe pas', () => {
  assert.deepEqual(Object.keys(AI_CONTEXT).sort(), Object.keys(STACKS).sort());
  for (const [s, dirs] of Object.entries(AI_CONTEXT)) {
    for (const d of dirs) assert.ok(fs.existsSync(path.join(RACINE, 'ai-context', d)), `${s} → ai-context/${d} n'existe pas`);
  }
});

test('F9 — une stack inconnue ne part pas silencieusement sans contexte', () => {
  assert.throws(() => resolveAssets('windsurf-os', 'cursor'), /Stack inconnue/);
});

// ── F11 — les déclencheurs pilotent enfin quelque chose ────────────────────────────────────────
test('F11 — docs/DOMAINS.md porte les déclencheurs que l\'IA doit appliquer', () => {
  const md = renderDomains({ stack: 'vitrine', domains: STACKS.vitrine.domains, shared: SHARED_DOMAINS, triggers: DOMAIN_TRIGGERS });
  assert.match(md, /Déclencheurs/, 'sans eux, DOMAIN_TRIGGERS ne pilote rien');
  assert.match(md, /formulaire/, 'les mots qui allument « forms » doivent être lisibles dans le catalogue');
});

test('F11 — les déclencheurs affichés sont lisibles, pas du regex mal déshabillé', () => {
  const tous = Object.entries(DOMAIN_TRIGGERS).flatMap(([k, re]) => triggerWords(re).map((m) => [k, m]));
  assert.ok(tous.length > 40, 'tous les domaines doivent produire des mots');
  for (const [k, m] of tous) {
    // `\bmail\b` déshabillé dans le mauvais ordre donne « bmailb » : illisible, et surtout
    // introuvable dans un PRD — le déclencheur affiché ne correspondrait plus à celui qui tourne.
    assert.doesNotMatch(m, /[\\^$*+?[\]{}|]/, `${k} : « ${m} » garde un caractère de regex`);
    assert.doesNotMatch(m, /\bb[a-zéèêà]+b\b/, `${k} : « ${m} » ressemble à un \\b non retiré`);
    assert.doesNotMatch(m, /''/, `${k} : « ${m} » double l'apostrophe`);
  }
  // Et ils doivent VRAIMENT allumer leur domaine : un mot affiché qui n'allume rien est un
  // mensonge de plus.
  for (const [k, m] of tous) {
    if (/^[a-zéèêàç' -]+$/i.test(m)) assert.ok(DOMAIN_TRIGGERS[k].test(m), `${k} : « ${m} » est affiché mais n'allume pas le domaine`);
  }
});

test('F11 — selectDomains marque les domaines détectés dans le PRD', () => {
  const prd = 'Un site vitrine avec un formulaire de contact et une version anglaise.';
  const md = renderDomains({ stack: 'vitrine', domains: STACKS.vitrine.domains, shared: SHARED_DOMAINS, triggers: DOMAIN_TRIGGERS, prd });
  assert.match(md, /Formulaire de contact.*🎯|🎯.*Formulaire de contact/, 'forms est allumé par « formulaire de contact »');
  assert.match(md, /Multilingue.*🎯|🎯.*Multilingue/, 'i18n est allumé par « version anglaise »');
  assert.doesNotMatch(md, /SEO technique.*🎯/, 'un domaine sans déclencheur dans le PRD n\'est pas marqué');
});

test('F11 — les secrets déclarés par les domaines atterrissent dans .env.example', () => {
  const bloc = secretsBlock(STACKS.saas.domains);
  for (const s of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'VITE_POSTHOG_KEY', 'VITE_SENTRY_DSN']) {
    assert.match(bloc, new RegExp(`${s}=`), `${s} est déclaré dans matrix.mjs et doit être proposé`);
  }
  // Idempotent : ce que le fichier contient déjà n'est pas redonné.
  const dejaLa = secretsBlock(STACKS.vitrine.domains, 'PUBLIC_WEB3FORMS_KEY=\n');
  assert.doesNotMatch(dejaLa, /PUBLIC_WEB3FORMS_KEY/, 'la vitrine a déjà cette clé dans son modèle');
});

test('F11 — le scaffold écrit vraiment ces secrets dans le .env.example du projet', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, '.env.example'), '# base\nVITE_CONVEX_URL=\n');
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'saas', assistant: 'cursor' });
  const env = fs.readFileSync(path.join(d, '.env.example'), 'utf8');
  assert.match(env, /STRIPE_SECRET_KEY=/);
  assert.match(env, /RESEND_API_KEY=/);
  assert.match(env, /VITE_CONVEX_URL=/, 'ce qui y était reste');
  // Deux passages ne doublent pas le bloc.
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'saas', assistant: 'cursor' });
  const deux = fs.readFileSync(path.join(d, '.env.example'), 'utf8');
  assert.equal(deux.match(/STRIPE_SECRET_KEY=/g).length, 1, 'le bloc de secrets ne doit pas se dupliquer');
});

// ── V2 — DEUX APPLICATIONS, UNE RACINE, ET DES CHECKS QUI MORDENT ENCORE ───────────────────────
// La vitrine ne scaffolde plus une application mais deux : `site/` (Astro, pages publiques) et
// `dashboard/` (TanStack Start). Le runner de checks, lui, lit le `package.json` du dossier
// COURANT (`templates/hooks/framework/checks.mjs`) — et quand il ne trouve pas de quoi travailler,
// il ne rougit pas : il pose `willRun: false` avec une raison et passe au suivant. Une racine nue
// au-dessus de deux sous-dossiers rend donc un pre-commit VERT qui n'a rien vérifié.
//
// Les tests couvrent les deux sens, ET les deux façons de ne rien vérifier :
//   · la racine n'a pas de quoi lancer le check    → `willRun: false`, silence
//   · la racine lance bien, mais dans le vide      → exit 0, silence  ← le piège de `--if-present`
// Le second est le plus dangereux : `checks.mjs` annonce `willRun: true, via: 'script'`, donc pas
// même la ligne « check sauté ». Il ne se voit qu'en LANÇANT la commande et en regardant où elle
// est passée — c'est ce que fait `lancerDepuisLaRacine`.

const VITRINE = resolveStackManifest('vitrine', 'cursor');

// La racine telle que le runbook de scaffold doit la laisser. Chaque paramètre retire UNE pièce :
// c'est ce qui permet de montrer laquelle fait taire le check. `scriptsPar` décide quels scripts
// CHAQUE application déclare — parce que la conformité des deux workspaces est précisément ce que
// la production ne garantit pas : `npm create convex@latest -- -t tanstack-start` sort un
// `dashboard/` SANS `typecheck` ni `lint`.
//
// `pkg` et `apps` servent à V2bis, plus bas : là, la racine n'est plus DÉCRITE par le test mais
// DÉRIVÉE du runbook, et une pièce que le runbook oublie de faire poser doit pouvoir manquer —
// y compris le `package.json` de la racine ou l'une des deux applications. Les défauts
// reproduisent la racine complète : aucun appel existant ne change de sens.
function racineDeuxApps({ pkg = true, tsconfig = true, biome = true, workspaces = VITRINE.workspaces, apps = VITRINE.workspaces, scriptsPar = {} } = {}) {
  const d = tmp();
  if (pkg) fs.writeFileSync(path.join(d, 'package.json'), `${JSON.stringify({ name: 'mon-site', private: true, workspaces }, null, 2)}\n`);
  if (tsconfig) fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  if (biome) fs.writeFileSync(path.join(d, 'biome.json'), '{}');
  for (const app of apps) {
    const ids = scriptsPar[app] ?? Object.keys(VITRINE.scripts);
    fs.mkdirSync(path.join(d, app), { recursive: true });
    // Le script de l'application dépose une marque : c'est ce qui prouvera que la commande de la
    // racine est VRAIMENT entrée dans les deux workspaces, au lieu de le laisser croire.
    fs.writeFileSync(path.join(d, app, 'marque.mjs'), `import fs from 'node:fs';\nfs.writeFileSync(\`\${process.env.MARQUE}/${app}.\${process.argv[2]}\`, '');\n`);
    const scripts = Object.fromEntries(ids.map((id) => [id, `node marque.mjs ${id}`]));
    fs.writeFileSync(path.join(d, app, 'package.json'), `${JSON.stringify({ name: app, version: '0.0.0', scripts }, null, 2)}\n`);
  }
  return d;
}

// Lance depuis la racine la commande que le hook lancerait, et rend ce que npm a fait : son code
// de sortie, et la liste des applications réellement visitées (une marque par application).
function lancerDepuisLaRacine(d, id) {
  const { file, args, options } = resolveCheckCommand(['npm', 'run', id]);
  let status = 0;
  try {
    execFileSync(file, args, { cwd: d, stdio: 'pipe', env: { ...process.env, MARQUE: d }, ...options });
  } catch (e) { status = e.status ?? 1; }
  return { status, visites: VITRINE.workspaces.filter((w) => fs.existsSync(path.join(d, `${w}.${id}`))) };
}

test('V2 — deux apps et une racine nue : les DEUX checks du pre-commit se sautent, et rien ne rougit', () => {
  const d = racineDeuxApps({ tsconfig: false, biome: false });
  const vus = selectChecks(STACKS.vitrine.checks.preCommit, { cwd: d });
  assert.deepEqual(vus.map((c) => c.willRun), [false, false], 'c\'est le défaut que cette tâche doit rendre impossible');
  assert.match(vus[0].reason, /tsconfig\.json/);
  assert.match(vus[1].reason, /biome\.json/);
  // …et ce que ça donne à l'usage : le hook ne LANCE rien et sort 0. Vert, sans avoir vérifié.
  const lances = [];
  const code = runChecks(STACKS.vitrine.checks.preCommit, { cwd: d, log: () => {}, spawn: (f, a) => { lances.push([f, ...a]); return { status: 0 }; } });
  assert.equal(code, 0);
  assert.deepEqual(lances, [], 'un pre-commit qui ne lance RIEN et sort vert est pire qu\'un pre-commit absent');
});

// ⚠️ CE TEST DISAIT L'INVERSE, ET C'ÉTAIT UN BUG DE `checks.mjs`, PAS UNE PROPRIÉTÉ À TENIR.
// Il asseyait que `needs` est évalué AVANT le script, donc qu'une racine sans `tsconfig.json` ni
// `biome.json` saute ses deux checks même avec des scripts parfaits. Conséquence mesurée sur un
// scaffold vitrine RÉEL : les deux templates posent `lint` (eslint, installé, configuré) et le
// hook répondait « sauté (absent: biome.json) » — un contrôle qui existe, et qu'on saute.
// `needs` est le prérequis de la commande PAR DÉFAUT. Un script déclaré la remplace, donc s'en
// passe. Le sens qui compte est conservé juste au-dessus : ni script NI fichier `needs` → sauté.
test('V2 — un script déclaré à la racine SUFFIT : `needs` ne gate que le repli', () => {
  const d = racineDeuxApps({ tsconfig: false, biome: false });
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'vitrine', assistant: 'cursor' });
  const pkg = JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.typecheck, VITRINE.scripts.typecheck, 'le kit a bien posé le script');
  const vus = selectChecks(['typecheck', 'lint'], { cwd: d });
  assert.deepEqual(vus.map((c) => c.willRun), [true, true],
    'la racine déclare les deux scripts : les gater sur le fichier de config d\'un outil qu\'elle n\'utilise pas saute un contrôle qui existe');
  assert.deepEqual(vus.map((c) => c.via), ['script', 'script'], 'et c\'est bien la STACK qui pilote, pas le repli');
  // …et l'autre sens, dans le même souffle : sans script déclaré, le fichier `needs` redevient la
  // condition. Sans cette moitié, on aurait remplacé un gate trop strict par aucun gate du tout.
  const nu = racineDeuxApps({ tsconfig: false, biome: false });
  assert.deepEqual(selectChecks(['typecheck', 'lint'], { cwd: nu }).map((c) => c.willRun), [false, false],
    'racine sans script ET sans fichier `needs` : le repli n\'a pas de quoi tourner, on saute');
});

test('V2 — script absent de la racine : le check retombe sur un défaut qui n\'entre dans aucun workspace', () => {
  const d = racineDeuxApps();
  const [r] = selectChecks(['typecheck'], { cwd: d });
  assert.equal(r.via, 'defaut', 'sans script à la racine, la stack n\'est plus ce qui pilote le check');
  assert.notDeepEqual(r.cmd, ['npm', 'run', 'typecheck']);
  // `npx tsc --noEmit` à la racine ne lit aucun `.astro` et n'entre ni dans site/ ni dans
  // dashboard/ : il sort vert en n'ayant rien vérifié. C'est le repli, pas le contrôle.
  assert.deepEqual(r.cmd, ['npx', 'tsc', '--noEmit']);
});

test('V2 — scripts posés par le kit : les checks mordent, et CHACUN des trois entre dans les DEUX apps', () => {
  const d = racineDeuxApps();
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'vitrine', assistant: 'cursor' });

  for (const id of ['typecheck', 'lint']) {
    const [r] = selectChecks([id], { cwd: d });
    assert.equal(r.willRun, true, `${id} : doit tourner`);
    assert.equal(r.via, 'script', `${id} : c'est la stack qui pilote, pas le repli`);
    assert.deepEqual(r.cmd, ['npm', 'run', id]);
  }

  // LA PREUVE, et elle n'est pas textuelle : on lance la commande que le hook lancerait et on
  // regarde où elle est passée. LES TROIS scripts, pas seulement `typecheck` : muter un seul
  // d'entre eux doit rougir. (Mesuré : `npm run --workspaces` entre dans chaque workspace sans
  // `npm install` préalable, en ~0,7 s.)
  for (const id of Object.keys(VITRINE.scripts)) {
    const { status, visites } = lancerDepuisLaRacine(d, id);
    assert.equal(status, 0, `${id} : la commande de la racine doit réussir sur une racine conforme`);
    assert.deepEqual(visites, VITRINE.workspaces, `le \`${id}\` de la racine n'est pas entré dans toutes les applications — il en vérifie une sur deux`);
  }
});

// ── LE PIÈGE QUE `--if-present` REMETTAIT ─────────────────────────────────────────────────────
// `npm create convex@latest -- -t tanstack-start` sort un `dashboard/` qui ne déclare NI
// `typecheck` NI `lint`. Avec `--if-present`, la commande de la racine saute cette application
// SANS UN MOT et sort 0 — et comme `checks.mjs` a déjà répondu `willRun: true, via: 'script'`,
// il n'affiche pas non plus « check sauté ». Le hook sort vert en ayant vérifié une app sur deux
// (typecheck) ou zéro (lint, que ni l'une ni l'autre ne déclare).
test('V2 — une app qui ne déclare pas son check fait ÉCHOUER la commande, au lieu d\'être sautée en silence', () => {
  // Le `dashboard/` tel qu'il sort du template : aucun script.
  const d = racineDeuxApps({ scriptsPar: { dashboard: [] } });
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'vitrine', assistant: 'cursor' });

  for (const id of ['typecheck', 'lint']) {
    assert.doesNotMatch(VITRINE.scripts[id], /--if-present/, `scripts.${id} : \`--if-present\` rendrait cette absence muette`);
    const { status, visites } = lancerDepuisLaRacine(d, id);
    assert.notEqual(status, 0, `${id} : une application sans script doit faire sortir npm en erreur, pas en silence`);
    assert.equal(visites.includes('dashboard'), false, 'montage : dashboard n\'a effectivement pas tourné');
  }

  // Et le hook le DIT : « problème détecté », au lieu de la sortie vert-sans-rien-vérifier.
  const lignes = [];
  // Le VRAI `spawnSync` (la commande npm tourne pour de bon) ; seul le flux change, pour ne pas
  // déverser la sortie d'erreur de npm dans le journal de la suite.
  runChecks(['typecheck', 'lint'], { cwd: d, log: (l) => lignes.push(l), spawn: (f, a, o) => spawnSync(f, a, { ...o, stdio: 'pipe' }) });
  const txt = lignes.join('\n');
  for (const id of ['typecheck', 'lint']) assert.match(txt, new RegExp(`check ${id} : problème détecté`), `le hook doit signaler ${id}`);
  assert.doesNotMatch(txt, /sauté/, 'aucun des deux ne doit être « sauté » : ils ont bien tourné, et ils ont trouvé le trou');
});

test('V2 — une liste `workspaces` incomplète divise la couverture par deux, sans un mot', () => {
  // Le paramètre existe pour être joué : c'est le risque que le runbook de scaffold doit écarter
  // en écrivant la liste COMPLÈTE. Une racine qui n'en déclare qu'une : npm sort 0, ne dit rien,
  // et l'application oubliée n'est jamais vérifiée.
  const d = racineDeuxApps({ workspaces: ['site'] });
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'vitrine', assistant: 'cursor' });
  const { status, visites } = lancerDepuisLaRacine(d, 'typecheck');
  assert.equal(status, 0, 'et c\'est bien ça le problème : aucune erreur');
  assert.deepEqual(visites, ['site'], 'dashboard/ n\'est jamais visité — la liste de la racine fait foi');
});

// ── V2bis — CE QUE LE RUNBOOK DE SCAFFOLD FAIT NAÎTRE, JOUÉ AU LIEU D'ÊTRE LU ─────────────────
// Les tests ci-dessus prouvent le comportement de `checks.mjs` sur une racine FABRIQUÉE PAR LE
// TEST. Ils ne disent rien de la racine que le kit fait vraiment naître — celle que décrit la puce
// `- **vitrine**` de `07-scaffold.md`. Mesuré : un runbook qui poserait le `package.json` et le
// `tsconfig.json` mais oublierait le `biome.json` laisse `lint` sauté, le hook sort 0, et AUCUN
// test du dépôt ne rougit. Ce garde ferme ce trou-là, et il ne recopie aucune liste : les fichiers
// exigés sont DÉDUITS du `needs` de chaque check que la stack déclare.
//
// ⛔ IL NE LIT PLUS LA PROSE — TROISIÈME ET DERNIER TOUR. Deux versions ont cherché dans les
// phrases si la puce « posait » un fichier ; deux fois, une puce qui l'INTERDISAIT les a rendues
// vertes (« ne crée surtout PAS… », puis « ⛔ Évite de créer… » une fois les mots `ne`/`pas`/
// `jamais`/`aucun` bannis). Une liste noire de mots ne clôt pas une classe. La puce porte donc
// maintenant des ARTEFACTS — le `package.json` de la racine en JSON, celui de chaque application,
// la commande qui crée `biome.json` — et c'est d'eux, parsés, que la racine du test est bâtie.
// Le plancher (une prose qui contredirait le bloc) est écrit dans `puce-scaffold.mjs`.
//
// Ce garde répond à QUATRE questions, et chacune peut échouer seule :
//   1. les trois fichiers de la racine sont-ils décrits ?      → `willRun` des deux checks
//   2. est-ce la STACK qui pilote le check, ou le repli ?      → `via: 'script'`
//   3. la commande entre-t-elle dans les DEUX applications ?   → les marques, après exécution
//   4. la racine vient-elle bien APRÈS les deux applications ? → l'ordre des lignes

const VITRINE_PUCE = () => puceDeStack(RACINE, 'vitrine');

test('V2bis — le runbook de scaffold POSE les fichiers racine sans lesquels les checks se sautent', () => {
  const ids = STACKS.vitrine.checks.preCommit;
  const puce = VITRINE_PUCE();
  const blocs = blocsDeLaPuce(puce);
  assert.ok(blocs.length, 'la puce vitrine ne porte AUCUN bloc de code : les fichiers de la racine doivent y être écrits, pas racontés');

  // Le bloc qui produit un fichier donné, à la racine — `site/package.json` n'est pas
  // `package.json` : la première version confondait les deux, et retirer le manifeste de la
  // RACINE laissait le garde vert (mesuré).
  // ⛔ TOUT ARTEFACT EST PARSÉ, SANS EXCEPTION. `biome.json` arrivait par un bloc `bash` dont on
  // ne lisait que le commentaire : remplacer `biome init` (qui écrit le fichier) par
  // `biome check .` (qui n'écrit rien) laissait le garde VERT — mesuré. Une seule exception dans
  // une approche « on ne croit que les artefacts » suffit à la rouvrir. Les trois fichiers de la
  // racine sont donc décrits par leur CONTENU, en JSON, et un bloc qui ne parse pas ne compte pas.
  const blocDe = (f) => {
    const b = blocs.find((x) => x.fichier === f);
    return b && jsonDuBloc(b) !== null ? b : null;
  };

  // Le `package.json` de la racine est PARSÉ, pas cherché : sa liste `workspaces` et ses scripts
  // sont comparés au manifeste. Un `--if-present` qui reviendrait dans le runbook, ou une liste
  // d'applications incomplète, rougissent ici avant même qu'on lance quoi que ce soit.
  const racine = blocDe('package.json') && jsonDuBloc(blocDe('package.json'));
  // ⚠️ `needs` N'EST EXIGÉ QUE POUR LES CHECKS DONT LA RACINE NE DÉCLARE PAS LE SCRIPT. C'est la
  // règle de `checks.mjs` : un script déclaré remplace la commande par défaut, donc se passe du
  // fichier de config de celle-ci. La version d'avant exigeait `tsconfig.json` ET `biome.json`
  // sans condition — elle obligeait le runbook à faire poser un `biome.json` pour un outil
  // qu'AUCUN scaffold n'installe. La dérivation reste vivante : que le runbook perde le script
  // `lint` de la racine, et `biome.json` redevient exigé ici même.
  const exiges = [...new Set(['package.json', ...ids.filter((id) => !racine?.scripts?.[id]).map((id) => CHECKS[id].needs)])];
  const illisibles2 = exiges.filter((f) => blocs.some((x) => x.fichier === f) && !blocDe(f));
  const manquants2 = exiges.filter((f) => !blocDe(f));
  if (racine) {
    assert.deepEqual(racine.workspaces, VITRINE.workspaces, 'le `package.json` de la racine, tel que le runbook le dicte, ne déclare pas les applications du manifeste');
    assert.deepEqual(racine.scripts, VITRINE.scripts, 'les scripts dictés par le runbook ne sont pas ceux du manifeste (`--if-present` de retour ? un script perdu ?)');
  }
  const scriptsDe = (w) => {
    const j = blocDe(`${w}/package.json`) && jsonDuBloc(blocDe(`${w}/package.json`));
    return ids.filter((id) => j?.scripts?.[id]);
  };

  // LA RACINE QUE LA PUCE DÉCRIT, ET RIEN DE PLUS. Une pièce que le runbook ne décrit pas manque
  // vraiment sur ce disque-là : oublier `biome.json`, c'est `lint` qui se saute pour de vrai.
  const apps = VITRINE.workspaces.filter((w) => racine?.workspaces?.includes(w));
  const d = racineDeuxApps({
    pkg: Boolean(racine), tsconfig: Boolean(blocDe('tsconfig.json')), biome: Boolean(blocDe('biome.json')),
    workspaces: apps, apps,
    scriptsPar: Object.fromEntries(VITRINE.workspaces.map((w) => [w, scriptsDe(w)])),
  });
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'vitrine', assistant: 'cursor' });

  const pourquoi = (quoi) => [
    `${quoi} sur la racine que la puce \`- **vitrine**\` de 07-scaffold.md fait naître.`,
    manquants2.length
      ? `Fichiers exigés qu'AUCUN bloc PARSABLE de la puce ne décrit : ${manquants2.join(', ')}`
        + `${illisibles2.length ? `\n  (bloc présent mais illisible : ${illisibles2.join(', ')} — le contenu doit être du JSON, pas une commande)` : ''}`
        + '\n  (convention : la 1re ligne du bloc est un commentaire qui nomme le fichier — `// package.json`)'
      : 'Les fichiers exigés de la racine sont bien décrits — le trou est ailleurs (scripts d\'application, liste `workspaces`).',
    `Blocs lus : ${blocs.map((b) => b.fichier ?? '(sans nom)').join(', ') || 'aucun'}`,
  ].join('\n');

  const vus = selectChecks(ids, { cwd: d });
  assert.deepEqual(vus.map((c) => c.willRun), ids.map(() => true),
    `${pourquoi('Un check du pre-commit se saute')}\n${vus.filter((c) => !c.willRun).map((c) => `  · ${c.id} → ${c.reason}`).join('\n')}`);
  // `needs` est satisfait, mais est-ce la STACK qui pilote ? Sans `package.json` à la racine,
  // `willRun` reste vrai et le check retombe sur `npx tsc --noEmit` : vert, et rien de vérifié.
  assert.deepEqual(vus.map((c) => c.via), ids.map(() => 'script'), pourquoi('Le check ne passe pas par le script de la stack'));

  // …et la commande de la racine entre-t-elle VRAIMENT dans les deux applications ? C'est la
  // moitié qu'aucun contrôle de présence ne peut voir : une liste `workspaces` incomplète, ou une
  // application qui ne déclare pas son script, se lit ici et nulle part ailleurs.
  for (const id of ids) {
    const { status, visites } = lancerDepuisLaRacine(d, id);
    assert.equal(status, 0, pourquoi(`\`npm run ${id}\` échoue`));
    assert.deepEqual(visites, VITRINE.workspaces, pourquoi(`\`npm run ${id}\` n'est pas entré dans les deux applications`));
  }
});

// ── V2ter — L'ORDRE, QUI N'ÉTAIT ÉCRIT QUE POUR LES HUMAINS ────────────────────────────────────
// V2bis fabrique la racine finale : il ne regarde pas la SÉQUENCE. Mesuré : en remontant le bloc
// de la racine en tête de puce et en réécrivant l'en-tête (« d'abord la racine … `dashboard/` en
// DERNIER »), les 41 tests du fichier restaient verts. Or l'ordre est la contrainte la plus chère
// de cette puce : `npm error No workspaces found!` (exit 1) tant qu'aucune application n'existe,
// `npm error Missing script` (exit 1) dès qu'il en manque une — et le hook `onEdit` crie à CHAQUE
// écriture de fichier tant que ça dure. On l'ancre donc sur les COMMANDES, pas sur la prose : la
// création de `site/`, puis celle de `dashboard/`, puis le premier bloc qui produit un fichier de
// la racine.
test('V2ter — la puce vitrine pose la racine APRÈS les deux applications, pas avant', () => {
  const puce = VITRINE_PUCE();
  const iOu = (re, quoi) => {
    const i = puce.findIndex((l) => re.test(l));
    assert.ok(i >= 0, `la puce vitrine ne contient plus ${quoi} (${re})`);
    return i;
  };
  const iSite = iOu(/npx shadcn@latest init[^`]*--name site/, 'la commande qui crée `site/`');
  const iDash = iOu(/npm create convex@latest dashboard/, 'la commande qui crée `dashboard/`');
  // Le premier bloc de la racine = la première ligne de commentaire qui nomme un de ses fichiers.
  const fichiersRacine = [...new Set(['package.json', ...STACKS.vitrine.checks.preCommit.map((id) => CHECKS[id].needs)])];
  const iRacine = iOu(new RegExp(`^\\s*(?://|#)\\s*(${fichiersRacine.map((f) => f.replace('.', '\\.')).join('|')})\\b`), 'de bloc pour un fichier de la racine');

  assert.ok(iSite < iDash && iDash < iRacine, [
    'La puce vitrine ne dicte plus l\'ordre `site/` → `dashboard/` → racine.',
    `  ligne ${iSite} : création de site/`,
    `  ligne ${iDash} : création de dashboard/`,
    `  ligne ${iRacine} : premier fichier de la racine`,
    'Une racine née avant ses applications fait sortir `npm run typecheck --workspaces` en erreur',
    '(`No workspaces found!`, puis `Missing script`), et le hook onEdit crie à chaque écriture.',
  ].join('\n'));
});

// ── V4 — « REBUILD » ÉTAIT DIT HUIT FOIS, LA COMMANDE ZÉRO ─────────────────────────────────────
// Conséquence directe de la lecture au build : publier dans le `dashboard/` ne change RIEN aux
// pages en ligne tant que le site n'est pas reconstruit. Les documents de la stack le disaient —
// huit fois, comptées — sans jamais écrire COMMENT reconstruire. On enseignait un problème en
// gardant sa solution pour soi, et c'est celui qu'un débutant rencontre le PREMIER JOUR.
//
// Les deux fichiers visés ne sont pas choisis au hasard : le modèle de `docs/RUN.md` est le seul
// fichier qu'un débutant ouvre pour lancer son projet, et `/deploy` est le runbook de mise en
// ligne. Un troisième qui dirait le problème sans la commande resterait invisible ici — assumé :
// `AGENTS.md` et les règles `.mdc` énoncent la contrainte, ils ne déroulent pas la procédure.
const ENTREES_REBUILD = ['templates/run/vitrine.md', 'templates/commands/deploy.md'];

// ⛔ DEUX FOIS MENTEUR AU MÊME ENDROIT, ET LA 2ᵉ FOIS DANS MON PROPRE CORRECTIF.
// v1 : « publier … » + « rebuild|reconstru » sur la ligne. VERTE alors que la phrase qui enseigne
//      avait été retirée — « la fonction Convex qui PUBLIE appelle une URL de RECONSTRUCTION » la
//      satisfaisait. Les deux mots y sont, la PROPOSITION n'y est pas.
// v2 : j'ai exigé le démenti (`ne met/suffit/change`, `dernier build`) mais gardé `publi[a-zé]+`,
//      qui attrape `public`, `publique`, `publication`. « La clé PUBLIQUE de Web3Forms NE SUFFIT
//      pas … » suffisait à rendre le garde vert — et cette stack parle de « pages publiques » à
//      toutes les lignes. On exige donc le VERBE publier, conjugué, jamais l'adjectif.
const PUBLIER = String.raw`publi(?:e|es|ent|er|ez|ons|ée?s?|és?|cations?)\b`;
const DIT_LE_PROBLEME = new RegExp(`${PUBLIER}[^\\n]*(\\bne\\s+(?:met|suffit|change)\\b|dernier build)`, 'i');

// ⛔ …ET ON JUGE LA SECTION, PAS LE FICHIER. Le journal en a fait une règle (T4/JSON-LD,
// cursor-rules/globs, D3 dans ce commit même) : un contrôle à l'échelle du fichier crédite une
// section du vocabulaire de ses voisines. Ici, ça laisserait le problème énoncé en tête de page et
// la commande enterrée trois sections plus bas — le lecteur apprend la panne sans jamais croiser
// sa réparation. La commande doit être DANS la section qui pose le problème.
const sectionsMd = (t) => t.split(/^(?=## )/m);

test('V4 — le kit dit que publier ne suffit pas, ET donne la commande dans LA MÊME section', () => {
  assert.ok(STACKS.vitrine.scripts.build, 'montage : la stack vitrine doit déclarer un script `build`');
  assert.ok(STACKS.vitrine.workspaces && STACKS.vitrine.workspaces.length >= 2, 'montage : la vitrine doit déclarer ses deux workspaces');
  // ⚠️ DÉRIVÉE DU MANIFESTE, JAMAIS RECOPIÉE : renommer le workspace public sans reprendre les
  // documents fait rougir ce test, là où une chaîne en dur les laisserait diverger en silence.
  const commande = `npm run build --workspace ${STACKS.vitrine.workspaces[0]}`;
  const manques = [];
  for (const f of ENTREES_REBUILD) {
    const porteuses = sectionsMd(lire(f)).filter((s) => DIT_LE_PROBLEME.test(s));
    if (!porteuses.length) { manques.push(`${f} : aucune section ne dit que publier ne met PAS le site à jour`); continue; }
    if (!porteuses.some((s) => s.includes(commande))) {
      manques.push(`${f} : ${porteuses.length} section(s) posent le problème, aucune n'écrit « ${commande} »`);
    }
  }
  assert.deepEqual(manques, [], [
    'La stack vitrine enseigne un problème sans donner sa solution, ou la donne ailleurs :',
    ...manques.map((m) => `  ${m}`),
    '',
    'Les pages publiques lisent Convex AU BUILD. Publier dans le `dashboard/` remplit la base,',
    'et le site en ligne reste celui du dernier build. Le lecteur qui apprend ça sans recevoir la',
    'commande — dans la même section, pas trois écrans plus bas — n\'a rien appris d\'actionnable.',
  ].join('\n'));
});

// ── V5 — LE CODE GÉNÉRÉ PAR CONVEX SE COMMITE, ET GIT EST L'ARBITRE ───────────────────────────
// Défaut mesuré et corrigé le jour même : `dashboard/convex/_generated/` avait été ajouté au
// `.gitignore` de la stack. La mesure « ce motif ignore-t-il ce qu'il annonce ? » était juste ;
// la question « FAUT-IL l'ignorer ? » n'avait pas été posée. Le CLI y répond
// (`convex codegen --help`, 1.45.0) : « should be committed to the repo (your code won't typecheck
// without it!) ». Mesuré de bout en bout : la règle posée, un clone neuf — donc le checkout de la
// CI — sort `error TS2307: Cannot find module './_generated/server'`, `npm run typecheck` rend 2,
// et la CI que ce kit livre est rouge au premier push. Le gate de /deploy devient infranchissable.
//
// ⚠️ L'ARBITRE EST `git check-ignore`, PAS UNE REGEX. Un contrôle lexical se ferait avoir par la
// première reformulation (`**/convex/_generated/`, `convex/`, `_generated/`…) — et c'est justement
// la subtilité des motifs git (séparateur médian ⇒ chemin relatif) qui a produit la faute.
test('V5 — le `.gitignore` de la vitrine n\'ignore JAMAIS le code généré par Convex', () => {
  const d = tmp();
  fs.copyFileSync(path.join(RACINE, 'templates/gitignore/vitrine.gitignore'), path.join(d, '.gitignore'));
  execFileSync('git', ['init', '-q', '.'], { cwd: d });
  const suivis = [];
  for (const ws of STACKS.vitrine.workspaces) {
    const rel = `${ws}/convex/_generated/api.d.ts`;
    fs.mkdirSync(path.join(d, ws, 'convex', '_generated'), { recursive: true });
    fs.writeFileSync(path.join(d, rel), 'export {};\n');
    // rc 0 = ignoré (la faute), rc 1 = suivi (ce qu'on veut). `status` évite que le rc non nul lève.
    const r = spawnSync('git', ['check-ignore', '-q', rel], { cwd: d });
    suivis.push([rel, r.status]);
  }
  // Garde de montage : sans fichier écrit, `check-ignore` rendrait 1 pour une raison qui n'est pas
  // la bonne, et ce test serait vert à vide.
  assert.ok(suivis.length >= 2, `montage : ${suivis.length} workspace(s) éprouvé(s)`);
  const ignores = suivis.filter(([, s]) => s === 0).map(([rel]) => rel);
  assert.deepEqual(ignores, [], [
    'Le `.gitignore` de la vitrine ignore du code que Convex demande de COMMITER :',
    ...ignores.map((f) => `  ${f}`),
    '',
    '`convex codegen --help` : « should be committed to the repo (your code won\'t typecheck',
    'without it!) ». Sans ces fichiers dans le dépôt, le checkout de la CI ne compile pas',
    '(`TS2307: Cannot find module \'./_generated/server\'`) et `npm run typecheck` — que',
    '`templates/ci/vitrine.yml` lance SANS `--if-present` — rend 2. La CI est rouge au premier',
    'push, et le gate « CI verte prouvée » de /deploy devient infranchissable.',
  ].join('\n'));
});

// ── V6 — LA LIGNE DE CI QUI PORTE L'ARBITRAGE CENTRAL DU LOT, ET QUE RIEN NE TENAIT ───────────
// `templates/ci/vitrine.yml` lance `npm run lint` / `typecheck` / `build` **sans `--if-present`**,
// délibérément : avec le drapeau, une racine à qui il manque un script rend la CI VERTE sans avoir
// rien lancé — le saut silencieux que toute cette stack est faite pour tuer. Cet arbitrage n'était
// retenu que par un commentaire de cinq lignes. Mesuré : en ajoutant `--if-present` aux trois
// lignes, les 621 tests du dépôt restaient VERTS. V2bis, lui, ne lit que le manifeste — pas la CI.
//
// La liste des scripts est LUE dans `STACKS.vitrine.scripts` : un quatrième script entrerait sous
// contrôle sans qu'on touche ici, et un script retiré du manifeste cesserait d'être exigé.
test('V6 — la CI vitrine lance CHAQUE script du manifeste, et aucun avec `--if-present`', () => {
  const ci = lire('templates/ci/vitrine.yml');
  const noms = Object.keys(VITRINE.scripts);
  assert.ok(noms.length >= 3, `montage : ${noms.length} scripts lus dans le manifeste`);
  const fautes = [];
  for (const n of noms) {
    const ligne = ci.split('\n').find((l) => new RegExp(`^\\s*-\\s*run:\\s*npm run ${n}\\b`).test(l));
    if (!ligne) { fautes.push(`\`npm run ${n}\` : le manifeste le déclare, la CI ne le lance pas`); continue; }
    if (/--if-present/.test(ligne)) fautes.push(`\`npm run ${n}\` porte \`--if-present\` : une racine sans ce script rendrait la CI VERTE sans rien lancer`);
  }
  assert.deepEqual(fautes, [], [
    'La CI de la vitrine ne fait plus ce que le manifeste déclare :',
    ...fautes.map((f) => `  ${f}`),
    '',
    'Sans `--if-present`, npm sort 1 EN NOMMANT le script manquant. Avec, il sort 0 sans un mot :',
    'la CI passe au vert sur un projet dont la moitié n\'a jamais été vérifiée. C\'est l\'arbitrage',
    'de ce lot, et il doit rester visible dans le fichier que la CI exécute.',
  ].join('\n'));
});

// ── V7 — LES PORTS, QUE PERSONNE NE TENAIT ────────────────────────────────────────────────────
// Quatre fichiers livrés annoncent où écoutent les deux applications ; aucun ne parlait aux
// autres. Mesuré : remplacer `4321` par `1234` dans un seul d'entre eux laissait la suite VERTE.
// Le débutant ouvre alors une adresse qui ne répond pas, et rien dans le kit ne le contredit.
//
// Il n'existe pas de source unique pour ces valeurs — elles viennent des templates amont (Astro
// écoute sur 4321, le `vite.config.ts` de create-convex fixe `port: 3000`, mesuré sur un scaffold
// réel). La règle est donc celle de la section « Un seul serveur » (parallele.test.mjs) : UN
// fichier fait foi — `templates/run/vitrine.md`, livré tel quel en `docs/RUN.md`, dont c'est le
// métier — et les autres ne doivent pas en diverger.
test('V7 — les ports de la vitrine sont les mêmes dans tous les fichiers qui les annoncent', () => {
  const ports = (rel) => [...new Set([...lire(rel).matchAll(/localhost:(\d{4,5})/g)].map((m) => m[1]))].sort();
  const reference = ports('templates/run/vitrine.md');
  assert.deepEqual(reference, ['3000', '4321'], `montage : \`docs/RUN.md\` doit annoncer les deux ports, lu ${JSON.stringify(reference)}`);
  const AUTRES = ['stacks/vitrine/README.md', 'stacks/vitrine/prompts-de-demarrage.md', 'templates/env/vitrine.env.example'];
  const fautes = [];
  for (const f of AUTRES) {
    const p = ports(f);
    assert.ok(p.length, `montage : ${f} n'annonce plus aucun port — ce test serait vrai à vide`);
    const intrus = p.filter((x) => !reference.includes(x));
    if (intrus.length) fautes.push(`${f} : ${intrus.join(', ')} — absent(s) de docs/RUN.md`);
  }
  assert.deepEqual(fautes, [], [
    'Un fichier livré annonce un port que `docs/RUN.md` n\'annonce pas :',
    ...fautes.map((f) => `  ${f}`),
    '',
    'Le débutant ouvre l\'adresse qu\'on lui donne. Si deux fichiers du kit n\'en donnent pas la',
    'même, l\'un des deux l\'envoie sur une page qui ne répond pas — et rien ne le lui dira.',
  ].join('\n'));
});
