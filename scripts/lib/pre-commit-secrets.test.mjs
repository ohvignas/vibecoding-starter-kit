import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// La regex vit dans le template bash : on l'extrait telle quelle et on la rejoue en JS
// (le motif n'utilise que le sous-ensemble ERE compatible RegExp : alternation, classes, {n,}).
const src = fs.readFileSync(new URL('../../templates/hooks/pre-commit', import.meta.url), 'utf8');
const m = src.match(/grep -Eq '([^']+)'/);
assert.ok(m, 'la ligne grep -Eq du hook doit exister');
const RE = new RegExp(m[1]);

// ⚠️ Toutes les « clés » ci-dessous sont FACTICES (motifs répétés fabriqués pour le test).
const POSITIFS = [
  'ANTHROPIC_API_KEY=sk-ant-api03-' + 'AB12'.repeat(10),
  'OPENAI_API_KEY=sk-proj-' + 'CD34'.repeat(10),
  'const k = "sk-' + 'e5'.repeat(15) + '"',
  'STRIPE_SECRET_KEY=sk_live_' + 'F6'.repeat(10),
  'RESEND_API_KEY=re_' + 'Gh7J'.repeat(5),
  'GOOGLE_KEY=AIza' + 'K'.repeat(35),
  'GITHUB_TOKEN=ghp_' + 'L'.repeat(36),
  'AWS_KEY=AKIA' + 'M'.repeat(16),
  '-----BEGIN RSA PRIVATE KEY-----',
];
const NEGATIFS = [
  'const skin = "sk-court"',
  'resend est configuré dans convex/resend.ts',
  'ghp_tropcourt',
  'AIzaTropCourte',
  'sk_live_x',
  'cp .env.example .env',
  're_run_the_tests_again',
  'un commentaire re_initialisation banal',
];

test('regex pre-commit : détecte les formats de clés que le kit fait manipuler', () => {
  for (const s of POSITIFS) assert.equal(RE.test(s), true, `devrait bloquer : ${s}`);
});

test('regex pre-commit : ne bloque pas le code normal', () => {
  for (const s of NEGATIFS) assert.equal(RE.test(s), false, `ne devrait pas bloquer : ${s}`);
});
