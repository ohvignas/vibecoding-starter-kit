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

test('robustesse apostrophe : droite ET courbe sélectionnent le domaine', () => {
  const S = String.fromCharCode(0x27), C = String.fromCharCode(0x2019); // ' et '
  assert.deepEqual(selectDomains('période d' + S + 'essai', DOMAIN_TRIGGERS), ['licensing']);
  assert.deepEqual(selectDomains('période d' + C + 'essai', DOMAIN_TRIGGERS), ['licensing']);
  assert.deepEqual(selectDomains('ajouter au panier d' + C + 'achat', DOMAIN_TRIGGERS), ['payment']);
});

test('triggers vitrine : formulaire de contact + multilingue détectés', () => {
  const picked = selectDomains('Un site vitrine avec un formulaire de contact, disponible en français et en anglais.', DOMAIN_TRIGGERS);
  assert.ok(picked.includes('forms'), 'forms détecté');
  assert.ok(picked.includes('i18n'), 'i18n détecté');
});
