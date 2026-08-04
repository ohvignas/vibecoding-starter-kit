import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, copyIfAbsent, copyDirIfAbsent, writeIfAbsent } from './fsops.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-fsops-')); }

test('copyIfAbsent copie puis saute si présent', () => {
  const d = tmp();
  const src = path.join(d, 'a.txt'); fs.writeFileSync(src, 'x');
  const dest = path.join(d, 'out', 'a.txt');
  assert.equal(copyIfAbsent(src, dest).status, 'copied');
  assert.equal(fs.readFileSync(dest, 'utf8'), 'x');
  assert.equal(copyIfAbsent(src, dest).status, 'skipped-exists');
  assert.equal(copyIfAbsent(src, dest, { force: true }).status, 'copied');

  // `writeIfAbsent` — même contrat, pour un contenu CALCULÉ (le runbook concaténé de Codex).
  // Ce qui compte : il ne doit pas écraser le travail de l'utilisateur plus facilement que la
  // copie. Sans `--force`, un fichier existant est conservé tel quel.
  const calc = path.join(d, 'out', 'gen.md');
  assert.equal(writeIfAbsent(calc, 'A').status, 'copied');
  assert.equal(fs.readFileSync(calc, 'utf8'), 'A');
  assert.equal(writeIfAbsent(calc, 'B').status, 'skipped-exists');
  assert.equal(fs.readFileSync(calc, 'utf8'), 'A', 'le contenu existant est conservé, pas réécrit');
  assert.equal(writeIfAbsent(calc, 'B', { force: true }).status, 'copied');
  assert.equal(fs.readFileSync(calc, 'utf8'), 'B');
});

test('copyDirIfAbsent recopie récursivement', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'src', 'sub'), { recursive: true });
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), '1');
  fs.writeFileSync(path.join(d, 'src', 'sub', 'b.txt'), '2');
  const res = copyDirIfAbsent(path.join(d, 'src'), path.join(d, 'dst'));
  assert.equal(res.length, 2);
  assert.ok(fs.existsSync(path.join(d, 'dst', 'sub', 'b.txt')));
});
