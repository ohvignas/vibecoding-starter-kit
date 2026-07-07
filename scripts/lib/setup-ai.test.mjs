import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStackManifest, SUPERPOWERS, SHADCN_NOTE } from './matrix.mjs';
import { renderSetupAi } from './setup-ai.mjs';

const call = (stack, assistant) => renderSetupAi({
  stack, assistant, manifest: resolveStackManifest(stack, assistant),
  superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE,
});

test('SETUP-AI : plugins, skills, MCP, superpowers, design auto', () => {
  const md = call('saas', 'claude-code');
  assert.match(md, /\/plugin install convex@claude-plugins-official/);
  assert.match(md, /skills add better-auth\/skills.*-a claude-code/);
  assert.match(md, /shadcn/);
  assert.match(md, /plugin install superpowers/);           // section superpowers
  assert.match(md, /déjà installés par le wizard/i);        // section design
  assert.match(md, /shadcnblocks/i);                        // note shadcnblocks
  // Stitch (maquette IA) : section design avec clé API + MCP au niveau utilisateur (hors dépôt).
  assert.match(md, /clé API Stitch/i);
  assert.match(md, /MCP Stitch au niveau utilisateur/i);
  assert.match(md, /claude mcp add stitch/);              // commande user-scope pour claude-code
});

test('SETUP-AI mobile : MCP expo login requis', () => {
  assert.match(call('mobile', 'claude-code'), /expo.*login requis/);
});
