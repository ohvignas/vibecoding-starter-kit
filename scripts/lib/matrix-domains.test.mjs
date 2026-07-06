import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest } from './matrix.mjs';

test('saas.domains : paiement 4 options + email + search built-in', () => {
  const d = STACKS.saas.domains;
  assert.ok(d.payment.options.some((o) => o.includes('@better-auth/stripe')));
  assert.equal(d.payment.mcp, 'payment');
  assert.ok(d.email.options.some((o) => o.includes('@convex-dev/resend')));
  assert.ok(d.search.options.some((o) => /searchIndex/i.test(o)));
});

test('mobile.domains : règle IAP vs Stripe + push + camera', () => {
  const d = STACKS.mobile.domains;
  assert.ok(d.payment.options.some((o) => /RevenueCat|react-native-purchases/.test(o)));
  assert.ok(d.push.options.some((o) => o.includes('expo-notifications')));
  assert.ok(d.camera);
});

test('desktop.domains : paiement backend + auto-update + persistence', () => {
  const d = STACKS.desktop.domains;
  assert.match(d.payment.when, /backend/i);
  assert.ok(d['auto-update'].options.some((o) => o.includes('update-electron-app')));
  assert.ok(d.persistence.options.some((o) => o.includes('better-sqlite3')));
});

test('resolveStackManifest expose domains', () => {
  const m = resolveStackManifest('saas', 'claude-code');
  assert.ok(m.domains.payment, 'domains dans le manifeste résolu');
});
