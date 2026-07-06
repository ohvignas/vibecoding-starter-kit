import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest } from './matrix.mjs';
import { SHARED_DOMAINS, renderDomains } from './domains.mjs';

test('DOMAINS.md SaaS liste labels, options, secrets et MCP', () => {
  const md = renderDomains({ stack: 'saas', domains: resolveStackManifest('saas', 'claude-code').domains, shared: SHARED_DOMAINS });
  assert.match(md, /Paiement/);
  assert.match(md, /@better-auth\/stripe/);
  assert.match(md, /STRIPE_WEBHOOK_SECRET/);
  assert.match(md, /mcp\.stripe\.com/);        // ligne MCP tirée du catalogue partagé
  assert.match(md, /searchIndex/);
});

test('DOMAINS.md mobile : règle IAP présente', () => {
  const md = renderDomains({ stack: 'mobile', domains: STACKS.mobile.domains, shared: SHARED_DOMAINS });
  assert.match(md, /IAP|RevenueCat/);
});

test("un domaine sans MCP n'imprime pas de ligne MCP vide", () => {
  const md = renderDomains({ stack: 'desktop', domains: STACKS.desktop.domains, shared: SHARED_DOMAINS });
  assert.doesNotMatch(md, /MCP\s*:\s*\n/);
});
