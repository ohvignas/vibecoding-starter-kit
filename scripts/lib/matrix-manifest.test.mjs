import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest, DESIGN_SKILL_NAMES, SHADCN_NOTE, STITCH } from './matrix.mjs';

test('STACKS a les 4 stacks avec la bonne forme', () => {
  for (const s of ['saas', 'mobile', 'desktop', 'vitrine']) {
    assert.ok(STACKS[s], `stack ${s} présente`);
    assert.ok(STACKS[s].mcp && typeof STACKS[s].mcp === 'object');
    assert.ok(Array.isArray(STACKS[s].checks.preCommit));
  }
});

test('resolveStackManifest(saas, claude-code) : plugin convex + MCP shadcn + lint en preCommit', () => {
  const m = resolveStackManifest('saas', 'claude-code');
  assert.ok(m.plugins.some((p) => p.cmd.includes('convex@claude-plugins-official')));
  assert.ok('shadcn' in m.mcp);
  assert.ok('playwright' in m.mcp, 'MCP Playwright (test E2E fonctionnel) présent en saas');
  assert.ok(m.checks.preCommit.includes('lint'));
  assert.equal(m.scripts.typecheck, 'tsc --noEmit');
});

test('MCP Playwright (E2E fonctionnel) sur les stacks web pures : saas + vitrine, pas mobile', () => {
  assert.ok('playwright' in resolveStackManifest('saas', 'cursor').mcp);
  assert.ok('playwright' in resolveStackManifest('vitrine', 'cursor').mcp);
  assert.equal('playwright' in resolveStackManifest('mobile', 'cursor').mcp, false, 'mobile = simulateur, pas Playwright');
});

test('resolveStackManifest(mobile, cursor) : pas de plugin cursor, MCP expo avec needsAuth, lint-expo', () => {
  const m = resolveStackManifest('mobile', 'cursor');
  assert.deepEqual(m.plugins, []);
  assert.equal(m.mcp.expo.needsAuth, true);
  assert.ok('maestro' in m.mcp, 'MCP Maestro (E2E fonctionnel mobile) présent');
  assert.ok(m.mcp.maestro.prereq, 'Maestro annonce son prérequis CLI');
  assert.match(m.mcp.maestro.command, /^~\/\.maestro\/bin\/maestro$/, 'chemin absolu (pas `maestro` nu → évite spawn ENOENT sur Cursor)');
  assert.ok(m.checks.preCommit.includes('lint-expo'));
});

test('resolveStackManifest(desktop, claude-code) : MCP chrome-devtools, audit en prePush', () => {
  const m = resolveStackManifest('desktop', 'claude-code');
  assert.ok('chrome-devtools' in m.mcp);
  // Lot F : `security` appelait `@doyensec/electronegativity`, dont le paquet npm n'a pas bougé
  // depuis le 09/03/2023. Le push garde un filet — `npm audit` — au lieu d'un scan fantôme.
  assert.ok(m.checks.prePush.includes('audit'), 'le pre-push desktop ne doit pas être vide');
  assert.ok(!m.checks.prePush.includes('security'));
});

// La vitrine n'est plus « Astro + un CMS dans git » : c'est `site/` (Astro) + `dashboard/`
// (TanStack Start + Better Auth) sur Convex. Le manifeste doit porter les DEUX applications —
// et rien de ce qui faisait la stack précédente ne doit y survivre en douce.
test('vitrine : les 5 MCP des deux applications, et rien de Keystatic', () => {
  const m = resolveStackManifest('vitrine', 'claude-code');
  assert.deepEqual(Object.keys(m.mcp).sort(), ['astro-docs', 'better-auth', 'convex', 'playwright', 'shadcn']);
  // Repris de `saas`, pas réinventés : deux définitions du même serveur finissent par diverger.
  assert.deepEqual(m.mcp.convex, resolveStackManifest('saas', 'claude-code').mcp.convex);
  assert.deepEqual(m.mcp['better-auth'], resolveStackManifest('saas', 'claude-code').mcp['better-auth']);
  assert.doesNotMatch(JSON.stringify(m), /keystatic/i, 'la stack ne passe plus par Keystatic');
});

test('vitrine : le plugin Convex arrive, repris de saas', () => {
  for (const a of ['claude-code', 'cursor', 'codex']) {
    assert.deepEqual(resolveStackManifest('vitrine', a).plugins, resolveStackManifest('saas', a).plugins, `${a} : mêmes plugins Convex que saas`);
  }
  assert.ok(resolveStackManifest('vitrine', 'claude-code').plugins.some((p) => p.cmd.includes('convex@claude-plugins-official')));
});

test('vitrine : skills seo + shadcn conservés, Better Auth et Convex ajoutés ; domaines SEO/GEO', () => {
  const m = resolveStackManifest('vitrine', 'claude-code');
  assert.ok(m.skills.some((s) => s.repo === 'shadcn/ui'), 'skill officiel shadcn/ui');
  assert.ok(m.skills.some((s) => (s.skills || []).includes('seo-audit')), 'skills SEO');
  assert.ok(m.skills.some((s) => s.repo === 'better-auth/skills'), 'skills Better Auth (dashboard)');
  assert.ok(m.skills.find((s) => s.repo === 'get-convex/agent-skills')?.all, 'skills Convex, en --all comme en saas');
  // `forms` RESTE : un formulaire de contact n'a pas besoin de Convex, et le service externe
  // (Web3Forms, Formspree) reste le bon choix pour une page publique statique.
  assert.ok(m.domains.seo && m.domains.geo && m.domains.forms, 'domaines seo + geo + forms');
});

// ⚠️ LE CHAMP QUI TIENT LES CHECKS DEBOUT. Avec `site/` et `dashboard/` en sous-dossiers, ces
// scripts sont ceux de la RACINE : ils doivent ratisser les deux workspaces, sinon le hook de
// pre-commit vérifie une application sur deux (ou zéro). Le câblage complet — et la preuve que la
// commande entre vraiment dans les deux — est gardé par `cablage-stacks.test.mjs` (V2).
test('vitrine : les scripts de la racine ratissent les DEUX workspaces', () => {
  const m = resolveStackManifest('vitrine', 'claude-code');
  for (const id of ['typecheck', 'lint', 'build']) {
    assert.match(m.scripts[id], new RegExp(`^npm run ${id} --workspaces --if-present$`), `scripts.${id} doit ratisser les deux applications`);
  }
  // `astro check` reste le typecheck de `site/`, mais il est déclaré DANS `site/package.json`
  // (runbook de scaffold) : à la racine, il ne verrait ni le dashboard ni Convex.
  assert.doesNotMatch(m.scripts.typecheck, /astro check/, 'la racine ne lance pas le check d\'une seule des deux apps');
});

test('desktop : MCP shadcn ajouté (renderer React = shadcn possible)', () => {
  assert.ok(resolveStackManifest('desktop', 'cursor').mcp.shadcn, 'desktop a le MCP shadcn');
});

test('stack inconnue → throw', () => {
  assert.throws(() => resolveStackManifest('flutter', 'cursor'), /Stack inconnue/);
});

test('skills stack = specs installables (repo + label ; convex en --all)', () => {
  // Auto-installés par le wizard via buildSkillAddArgs → chaque entrée doit porter repo+label.
  for (const stack of ['saas', 'mobile']) {
    for (const s of resolveStackManifest(stack, 'cursor').skills) {
      assert.ok(s.repo, `${stack}: repo présent`);
      assert.ok(s.label, `${stack}: label présent`);
      assert.equal('cmd' in s, false, `${stack}: plus de champ cmd libre`);
    }
  }
  assert.ok(resolveStackManifest('saas', 'cursor').skills.find((s) => s.repo === 'get-convex/agent-skills').all);
});

test('Stitch (maquette IA) : skill officiel sur les 4 stacks, MCP hors du projet (clé jamais commitée)', () => {
  for (const stack of ['saas', 'mobile', 'desktop', 'vitrine']) {
    const m = resolveStackManifest(stack, 'cursor');
    const skill = m.skills.find((k) => k.repo === 'google-labs-code/stitch-skills');
    assert.ok(skill && skill.skills.includes('stitch::generate-design'), `${stack}: skill Stitch officiel auto-installé`);
    // SÉCURITÉ : Stitch n'est PAS dans le mcp du projet (sinon clé en clair commitée ou ${env} non interpolé par Cursor).
    assert.equal('stitch' in m.mcp, false, `${stack}: MCP Stitch hors du projet (config user-scope)`);
  }
});

test('STITCH expose l\'URL + les commandes MCP user-scope par assistant', () => {
  assert.equal(STITCH.url, 'https://stitch.googleapis.com/mcp');
  assert.match(STITCH.mcp['claude-code'], /claude mcp add stitch .*-s user/);
  assert.match(STITCH.mcp.cursor, /~\/\.cursor\/mcp\.json|globale/i);
});

// `DESIGN_SKILLS` était une CHAÎNE que plus personne ne lisait (code mort, E9). Elle est
// remplacée par `DESIGN_SKILL_NAMES`, un tableau dont `validate-commands.mjs` et les tests de
// duplication dérivent vraiment.
test('DESIGN_SKILL_NAMES = 4 skills design (shadcnblocks n\'est PAS un skill : registry CLI)', () => {
  assert.ok(DESIGN_SKILL_NAMES.includes('frontend-design'));
  assert.ok(DESIGN_SKILL_NAMES.includes('brand-guidelines'));
  assert.equal(DESIGN_SKILL_NAMES.includes('shadcnblocks'), false);
  assert.equal(DESIGN_SKILL_NAMES.length, 4);
});

test('SHADCN_NOTE : registry natif @shadcnblocks (gratuit sans clé, pro via env)', () => {
  assert.match(SHADCN_NOTE, /@shadcnblocks/);
  assert.match(SHADCN_NOTE, /shadcn add/);
  assert.match(SHADCN_NOTE, /SHADCNBLOCKS_API_KEY/);
  assert.doesNotMatch(SHADCN_NOTE, /masonjames|payante/i);
});
