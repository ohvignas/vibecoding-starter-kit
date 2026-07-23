import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARK_START, MARK_END, wrapManaged, extractManaged, mergeManagedSection } from './managed-section.mjs';

test('wrapManaged entoure des marqueurs', () => {
  const w = wrapManaged('CORPS');
  assert.ok(w.startsWith(MARK_START));
  assert.ok(w.trimEnd().endsWith(MARK_END));
  assert.match(w, /CORPS/);
});

test('extractManaged récupère le bloc, null si absent', () => {
  assert.equal(extractManaged('rien'), null);
  const block = wrapManaged('X');
  assert.equal(extractManaged(`avant\n${block}\naprès`), block);
});

test('merge : marqueurs présents → remplace en place, zone utilisateur préservée', () => {
  const existing = `${wrapManaged('VIEUX')}\n\n## Mes règles\nGARDE-MOI`;
  const fresh = wrapManaged('NEUF');
  const out = mergeManagedSection(existing, fresh);
  assert.match(out, /NEUF/);
  assert.doesNotMatch(out, /VIEUX/);
  assert.match(out, /GARDE-MOI/);
});

test('merge : marqueurs absents → préfixe le bloc, ancien contenu conservé dessous', () => {
  const out = mergeManagedSection('ANCIEN SANS MARQUEURS', wrapManaged('NEUF'));
  assert.ok(out.indexOf('NEUF') < out.indexOf('ANCIEN SANS MARQUEURS'));
  assert.match(out, /ANCIEN SANS MARQUEURS/);
});

test('merge est idempotent (rejouer ne change rien)', () => {
  const fresh = wrapManaged('NEUF');
  const once = mergeManagedSection(`${fresh}\n\nUSER`, fresh);
  const twice = mergeManagedSection(once, fresh);
  assert.equal(once, twice);
});

test('merge jette si le frais n\'a pas de marqueurs', () => {
  assert.throws(() => mergeManagedSection('x', 'pas de marqueurs'), /marqueurs/);
});
