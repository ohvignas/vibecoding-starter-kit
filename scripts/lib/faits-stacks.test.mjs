// Lot F — ce que le kit AFFIRME du monde extérieur (versions, paquets, dépôts, plateformes).
// Ces faits-là pourrissent tout seuls : aucun test ne rougit quand Astro passe un majeur ou
// qu'un paquet est déprécié. Ce fichier ne vérifie pas le monde (pas de réseau en test) : il
// vérifie que le kit dit UNE SEULE CHOSE, et que cette chose est celle qui a été prouvée par
// `npm view` / l'API GitHub au moment du Lot F — les sorties sont collées dans le rapport.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PINS, STACKS } from './matrix.mjs';

const RACINE = path.resolve(import.meta.dirname, '..', '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

// Les fichiers que le kit LIVRE ou fait lire à un débutant. `docs/` est de l'histoire (plans,
// audits) et `ai-context/*/llms*.txt` des dumps de docs tierces : ni l'un ni l'autre n'est une
// affirmation du kit.
function marcher(rel, acc = []) {
  const abs = path.join(RACINE, rel);
  if (!fs.existsSync(abs)) return acc;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) marcher(r, acc);
    else if (/\.(md|mdc|mjs|yml|json|sh)$/.test(e.name)) acc.push(r);
  }
  return acc;
}
const FICHIERS_KIT = () => [
  ...marcher('stacks'), ...marcher('templates'), ...marcher('.claude/skills'),
  ...marcher('playbook'), ...marcher('cursor-plugin'), ...marcher('guides'),
  ...marcher('.github/workflows'),
  'README.md', 'scripts/lib/matrix.mjs', 'scripts/lib/domains.mjs', 'scripts/download-ai-context.sh',
  'ai-context/README.md', 'ai-context/astro/README.md', 'ai-context/electron/README.md',
].filter((f) => fs.existsSync(path.join(RACINE, f)));

// Interdire un nom, c'est le prononcer. Une ligne qui dit « X est supprimé, ne l'écris jamais »
// n'enseigne pas X — elle en protège. Sans cette exception, le kit ne pourrait plus MISE EN GARDE
// contre rien, et chaque correction du Lot F ferait rougir son propre test.
const MISE_EN_GARDE = /supprim|retir|d[ée]pr[ée]ci|abandonn|obsol[èe]te|jamais|ne les [ée]cris|Depuis Astro|^\s*\/\//i;

// Cherche un motif dans tous les fichiers du kit → liste de `fichier:ligne — texte`.
// `avertissementsOk` : les lignes de mise en garde ne comptent pas comme des recommandations.
function chercher(re, { avertissementsOk = false } = {}) {
  const out = [];
  for (const f of FICHIERS_KIT()) {
    lire(f).split('\n').forEach((l, i) => {
      if (!re.test(l)) return;
      if (avertissementsOk && MISE_EN_GARDE.test(l)) return;
      out.push(`${f}:${i + 1} — ${l.trim().slice(0, 120)}`);
    });
  }
  return out;
}

// ── F1 · F3 — Astro : un seul majeur, et c'est l'épingle ───────────────────────────────────────
// `npm view astro version` = 7.1.6 · `engines.node = '>=22.12.0'` (sorties dans le rapport).
test('F3 — la version majeure d\'Astro est épinglée dans une source unique', () => {
  assert.ok(PINS.vitrine, 'PINS.vitrine doit exister (matrix.mjs)');
  assert.match(PINS.vitrine.astro, /^\d+$/, 'PINS.vitrine.astro = le majeur, en chiffres');
  assert.match(PINS.vitrine.node, /^\d+\.\d+$/, 'PINS.vitrine.node = le minimum exigé par ce majeur');
});

test('F1 — aucun fichier du kit n\'annonce un autre majeur d\'Astro que l\'épingle', () => {
  const fautes = [];
  for (const f of FICHIERS_KIT()) {
    lire(f).split('\n').forEach((l, i) => {
      // « supprimé par Astro 6 » raconte l'histoire d'une API : ce n'est pas annoncer la version
      // de la stack. Seules les lignes qui la PRÉSENTENT sont comparées à l'épingle.
      if (MISE_EN_GARDE.test(l)) return;
      for (const m of l.matchAll(/\bAstro\s+(\d+)\b/g)) {
        if (m[1] !== PINS.vitrine.astro) fautes.push(`${f}:${i + 1} — « Astro ${m[1]} » (épingle : Astro ${PINS.vitrine.astro}) : ${l.trim().slice(0, 100)}`);
      }
    });
  }
  assert.deepEqual(fautes, [], `Le kit annonce un majeur d'Astro qui n'est pas l'épingle :\n${fautes.join('\n')}`);
});

test('F1 — les API supprimées par Astro 6 ne sont plus enseignées', () => {
  // Preuve : release notes `astro@6.0.0` — PR #14421 « Removes the previously deprecated
  // Astro.glob() » · PR #14400 « Removes the deprecated <ViewTransitions /> component ».
  assert.deepEqual(chercher(/Astro\.glob\s*\(/, { avertissementsOk: true }), [], 'Astro.glob() est supprimé depuis Astro 6');
  assert.deepEqual(chercher(/<ViewTransitions\b/, { avertissementsOk: true }), [], '<ViewTransitions /> est supprimé depuis Astro 6 (→ <ClientRouter />)');
  // Le fichier de config des collections a changé d'emplacement ET de contrat (un `loader` est
  // requis) : `src/content/config.ts` n'est plus lu sans `legacy.collectionsBackwardsCompat`.
  assert.deepEqual(chercher(/src\/content\/config\.ts/, { avertissementsOk: true }), [], 'l\'emplacement legacy du fichier de collections');
  // Et `src/content/` n'est plus le dossier magique qui DÉFINIT une collection : ce qui la
  // définit est une entrée de `src/content.config.ts` avec son `loader`.
  assert.deepEqual(chercher(/content collections?\s*\*{0,2}\s*\(`?src\/content\/`?\)/i), [],
    'un dossier ne définit plus une collection depuis Astro 6 — c\'est `src/content.config.ts` + `loader`');
});

test('F1 — la vitrine dit le contrat des collections d\'Astro 7 et le Node qu\'il exige', () => {
  // CHAQUE fichier de règles, pas leur concaténation : l'IA n'en lit souvent qu'un seul, et un
  // test sur la somme laisse passer la perte de la consigne dans l'un des deux.
  for (const f of ['stacks/vitrine/AGENTS.md', 'templates/cursor/rules/vitrine/astro.mdc', '.claude/skills/stack-vitrine/SKILL.md']) {
    const t = lire(f);
    assert.match(t, /src\/content\.config\.ts/, `${f} : le fichier de config des collections, au bon endroit`);
    assert.match(t, /loader/, `${f} : une collection sans \`loader\` n'existe pas en Astro 7`);
  }
  for (const f of ['stacks/vitrine/README.md', 'stacks/vitrine/AGENTS.md', 'templates/cursor/rules/vitrine/astro.mdc', '.claude/skills/stack-vitrine/SKILL.md', 'playbook/stack-vitrine.md']) {
    assert.ok(lire(f).includes(PINS.vitrine.node), `${f} : doit dire Node ≥ ${PINS.vitrine.node} (engines d'astro@7)`);
  }
});

// ── F2 — l'exemple vitrine doit compiler ───────────────────────────────────────────────────────
test('F2 — l\'exemple vitrine déclare la collection qu\'il lit', () => {
  const ex = lire('templates/examples/vitrine.md');
  const lues = [...ex.matchAll(/getCollection\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
  assert.ok(lues.length, 'l\'exemple lit bien une collection');
  assert.match(ex, /src\/content\.config\.ts/, 'sans ce fichier, `getCollection` ne trouve rien et le build casse');
  assert.match(ex, /from ['"]astro\/loaders['"]/, 'le loader vient de `astro/loaders`');
  for (const c of lues) {
    assert.match(ex, new RegExp(`const ${c}\\s*=\\s*defineCollection`), `la collection « ${c} » doit être définie`);
    assert.match(ex, new RegExp(`collections\\s*=\\s*\\{[^}]*\\b${c}\\b`), `la collection « ${c} » doit être exportée`);
  }
});

// ── F5 — paquets morts ─────────────────────────────────────────────────────────────────────────
// `npm view @react-email/components deprecated` → « Package no longer supported… » (1.0.12).
// Le README de resend/react-email installe `react-email` et importe depuis `react-email`.
test('F5 — aucun paquet déprécié ou abandonné n\'est recommandé', () => {
  const o = { avertissementsOk: true };
  assert.deepEqual(chercher(/@react-email\/components/, o), [], '@react-email/components est déprécié → `react-email`');
  assert.deepEqual(chercher(/@doyensec\/electronegativity/, o), [], 'npm figé au 09/03/2023 → retiré (voir F5 du rapport)');
  assert.deepEqual(chercher(/expo-convex-auth/, o), [], 'get-convex/expo-convex-auth = une app d\'exemple → la bibliothèque est get-convex/convex-auth');
});

// ── F6 — étiquettes ────────────────────────────────────────────────────────────────────────────
// `gh api repos/ohvignas/claude-electron-skills` → 1 ★, « Electron 42 reference skills ».
test('F6 — les skills Electron ne sont jamais annoncés « officiels »', () => {
  // Le motif n'exigeait que « officiel » : l'étiquette a survécu EN ANGLAIS dans la `description`
  // du frontmatter de `.claude/skills/stack-desktop/SKILL.md` — la ligne même que l'assistant lit
  // pour décider de charger le skill, et un fichier qui part dans le paquet publié. Un kit
  // francophone dont les skills portent un frontmatter anglais a besoin des deux langues.
  const fautes = chercher(/(?:skills?\s+[Ee]lectron|electron:\*)[^.\n]*(?:officiel|official)|(?:officiel(?:le)?s?|official)\s+electron:\*/i);
  assert.deepEqual(fautes, [], `un dépôt tiers d'une étoile n'est pas « officiel » :\n${fautes.join('\n')}`);
});

test('F6 — le dépôt des skills Electron est nommé, et dit pour ce qu\'il est', () => {
  const desktop = lire('stacks/desktop/README.md') + lire('stacks/desktop/AGENTS.md') + lire('.claude/skills/stack-desktop/SKILL.md');
  assert.match(desktop, /ohvignas\/claude-electron-skills/, 'le dépôt doit être nommé là où les skills sont présentés');
  assert.match(desktop, /communautaire/i, 'et étiqueté « communautaire », jamais « officiel »');
});

// ── F7 — faits faux ────────────────────────────────────────────────────────────────────────────
// Preuve : expo/expo `docs/pages/push-notifications/what-you-need-to-know.mdx` — « You must use a
// development build to use push notifications since the capability is not built into Expo Go. »
// Aucune distinction de plateforme : c'est vrai sur iOS comme sur Android.
test('F7 — le push exige un dev build sur les DEUX plateformes, pas seulement Android', () => {
  const quand = STACKS.mobile.domains.push.when;
  assert.doesNotMatch(quand, /Android SDK 53\+/, 'le push n\'est pas un problème Android : Expo Go ne l\'embarque plus du tout');
  assert.match(quand, /iOS/, 'iOS doit être nommé');
  assert.match(quand, /Android/, 'Android aussi');
});

// Preuve : get-convex/convex-auth `docs/pages/index.mdx` — « NOTE: Convex Auth is in beta. »
test('F7 — Convex Auth est proposé comme étant en bêta, partout où il est proposé', () => {
  // Ligne par ligne (avec la suivante, pour une phrase qui court sur deux) : un « bêta » posé
  // une seule fois en haut du fichier ne protège pas la mention qui est 30 lignes plus bas.
  const fautes = [];
  for (const f of FICHIERS_KIT()) {
    const lignes = lire(f).split('\n');
    lignes.forEach((l, i) => {
      if (!/Convex Auth/.test(l)) return;
      if (!/b[eê]ta/i.test(`${l}\n${lignes[i + 1] ?? ''}`)) fautes.push(`${f}:${i + 1} — ${l.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(fautes, [], `Convex Auth proposé sans dire qu'il est en bêta :\n${fautes.join('\n')}`);
});

// ── F10 — les skills de stack pointent vers des fichiers qui existent DANS LE PROJET ────────────
test('F10 — un skill de stack ne renvoie pas vers un chemin absent du projet généré', () => {
  const fautes = [];
  for (const s of Object.keys(STACKS)) {
    const rel = `.claude/skills/stack-${s}/SKILL.md`;
    if (!fs.existsSync(path.join(RACINE, rel))) continue;
    const t = lire(rel);
    // Le scaffold copie `stacks/<stack>/AGENTS.md` en `AGENTS-stack.md` (matrix.mjs) : le chemin
    // du dépôt n'existe pas dans le projet, et le skill, lui, est copié dans le projet.
    t.split('\n').forEach((l, i) => {
      if (!new RegExp(`stacks/${s}/AGENTS\\.md`).test(l)) return;
      // Le chemin du dépôt reste utile — à condition que la MÊME ligne donne celui du projet.
      if (!/AGENTS-stack\.md/.test(l)) fautes.push(`${rel}:${i + 1} → stacks/${s}/AGENTS.md sans dire que le projet, lui, a AGENTS-stack.md`);
    });
  }
  assert.deepEqual(fautes, [], `Skills renvoyant dans le vide :\n${fautes.join('\n')}`);
});

// ── F12 — rot-check ────────────────────────────────────────────────────────────────────────────
test('F12 — rot-check surveille la DÉPRÉCIATION npm, pas seulement les codes HTTP', () => {
  const rot = lire('.github/workflows/rot-check.yml');
  // Sur la MÊME ligne : `npm view` ailleurs dans le fichier et le mot `deprecated` dans un
  // commentaire ne lisent aucun champ. C'est l'appel qui compte.
  const appel = rot.split('\n').filter((l) => /npm view[^\n]*deprecated/.test(l) && !/^\s*#/.test(l));
  assert.ok(appel.length, '`npm view <pkg> deprecated` : le seul signal qui aurait attrapé un paquet déprécié');
  assert.match(rot, /::error::[^\n]*d[ée]pr[ée]ci/i, 'et la CI doit rougir, pas seulement afficher');
  // Et il surveille ce que le kit recommande vraiment, pas une liste figée sans rapport.
  for (const p of ['astro', 'react-email', 'convex', 'expo', 'electron']) {
    assert.match(rot, new RegExp(`(^|[\\s'"])${p}([\\s'"]|$)`, 'm'), `rot-check doit surveiller ${p}`);
  }
});

// F12bis — LA LISTE DES SOURCES EXTERNES EST DÉRIVÉE DU MANIFESTE, PAS RECOPIÉE À LA MAIN.
// `rot-check` est le seul endroit qui apprend au kit qu'une source a bougé. Il était rempli à la
// main : ajouter un MCP ou une règle à une stack laissait sa source HORS surveillance — muette le
// jour où elle disparaît, et le kit continuait de l'annoncer. Ce test lit ce que `matrix.mjs`
// déclare vraiment et exige que chaque URL y figure.
test('F12bis — toute URL externe déclarée par une stack (MCP ou règle) est surveillée par rot-check', () => {
  const rot = lire('.github/workflows/rot-check.yml');
  const urls = new Set();
  for (const s of Object.values(STACKS)) {
    for (const cfg of Object.values(s.mcp)) {
      // `chrome-devtools` pointe le navigateur LOCAL (127.0.0.1:9222) : rien à surveiller dehors.
      for (const u of JSON.stringify(cfg).matchAll(/https:\/\/[^"'\s\\]+/g)) urls.add(u[0]);
    }
    for (const r of s.rules) urls.add(r.url);
  }
  assert.ok(urls.size >= 8, `le relevé doit trouver les sources des 4 stacks (trouvé ${urls.size})`);
  const horsSurveillance = [...urls].filter((u) => !rot.includes(u));
  assert.deepEqual(horsSurveillance, [], `Sources déclarées par matrix.mjs et jamais pingées :\n${horsSurveillance.join('\n')}\n→ ajoute-les à .github/workflows/rot-check.yml`);
});
