import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toCursorAgent } from './agent-frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'templates/agents/subagents');
const AGENTS = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const fmOf = (out) => out.split('---')[1];

test('les 7 agents réels produisent un frontmatter Cursor valide', () => {
  assert.ok(AGENTS.length >= 7, `7 agents attendus, ${AGENTS.length} trouvés`);
  for (const f of AGENTS) {
    const out = toCursorAgent(read(f));
    const fm = fmOf(out);
    assert.match(fm, /\nname: \S+/, `${f} : name`);
    assert.match(fm, /\ndescription: "/, `${f} : description quotée`);
    assert.match(fm, /\nmodel: inherit/, `${f} : modèle hérité`);
    assert.doesNotMatch(fm, /tools:|skills:|mcpServers:/, `${f} : champs non supportés retirés du frontmatter`);
    assert.doesNotMatch(out, /undefined/, `${f} : aucun champ perdu`);
  }
});

test('readonly déduit de tools OU disallowedTools', () => {
  const ro = toCursorAgent('---\nname: a\ndescription: d\ntools: Read, Grep\n---\ncorps\n');
  assert.match(ro, /readonly: true/, 'tools sans Write → readonly');
  const ro2 = toCursorAgent('---\nname: a\ndescription: d\ndisallowedTools: Write, Edit\n---\ncorps\n');
  assert.match(ro2, /readonly: true/, 'disallowedTools Write/Edit → readonly');
  const rw = toCursorAgent('---\nname: a\ndescription: d\ntools: Read, Write\n---\ncorps\n');
  assert.doesNotMatch(rw, /readonly: true/, 'peut écrire → pas readonly');
});

test('CRLF (Windows) ne casse pas le frontmatter', () => {
  const out = toCursorAgent(read(AGENTS[0]).replace(/\n/g, '\r\n'));
  assert.doesNotMatch(out, /undefined/);
  assert.equal((out.match(/^---$/gm) || []).length, 2, 'un seul frontmatter');
});

test('description contenant « : » reste du YAML valide', () => {
  const out = toCursorAgent('---\nname: a\ndescription: Fait X : puis Y\n---\ncorps\n');
  assert.match(out, /description: "Fait X : puis Y"/);
});
