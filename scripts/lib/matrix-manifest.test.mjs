import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest, DESIGN_SKILLS, SHADCN_NOTE, STITCH } from './matrix.mjs';

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
  assert.ok(m.checks.preCommit.includes('lint-expo'));
});

test('resolveStackManifest(desktop, claude-code) : MCP chrome-devtools, security en prePush', () => {
  const m = resolveStackManifest('desktop', 'claude-code');
  assert.ok('chrome-devtools' in m.mcp);
  assert.ok(m.checks.prePush.includes('security'));
});

test('vitrine : MCP astro-docs + shadcn ; skills seo + shadcn ; domaines SEO/GEO', () => {
  const m = resolveStackManifest('vitrine', 'claude-code');
  assert.ok(m.mcp['astro-docs'], 'MCP astro-docs présent');
  assert.ok(m.mcp.shadcn, 'MCP shadcn présent');
  assert.ok(m.skills.some((s) => s.repo === 'shadcn/ui'), 'skill officiel shadcn/ui');
  assert.ok(m.skills.some((s) => (s.skills || []).includes('seo-audit')), 'skills SEO');
  assert.ok(m.domains.seo && m.domains.geo, 'domaines seo + geo');
  assert.match(m.scripts.typecheck, /astro check/);
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

test('DESIGN_SKILLS = 4 skills design (shadcnblocks n\'est PAS un skill : registry CLI)', () => {
  assert.match(DESIGN_SKILLS, /frontend-design/);
  assert.match(DESIGN_SKILLS, /brand-guidelines/);
  assert.doesNotMatch(DESIGN_SKILLS, /shadcnblocks/);
  assert.equal(DESIGN_SKILLS.split(',').length, 4);
});

test('SHADCN_NOTE : registry natif @shadcnblocks (gratuit sans clé, pro via env)', () => {
  assert.match(SHADCN_NOTE, /@shadcnblocks/);
  assert.match(SHADCN_NOTE, /shadcn add/);
  assert.match(SHADCN_NOTE, /SHADCNBLOCKS_API_KEY/);
  assert.doesNotMatch(SHADCN_NOTE, /masonjames|payante/i);
});
