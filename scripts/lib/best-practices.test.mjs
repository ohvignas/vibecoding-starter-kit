// scripts/lib/best-practices.test.mjs
// LES BEST PRACTICES OFFICIELLES DE LA STACK SONT JOUÉES AVANT LES PLANS, ET REPRISES DANS LA ROADMAP.
//
// POURQUOI CE GARDE EXISTE. Le kit installe bien les skills officiels de Convex
// (`get-convex/agent-skills`, 33 skills dont les audits `convex-reviewer`, `convex-authz`,
// `convex-launch-readiness`) et de Better Auth (`better-auth/skills`, dont
// `better-auth-best-practices` et `better-auth-security-best-practices`). Mais les installer ne
// suffit pas : si rien dans les runbooks ne les NOMME, l'IA écrit la tech spec et la roadmap
// d'après sa mémoire du framework — c'est-à-dire avec des APIs et des patterns périmés, le défaut
// même que ces skills existent pour empêcher.
//
// Ce test verrouille les trois endroits où la règle doit tenir, et pour chacun il vérifie la
// PROPRIÉTÉ (le skill est nommé au bon moment), jamais la seule présence du mot « skills » :
//   1. les DEUX runbooks qui créent des plans (`/new-project`, `/build`, `/new-feature`) chargent
//      les skills de best practices AVANT d'écrire ;
//   2. la roadmap (étape `06-roadmap.md` + `templates/roadmap/ROADMAP.md`) reprend leurs exigences
//      et finit par un jalon « Audit stack » qui joue les skills d'audit ;
//   3. les règles de stack livrées au projet (`stacks/*/AGENTS.md` + `.claude/skills/stack-*`)
//      listent les skills pour que l'IA sache qu'ils existent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fichiersDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const runbook = (nom) => fichiersDuRunbook(ROOT, nom).map((f) => read(f)).join('\n');

// Les skills nommés ici existent VRAIMENT dans les dépôts officiels (vérifié par API le 2026-10-13) :
//   get-convex/agent-skills → convex-design, convex-auth, convex-authz, convex-crons, convex-optimize,
//     convex-insights, convex-cost, convex-expert, convex-seed, convex-reviewer, convex-launch-readiness,
//     convex-test, convex-verify, convex-monitor.
//   better-auth/skills → better-auth-best-practices, better-auth-security-best-practices, create-auth,
//     organization-best-practices, email-and-password-best-practices,
//     two-factor-authentication-best-practices.
const SKILLS_CONVEX = ['convex-design', 'convex-authz', 'convex-crons', 'convex-reviewer', 'convex-launch-readiness', 'convex-optimize'];
const SKILLS_BETTER_AUTH = ['better-auth-best-practices', 'better-auth-security-best-practices'];

test('les runbooks qui créent des plans jouent les best practices AVANT d\'écrire', () => {
  // `/new-project` : la tech spec (étape `03-…`) est LE premier plan. Le skill doit y être nommé,
  // et le renvoi vers la liste installée (`docs/A-FAIRE.md`) doit exister, sinon l'IA lit des noms
  // de skills qu'elle ne saura pas où trouver.
  const archi = read('templates/commands/new-project/03-stack-et-architecture.md');
  assert.match(archi, /Avant d'ouvrir `docs\/templates\/architecture\.md`|AVANT d'écrire/i, '03 : la consigne doit précéder l\'écriture de la spec');
  assert.match(archi, /docs\/A-FAIRE\.md/, '03 : renvoyer vers la section « Skills portables (stack) » de `docs/A-FAIRE.md`');
  // À l'étape architecture, on attend les skills de CONCEPTION (schéma, auth, data) — pas les
  // skills d'AUDIT, qui n'ont rien à faire dans une spec et appartiennent à l'étape roadmap.
  const SKILLS_CONCEPTION = ['convex-design', 'convex-auth', 'convex-authz', 'convex-crons', 'convex-expert', 'convex-optimize', 'convex-insights', ...SKILLS_BETTER_AUTH];
  for (const s of SKILLS_CONCEPTION) {
    assert.ok(archi.includes(s), `03-stack-et-architecture.md : le skill officiel « ${s} » n'est pas nommé`);
  }
  // Le `AD-*` est le point d'ancrage : une règle officielle entre par là dans l'architecture.
  assert.match(archi, /AD-\*|AD-n/, '03 : les règles officielles doivent devenir des `AD-*` traçables');

  // `/build` : chaque jalon a son plan — les best practices s'y chargent avant `writing-plans`.
  const build = read('templates/commands/build.md');
  assert.match(build, /Best practices d'abord/i, 'build : la consigne « Best practices d\'abord » manque');
  for (const s of ['convex-design', 'convex-authz', 'better-auth-best-practices']) {
    assert.ok(build.includes(s), `build.md : le skill « ${s} » n'est pas nommé dans l'étape Plan`);
  }

  // `/new-feature` : une feature isolée ne fait pas exception.
  const feature = runbook('new-feature');
  assert.match(feature, /best practices/i, 'new-feature : la consigne best practices manque avant le plan');
  assert.ok(feature.includes('convex-design'), 'new-feature : le skill « convex-design » n\'est pas nommé');
});

test('la roadmap reprend les best practices et finit par un jalon « Audit stack »', () => {
  const roadmapEtape = read('templates/commands/new-project/06-roadmap.md');
  assert.match(roadmapEtape, /best practices/i, '06 : les best practices ne sont pas croisées dans l\'audit de complétude');
  assert.match(roadmapEtape, /Audit stack/i, '06 : la roadmap doit finir par un jalon « Audit stack »');
  for (const s of ['convex-reviewer', 'convex-authz', 'convex-launch-readiness', 'better-auth-security-best-practices']) {
    assert.ok(roadmapEtape.includes(s), `06-roadmap.md : le skill d'audit « ${s} » n'est pas nommé`);
  }

  // Le squelette que `/build` lit à chaque tour : la dimension d'audit doit y être, sinon un jalon
  // « Audit stack » ajouté par le runbook n'a aucune dimension d'origine dans le fichier livré.
  const roadmap = read('templates/roadmap/ROADMAP.md');
  assert.match(roadmap, /Audit stack/, 'templates/roadmap/ROADMAP.md : la dimension « Audit stack » manque');
  assert.ok(roadmap.includes('convex-reviewer'), 'ROADMAP.md : les skills d\'audit ne sont pas cités');
  assert.match(roadmap, /Best practices d'abord/i, 'ROADMAP.md : le rappel « best practices d\'abord » manque');
});

test('les règles de stack livrées listent les skills officiels (saas · vitrine)', () => {
  const surfaces = [
    'stacks/saas/AGENTS.md',
    'stacks/vitrine/AGENTS.md',
    '.claude/skills/stack-saas/SKILL.md',
    '.claude/skills/stack-vitrine/SKILL.md',
  ];
  const fautes = [];
  for (const f of surfaces) {
    const t = read(f);
    if (!/Skills officiels/i.test(t)) { fautes.push(`${f} : section « Skills officiels » absente`); continue; }
    for (const s of [...SKILLS_CONVEX, ...SKILLS_BETTER_AUTH]) {
      if (!t.includes(s)) fautes.push(`${f} : « ${s} » non nommé`);
    }
  }
  assert.deepEqual(fautes, [], `Les règles de stack ne rendent pas les skills officiels découvrables :\n${fautes.join('\n')}`);
});
