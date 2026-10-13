// scripts/lib/plugin.test.mjs
// LE PLUGIN `vibecoding` — UN DOSSIER, TROIS FORMATS, TROIS MARKETPLACES.
//
// Décision d'Antoine (2026-10-13) : « que ça soit un plugin qu'on peut installer sur Claude, Codex,
// Cursor facilement, avec le dossier simplement ». Les trois hôtes ont chacun leur manifeste, mais
// le CONTENU est identique (10 commandes, 7 agents, les skills de stack, les règles). On vérifie
// donc deux choses, et pas une :
//   1. le contenu du plugin EST celui des templates du kit (sinon deux copies divergent en silence,
//      et le plugin publié n'est plus la méthode qu'on croit) ;
//   2. les manifestes et les marketplaces sont présents, valides, et pointent bien sur `plugin`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, cheminRunbook, cheminEtape, etapesDuRunbook } from './commands-list.mjs';
import { CREW } from './kit-owned.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const json = (p) => JSON.parse(read(p));
const NOM = 'vibecoding';

test('plugin — les 10 commandes ET leurs étapes sont des copies EXACTES des templates', () => {
  for (const c of COMMANDS) {
    const dansPlugin = `plugin/commands/${c}.md`;
    assert.ok(exists(dansPlugin), `${dansPlugin} manquant`);
    assert.equal(read(dansPlugin), read(cheminRunbook(c)), `${dansPlugin} a dérivé — relance node scripts/build-plugin.mjs`);
    for (const e of etapesDuRunbook(ROOT, c)) {
      const p = `plugin/commands/${c}/${e}`;
      assert.ok(exists(p), `${p} manquant (sommaire qui ouvre dans le vide)`);
      assert.equal(read(p), read(cheminEtape(c, e)), `${p} a dérivé — relance le builder`);
    }
  }
  // Aucune commande en trop : le dossier du plugin = la source, ni plus ni moins.
  const entrees = fs.readdirSync(path.join(ROOT, 'plugin/commands')).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
  assert.deepEqual(entrees, [...COMMANDS].sort(), 'le plugin doit embarquer exactement les 10 runbooks');
});

test('plugin — les 7 agents, les skills de stack et les règles sont des copies exactes', () => {
  for (const a of CREW) {
    const p = `plugin/agents/${a}.md`;
    assert.ok(exists(p), `${p} manquant`);
    assert.equal(read(p), read(`templates/agents/subagents/${a}.md`), `${p} a dérivé`);
    // Un agent Cursor/Claude doit porter son frontmatter.
    assert.match(read(p), /^---\n[\s\S]*?name:\s*\S/m, `${p} : frontmatter manquant`);
  }
  for (const s of ['stack-saas', 'stack-mobile', 'stack-desktop', 'stack-vitrine']) {
    const p = `plugin/skills/${s}/SKILL.md`;
    assert.ok(exists(p), `${p} manquant`);
    assert.equal(read(p), read(`.claude/skills/${s}/SKILL.md`), `${p} a dérivé`);
    assert.match(read(p), /^---\n[\s\S]*?name:\s*\S/m, `${p} : frontmatter manquant`);
  }
  for (const r of ['00-project.mdc', '10-css-maquette.mdc']) {
    const p = `plugin/rules/${r}`;
    assert.ok(exists(p), `${p} manquant`);
    assert.equal(read(p), read(`templates/cursor/rules/${r}`), `${p} a dérivé`);
  }
});

test('plugin — les QUATRE manifestes existent, sont valides, et nomment le plugin', () => {
  const version = JSON.parse(read('package.json')).version;
  const chemins = ['plugin/plugin.json', 'plugin/.claude-plugin/plugin.json', 'plugin/.cursor-plugin/plugin.json', 'plugin/.codex-plugin/plugin.json'];
  for (const p of chemins) {
    assert.ok(exists(p), `${p} manquant`);
    const m = json(p);
    assert.equal(m.name, NOM, `${p} : nom du plugin`);
    assert.equal(m.version, version, `${p} : version ≠ package.json (${version})`);
  }
  // Le manifeste portable (Agent Plugins) porte le schéma : Cursor et Codex le reconnaissent à ça.
  assert.match(json('plugin/plugin.json').$schema, /agent-plugins\.org\/schemas/, 'plugin.json : schéma Agent Plugins manquant');
  // Le manifeste Codex de compatibilité déclare le dossier des skills.
  assert.equal(json('plugin/.codex-plugin/plugin.json').skills, './skills/', '.codex-plugin : chemins des skills');
});

test('plugin — les TROIS marketplaces pointent sur `plugin`, avec les champs propres à chaque hôte', () => {
  // Claude Code — `.claude-plugin/marketplace.json` : name + owner.name + plugins[].source relatif.
  const claude = json('.claude-plugin/marketplace.json');
  assert.ok(claude.owner?.name, 'Claude : owner.name requis');
  assert.equal(claude.plugins?.[0]?.name, NOM, 'Claude : nom du plugin');
  assert.equal(claude.plugins?.[0]?.source, './plugin', 'Claude : source doit être ./plugin');

  // Codex — `.agents/plugins/marketplace.json` : source { source: local, path }, policy, category.
  const codex = json('.agents/plugins/marketplace.json');
  assert.equal(codex.plugins?.[0]?.source?.source, 'local', 'Codex : source.source = local');
  assert.equal(codex.plugins?.[0]?.source?.path, './plugin', 'Codex : source.path = ./plugin');
  assert.ok(codex.plugins?.[0]?.policy?.installation, 'Codex : policy.installation requis');
  assert.ok(codex.plugins?.[0]?.category, 'Codex : category requise');

  // Cursor — `.cursor-plugin/marketplace.json` : name + owner.name + plugins[].source (chemin nu).
  const cursor = json('.cursor-plugin/marketplace.json');
  assert.ok(cursor.owner?.name, 'Cursor : owner.name requis');
  assert.equal(cursor.plugins?.[0]?.name, NOM, 'Cursor : nom du plugin');
  assert.equal(cursor.plugins?.[0]?.source, 'plugin', 'Cursor : source = plugin');

  // La marketplace Codex doit être VERSIONNÉE (sinon le plugin du dépôt n'est pas installable).
  assert.doesNotMatch(read('.gitignore'), /^\.agents\/$/m, '.agents/ ne doit pas être ignoré en bloc');
});

test('plugin — le dossier porte de quoi README une installation par hôte', () => {
  const r = read('plugin/README.md');
  for (const m of [/claude plugin marketplace add/, /codex plugin marketplace add/, /\.cursor\/plugins\/local/]) {
    assert.match(r, m, `plugin/README.md doit documenter ${m}`);
  }
  assert.match(r, /ne scaffolde pas|npm create vibecoding-kit/i, 'dire que le plugin ne scaffolde pas');
});
