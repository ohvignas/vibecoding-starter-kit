#!/usr/bin/env node
// Assemble LE plugin `vibecoding` — un seul dossier (`plugin/`) qui porte TROIS formats, plus les
// trois marketplaces qui le rendent installable depuis le dépôt.
//
// POURQUOI UN BUNDLE UNIQUE. Les trois assistants ont chacun leur manifeste, mais le CONTENU est le
// même (10 commandes, 7 agents, les skills de stack, les règles) : le dupliquer une fois par
// assistant garantirait que deux copies divergent. On écrit donc UN dossier `plugin/` qui contient
// les trois manifestes — chaque hôte lit le sien et découvre les composants dans les dossiers
// standard (`commands/`, `agents/`, `skills/`, `rules/`).
//
//   plugin.json                  → Agent Plugins (standard ouvert) : Cursor, Codex portable
//   .claude-plugin/plugin.json   → Claude Code
//   .cursor-plugin/plugin.json   → Cursor (accès aux rules/agents/commands)
//   .codex-plugin/plugin.json    → Codex (compatibilité)
//
// Les marketplaces vivent à la RACINE du dépôt, là où chaque hôte les cherche :
//   .claude-plugin/marketplace.json   (Claude Code — et lu aussi par Codex, compat)
//   .agents/plugins/marketplace.json  (Codex, marketplace de dépôt)
//   .cursor-plugin/marketplace.json   (Cursor, dépôt multi-plugins)
//
// SOURCE DE VÉRITÉ UNIQUE : `templates/` et `.claude/skills/`. Ce script ne fait que les assembler —
// relance-le après toute modif, sinon le plugin publié reste celui d'avant.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCliEntry } from './lib/cli-entry.mjs';
import { COMMANDS, cheminRunbook, cheminEtape, etapesDuRunbook } from './lib/commands-list.mjs';
import { CREW } from './lib/kit-owned.mjs';

const NOM = 'vibecoding';
const AUTEUR = { name: 'ohvignas', url: 'https://github.com/ohvignas' };
const DEPOT = 'https://github.com/ohvignas/vibecoding-starter-kit';
const DESCRIPTION = "La méthode vibecoding en plugin : les 10 commandes, les 7 agents de revue et les règles de stack — pour Cursor, Claude Code et Codex. (Pour créer un projet complet, `npm create vibecoding-kit`.)";
const MOTS_CLES = ['vibecoding', 'workflow', 'debutant', 'beginner', 'claude-code', 'cursor', 'codex'];

// La version du plugin suit celle du paquet : une seule vérité, jamais deux chiffres à tenir.
export function pluginVersion(kitRoot) {
  return JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8')).version;
}

const ecrire = (fichier, contenu) => { fs.mkdirSync(path.dirname(fichier), { recursive: true }); fs.writeFileSync(fichier, contenu); };
const json = (fichier, objet) => ecrire(fichier, JSON.stringify(objet, null, 2) + '\n');

// Les stacks qui portent un skill de stack (`.claude/skills/stack-<stack>/SKILL.md`).
function skillsDeStack(kitRoot) {
  const racine = path.join(kitRoot, '.claude/skills');
  return fs.readdirSync(racine, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('stack-'))
    .map((d) => d.name).sort();
}

export function buildPlugin(kitRoot, outDir = path.join(kitRoot, 'plugin')) {
  const done = [];
  const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); done.push(path.relative(outDir, to)); };

  // Repartir propre : un composant retiré de `templates/` doit disparaître du plugin.
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const version = pluginVersion(kitRoot);
  const commun = { name: NOM, description: DESCRIPTION, version, author: AUTEUR, homepage: DEPOT, repository: DEPOT, license: 'MIT', keywords: MOTS_CLES };

  // ── LES QUATRE MANIFESTES ────────────────────────────────────────────────────────────────────
  json(path.join(outDir, 'plugin.json'), { $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', ...commun });
  done.push('plugin.json');
  json(path.join(outDir, '.claude-plugin/plugin.json'), commun);
  done.push('.claude-plugin/plugin.json');
  json(path.join(outDir, '.cursor-plugin/plugin.json'), commun);
  done.push('.cursor-plugin/plugin.json');
  json(path.join(outDir, '.codex-plugin/plugin.json'), {
    name: NOM, version, description: DESCRIPTION, author: AUTEUR, skills: './skills/',
    interface: { displayName: 'Vibecoding', shortDescription: 'La méthode vibecoding pour ton assistant.', developerName: 'ohvignas', category: 'Productivity', capabilities: ['Read', 'Write'], websiteURL: DEPOT },
  });
  done.push('.codex-plugin/plugin.json');

  // ── LES COMPOSANTS, ASSEMBLÉS DEPUIS LES TEMPLATES ───────────────────────────────────────────
  // 10 commandes + leurs ÉTAPES (un runbook découpé renvoie à des fichiers : sans elles, le plugin
  // publierait un sommaire qui ouvre dans le vide).
  for (const c of COMMANDS) {
    cp(path.join(kitRoot, cheminRunbook(c)), path.join(outDir, 'commands', `${c}.md`));
    for (const e of etapesDuRunbook(kitRoot, c)) cp(path.join(kitRoot, cheminEtape(c, e)), path.join(outDir, 'commands', c, e));
  }
  // Les 7 agents du crew.
  for (const a of CREW) cp(path.join(kitRoot, 'templates/agents/subagents', `${a}.md`), path.join(outDir, 'agents', `${a}.md`));
  // Les skills de stack (découverts par sous-dossier `skills/<nom>/SKILL.md`).
  for (const s of skillsDeStack(kitRoot)) cp(path.join(kitRoot, '.claude/skills', s, 'SKILL.md'), path.join(outDir, 'skills', s, 'SKILL.md'));
  // Les règles génériques (Cursor les lit ; les autres hôtes les ignorent).
  for (const r of ['00-project.mdc', '10-css-maquette.mdc']) cp(path.join(kitRoot, 'templates/cursor/rules', r), path.join(outDir, 'rules', r));

  // Un mot d'emploi dans le plugin lui-même.
  ecrire(path.join(outDir, 'README.md'), `# ${NOM} (plugin)

La méthode vibecoding packagée pour **Cursor**, **Claude Code** et **Codex** : les 10 commandes
(\`/new-project\`, \`/build\`, \`/sos\`, \`/deploy\`…), les 7 agents du crew, les skills de stack et les
règles de base.

> ⚠️ Le plugin fournit la **méthode**. Il **ne scaffolde pas** un projet (pas de git, CI, MCP,
> \`maquette/\`). Pour un projet complet : \`npm create vibecoding-kit@latest\`.

## Installer

**Claude Code** — depuis le dossier du dépôt :
\`\`\`bash
claude plugin marketplace add ./            # ou : claude plugin marketplace add ohvignas/vibecoding-starter-kit
claude plugin install ${NOM}@${NOM}
\`\`\`

**Codex** — marketplace de dépôt (\`.agents/plugins/marketplace.json\`) :
\`\`\`bash
codex plugin marketplace add ./            # ou : codex plugin marketplace add ohvignas/vibecoding-starter-kit
codex plugin marketplace list
# puis /plugins dans le CLI
\`\`\`

**Cursor** — test local, ou dépôt importé en Team Marketplace :
\`\`\`bash
cp -r plugin ~/.cursor/plugins/local/${NOM}   # recharge la fenêtre (Developer: Reload Window)
\`\`\`

## Contenu

- \`commands/\` — les 10 runbooks et leurs étapes.
- \`agents/\` — \`verificateur\`, \`code-reviewer\`, \`security-reviewer\`, \`test-runner\`, \`critique-produit\`, \`critique-donnees\`, \`critique-ux\`.
- \`skills/\` — les règles de stack (saas, mobile, desktop, vitrine).
- \`rules/\` — les règles Cursor génériques.
`);
  done.push('README.md');

  return { done, version };
}

function marketplaceJson(kitRoot) {
  const version = pluginVersion(kitRoot);
  return {
    // ── Claude Code ─────────────────────────────────────────────────────────────
    claude: {
      name: NOM,
      owner: { name: AUTEUR.name, url: AUTEUR.url },
      description: DESCRIPTION,
      plugins: [{ name: NOM, source: './plugin', description: DESCRIPTION, version, category: 'Productivity', tags: MOTS_CLES }],
    },
    // ── Codex (marketplace de dépôt) — chemin résolu depuis la RACINE du marketplace ──────────
    codex: {
      name: NOM,
      interface: { displayName: 'Vibecoding' },
      plugins: [{ name: NOM, source: { source: 'local', path: './plugin' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }],
    },
    // ── Cursor (dépôt multi-plugins) ────────────────────────────────────────────
    cursor: {
      name: NOM,
      owner: { name: AUTEUR.name },
      metadata: { description: DESCRIPTION, version },
      plugins: [{ name: NOM, source: 'plugin', description: DESCRIPTION, version, license: 'MIT', keywords: MOTS_CLES }],
    },
  };
}

export function buildMarketplaces(kitRoot) {
  const m = marketplaceJson(kitRoot);
  const done = [];
  json(path.join(kitRoot, '.claude-plugin/marketplace.json'), m.claude); done.push('.claude-plugin/marketplace.json');
  json(path.join(kitRoot, '.agents/plugins/marketplace.json'), m.codex); done.push('.agents/plugins/marketplace.json');
  json(path.join(kitRoot, '.cursor-plugin/marketplace.json'), m.cursor); done.push('.cursor-plugin/marketplace.json');
  return { done };
}

// Garde d'entrée partagé (lib/cli-entry.mjs) : éviter le « exit 0 sans rien assembler » via symlink.
if (isCliEntry(import.meta.url)) {
  const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const i = process.argv.indexOf('--out');
  const outDir = i !== -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : path.join(kitRoot, 'plugin');
  const { done, version } = buildPlugin(kitRoot, outDir);
  const mk = buildMarketplaces(kitRoot);
  console.log(`Plugin ${NOM} ${version} assemblé dans ${path.relative(kitRoot, outDir) || '.'}/ :`);
  console.log(done.map((d) => '  ' + d).join('\n'));
  console.log('\nMarketplaces :');
  console.log([...mk.done].map((d) => '  ' + d).join('\n'));
}
