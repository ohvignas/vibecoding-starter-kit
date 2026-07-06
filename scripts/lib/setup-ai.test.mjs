import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStackManifest, DESIGN_SKILLS } from './matrix.mjs';
import { renderSetupAi } from './setup-ai.mjs';

test('SaaS/claude-code : plugin, skills, MCP, design', () => {
  const md = renderSetupAi({ stack: 'saas', assistant: 'claude-code', manifest: resolveStackManifest('saas', 'claude-code'), designSkills: DESIGN_SKILLS });
  assert.match(md, /\/plugin install convex@claude-plugins-official/);
  assert.match(md, /npx skills add better-auth\/skills/);
  assert.match(md, /shadcn/);
  assert.match(md, /frontend-design/);
});

test('Mobile : MCP expo marqué login requis', () => {
  const md = renderSetupAi({ stack: 'mobile', assistant: 'claude-code', manifest: resolveStackManifest('mobile', 'claude-code'), designSkills: DESIGN_SKILLS });
  assert.match(md, /expo.*login requis/);
});

test('assistant sans plugin → mention aucun', () => {
  const md = renderSetupAi({ stack: 'saas', assistant: 'codex', manifest: resolveStackManifest('saas', 'codex'), designSkills: DESIGN_SKILLS });
  assert.match(md, /aucun plugin/i);
});
