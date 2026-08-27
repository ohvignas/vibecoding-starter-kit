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
function racineDeuxApps({ tsconfig = true, biome = true, workspaces = VITRINE.workspaces, scriptsPar = {} } = {}) {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), `${JSON.stringify({ name: 'mon-site', private: true, workspaces }, null, 2)}\n`);
  if (tsconfig) fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  if (biome) fs.writeFileSync(path.join(d, 'biome.json'), '{}');
  for (const app of VITRINE.workspaces) {
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

test('V2 — le `package.json` racine ne suffit PAS : `needs` est évalué avant le script', () => {
  // Mesuré. La solution « un package.json racine avec les scripts qui ratissent les deux
  // workspaces » est nécessaire mais pas suffisante : `selectChecks` teste d'abord la présence du
  // fichier `needs` (tsconfig.json / biome.json) et sort AVANT de regarder les scripts. Des
  // scripts parfaits sur une racine sans ces deux fichiers → les deux checks se sautent quand même.
  const d = racineDeuxApps({ tsconfig: false, biome: false });
  writeStackEnvironment({ projectDir: d, source: RACINE, stack: 'vitrine', assistant: 'cursor' });
  const pkg = JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.typecheck, VITRINE.scripts.typecheck, 'le kit a bien posé le script');
  assert.deepEqual(selectChecks(['typecheck', 'lint'], { cwd: d }).map((c) => c.willRun), [false, false],
    'la racine des deux apps doit AUSSI porter tsconfig.json et biome.json, sinon les scripts ne servent à rien');
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

// ── V2bis — CE QUE LE RUNBOOK DE SCAFFOLD DOIT POSER, DÉRIVÉ DE CE QUI EST EXIGÉ ───────────────
// Les tests ci-dessus prouvent le comportement de `checks.mjs` sur une racine FABRIQUÉE. Ils ne
// disent rien de la racine que le kit fait vraiment naître — celle que décrit
// `templates/commands/new-project/07-scaffold.md`. Mesuré : un runbook qui poserait le
// `package.json` et le `tsconfig.json` mais oublierait le `biome.json` laisse `lint` sauté, le
// hook sort 0, et AUCUN test du dépôt ne rougit. Ce garde ferme ce trou-là, et il ne recopie
// aucune liste : les fichiers exigés sont DÉDUITS du `needs` de chaque check que la stack déclare.
test('V2bis — le runbook de scaffold nomme les fichiers racine sans lesquels les checks se sautent', () => {
  const exiges = new Set(['package.json', ...STACKS.vitrine.checks.preCommit.map((id) => CHECKS[id].needs)]);
  const lignes = lire('templates/commands/new-project/07-scaffold.md').split('\n');
  // LA PUCE DE LA STACK, PAS LE FICHIER ENTIER : `package.json` est cité pour d'autres stacks, et
  // un contrôle sur tout le fichier serait satisfait par la puce du voisin. La puce va de son
  // en-tête `- **vitrine**` jusqu'à la puce de stack suivante (ses lignes de continuation, qui
  // portent les ⚠️, en font partie).
  const debut = lignes.findIndex((l) => /^\s*-\s+\*\*vitrine\*\*/.test(l));
  assert.ok(debut >= 0, '07-scaffold.md n\'a plus de puce `- **vitrine**`');
  const suite = lignes.slice(debut + 1).findIndex((l) => /^\s*-\s+\*\*(saas|desktop|mobile)\*\*/.test(l));
  const puce = lignes.slice(debut, suite < 0 ? undefined : debut + 1 + suite).join('\n');
  const manquants = [...exiges, ...VITRINE.workspaces.map((w) => `${w}/`)].filter((f) => !puce.includes(f));
  assert.deepEqual(manquants, [], 'La racine des deux applications doit porter CHACUN de ces fichiers, et le runbook doit le dire :\n'
    + `${manquants.join('\n')}\n→ sans eux, \`selectChecks\` sort sur \`needs\` et le check se saute en silence (voir V2 ci-dessus).`);
});
