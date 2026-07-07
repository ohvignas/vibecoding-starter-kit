import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsColor, paint, heading, menu, ok, hint } from './ui.mjs';

test('supportsColor : TTY vrai + pas de NO_COLOR', () => {
  assert.equal(supportsColor({ isTTY: true }, {}), true);
  assert.equal(supportsColor({ isTTY: false }, {}), false);
  assert.equal(supportsColor({ isTTY: true }, { NO_COLOR: '1' }), false);
  assert.equal(supportsColor(undefined, {}), false);
});

test('paint : on enveloppe en ANSI, off renvoie brut', () => {
  assert.match(paint(true).green('x'), /\x1b\[32m/);
  assert.equal(paint(false).green('x'), 'x');
});

test('heading/menu/ok/hint contiennent le texte fourni', () => {
  assert.match(heading('Config', false), /Config/);
  const m = menu('Quoi ?', [{ label: 'SaaS', hint: 'web' }, { label: 'Mobile' }], false);
  assert.match(m, /Quoi \?/);
  assert.match(m, /1\) SaaS/);
  assert.match(m, /web/);
  assert.match(m, /2\) Mobile/);
  assert.match(ok('fait', false), /✓ fait/);
  assert.match(hint('astuce', false), /astuce/);
});
