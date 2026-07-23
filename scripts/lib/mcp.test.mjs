import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMcpConfig } from './mcp.mjs';

test('crée depuis rien', () => {
  const out = mergeMcpConfig(null, { convex: { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] } });
  const j = JSON.parse(out);
  assert.deepEqual(j.mcpServers.convex.args, ['-y', 'convex@latest', 'mcp', 'start']);
});

test('préserve un serveur existant, ajoute le nouveau', () => {
  const existing = JSON.stringify({ mcpServers: { convex: { command: 'npx', args: ['keep'] } } });
  const out = mergeMcpConfig(existing, { convex: { command: 'npx', args: ['IGNORE'] }, shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] } });
  const j = JSON.parse(out);
  assert.deepEqual(j.mcpServers.convex.args, ['keep'], 'ne reecrit pas l\'existant');
  assert.ok(j.mcpServers.shadcn, 'ajoute le nouveau');
});

test('retire les métas needsAuth + prereq du fichier écrit', () => {
  const out = mergeMcpConfig(null, {
    expo: { type: 'http', url: 'https://mcp.expo.dev/mcp', needsAuth: true },
    maestro: { command: 'maestro', args: ['mcp'], prereq: 'installe le Maestro CLI' },
  });
  const j = JSON.parse(out);
  assert.equal(j.mcpServers.expo.url, 'https://mcp.expo.dev/mcp');
  assert.equal('needsAuth' in j.mcpServers.expo, false);
  assert.deepEqual(j.mcpServers.maestro, { command: 'maestro', args: ['mcp'] }, 'prereq strippé, config propre');
});

test('idempotent', () => {
  const servers = { convex: { command: 'npx', args: ['a'] } };
  const once = mergeMcpConfig(null, servers);
  const twice = mergeMcpConfig(once, servers);
  assert.equal(once, twice);
});
