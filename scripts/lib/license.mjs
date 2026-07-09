// Code d'accès UNIQUE partagé, distribué par email via la landing.
// Entonnoir (force l'email), PAS un verrou : le paquet est public/open-source → contournable.
export const EXPECTED_LICENSE = 'VIBE-7K4Q-9F2P-XR31';

// Normalise : majuscules, on ne garde que [A-Z0-9] → tirets/espaces/casse ignorés.
export function normalizeLicense(s) {
  return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Vrai si le code (normalisé) est non vide ET égal au code attendu.
export function checkLicense(input, expected = EXPECTED_LICENSE) {
  const n = normalizeLicense(input);
  return n.length > 0 && n === normalizeLicense(expected);
}
