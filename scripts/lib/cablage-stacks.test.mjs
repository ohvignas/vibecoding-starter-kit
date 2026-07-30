// Lot F — le CÂBLAGE des stacks : ce que le kit exécute vraiment, par opposition à ce qu'il
// déclare. Trois mensonges de cette famille sont corrigés ici : un check qui lance une autre
// commande que celle de la stack (F4), un `prePush` qui pointe vers un check supprimé (F5),
// un catalogue de domaines dont les déclencheurs ne pilotaient rien (F11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STACKS, AI_CONTEXT, PINS, resolveAssets } from './matrix.mjs';
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
  assert.deepEqual(dossiers('vitrine'), ['astro'], 'une vitrine n\'a rien à faire des llms-full de Convex et Expo (4,6 Mo)');
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
