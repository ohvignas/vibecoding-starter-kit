import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLicense, checkLicense, EXPECTED_LICENSE } from './license.mjs';

test('normalizeLicense : majuscules, ne garde que A-Z0-9', () => {
  assert.equal(normalizeLicense('vibe-7k4q-9f2p-xr31'), 'VIBE7K4Q9F2PXR31');
  assert.equal(normalizeLicense('  VIBE 7K4Q '), 'VIBE7K4Q');
  assert.equal(normalizeLicense(null), '');
  assert.equal(normalizeLicense(undefined), '');
});

test('checkLicense : insensible casse/tirets/espaces, refuse vide et faux', () => {
  assert.equal(checkLicense(EXPECTED_LICENSE), true);
  assert.equal(checkLicense('vibe7k4q9f2pxr31'), true);       // sans tirets, minuscules
  assert.equal(checkLicense(' VIBE-7K4Q-9F2P-XR31 '), true);  // espaces
  assert.equal(checkLicense(''), false);
  assert.equal(checkLicense('WRONG-CODE'), false);
  assert.equal(checkLicense(null), false);
});
