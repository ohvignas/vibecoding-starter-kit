import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_TRIGGERS } from './domains.mjs';
import { selectDomains } from './select-domains.mjs';

test('sélectionne les domaines présents dans le PRD (triés, uniques)', () => {
  const prd = 'Une app avec un abonnement premium et des notifications push.';
  assert.deepEqual(selectDomains(prd, DOMAIN_TRIGGERS), ['payment', 'push']);
});

test('cas positifs paiement : acheter / panier d\'achat', () => {
  assert.deepEqual(selectDomains('ajouter au panier d\'achat', DOMAIN_TRIGGERS), ['payment']);
  assert.deepEqual(selectDomains('acheter un article', DOMAIN_TRIGGERS), ['payment']);
});

test('cas NÉGATIFS : pas de faux positif paiement/licence', () => {
  assert.deepEqual(selectDomains('activation du compte par email de confirmation', DOMAIN_TRIGGERS), ['email'], 'activation compte ≠ licence');
  assert.deepEqual(selectDomains('je commande mes pensées dans une liste', DOMAIN_TRIGGERS), [], '"commande" isolé ≠ paiement');
});

test('licence détectée sur un vrai signal', () => {
  assert.deepEqual(selectDomains('activation de licence et clé de licence', DOMAIN_TRIGGERS), ['licensing']);
});
