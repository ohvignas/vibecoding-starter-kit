import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHARED_DOMAINS, DOMAIN_TRIGGERS } from './domains.mjs';

test("SHARED_DOMAINS couvre les 7 MCP partagés avec une commande d'install", () => {
  for (const k of ['payment', 'email', 'analytics', 'error-tracking', 'docs', 'repo', 'e2e']) {
    assert.ok(SHARED_DOMAINS[k], `domaine ${k}`);
    assert.ok(SHARED_DOMAINS[k].mcp.install.length > 0, `install ${k}`);
  }
  assert.match(SHARED_DOMAINS.payment.mcp.install, /mcp\.stripe\.com/);
  assert.match(SHARED_DOMAINS['error-tracking'].mcp.install, /mcp\.sentry\.dev/);
});

test("DOMAIN_TRIGGERS matche les mots-clés FR attendus", () => {
  assert.match('je veux un abonnement premium', DOMAIN_TRIGGERS.payment);
  assert.match('envoyer un email de confirmation', DOMAIN_TRIGGERS.email);
  assert.match('prendre une photo', DOMAIN_TRIGGERS.camera);
  assert.match('une carte avec la localisation', DOMAIN_TRIGGERS.maps);
  assert.match('mise à jour automatique', DOMAIN_TRIGGERS['auto-update']);
  assert.doesNotMatch('juste une page de contact', DOMAIN_TRIGGERS.payment);
});
