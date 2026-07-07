import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest, DESIGN_SKILLS, STITCH } from './matrix.mjs';

test('STACKS a les 3 stacks avec la bonne forme', () => {
  for (const s of ['saas', 'mobile', 'desktop']) {
    assert.ok(STACKS[s], `stack ${s} présente`);
    assert.ok(STACKS[s].mcp && typeof STACKS[s].mcp === 'object');
    assert.ok(Array.isArray(STACKS[s].checks.preCommit));
  }
});

test('resolveStackManifest(saas, claude-code) : plugin convex + MCP shadcn + lint en preCommit', () => {
  const m = resolveStackManifest('saas', 'claude-code');
  assert.ok(m.plugins.some((p) => p.cmd.includes('convex@claude-plugins-official')));
  assert.ok('shadcn' in m.mcp);
  assert.ok(m.checks.preCommit.includes('lint'));
  assert.equal(m.scripts.typecheck, 'tsc --noEmit');
});

test('resolveStackManifest(mobile, cursor) : pas de plugin cursor, MCP expo avec needsAuth, lint-expo', () => {
  const m = resolveStackManifest('mobile', 'cursor');
  assert.deepEqual(m.plugins, []);
  assert.equal(m.mcp.expo.needsAuth, true);
  assert.ok(m.checks.preCommit.includes('lint-expo'));
});

test('resolveStackManifest(desktop, claude-code) : MCP chrome-devtools, security en prePush', () => {
  const m = resolveStackManifest('desktop', 'claude-code');
  assert.ok('chrome-devtools' in m.mcp);
  assert.ok(m.checks.prePush.includes('security'));
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

test('Stitch (maquette IA) : skill officiel sur les 3 stacks, MCP hors du projet (clé jamais commitée)', () => {
  for (const stack of ['saas', 'mobile', 'desktop']) {
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

test('DESIGN_SKILLS liste les 5 skills design', () => {
  assert.match(DESIGN_SKILLS, /frontend-design/);
  assert.match(DESIGN_SKILLS, /shadcnblocks/);
});
