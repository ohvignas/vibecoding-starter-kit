// scripts/lib/init-command.test.mjs
// `/init-vibecoding` n'est plus UN fichier : c'est une entrée courte + un dossier d'étapes
// (`templates/commands/init-vibecoding/`). Mêmes propriétés que pour les autres runbooks
// découpés : rien n'est tombé, l'entrée est une checklist, et chaque exigence de contenu est
// ancrée à l'étape qui la porte (jamais cherchée dans un texte recollé — ce serait l'affaiblir).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInitCommand } from './validate-commands.mjs';
import { erreursChecklist, erreursNonPerte } from './runbook-decoupe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── L'INVENTAIRE D'AVANT LE DÉCOUPAGE ─────────────────────────────────────────────────────────
// Les 41 lignes de contenu (hors lignes vides) que `templates/commands/init-vibecoding.md`
// portait quand il pesait 54 lignes d'un bloc. Extraites AVANT le commit qui l'a découpé : la
// référence n'existe plus nulle part ailleurs. On exige la LIGNE ENTIÈRE, à la trime près (cf. le
// commentaire de tête de `runbook-decoupe.mjs` : une liste de marqueurs ne prouve rien).
// AUCUNE ligne n'a été réécrite par ce découpage : le fichier déclarait déjà lui-même ses cinq
// « Étape 0 » à « Étape 4 », et les fichiers `00-` à `04-` reprennent exactement ces frontières —
// aucun renvoi interne à renuméroter, donc aucun texte à toucher.
const LIGNES_AVANT_DECOUPAGE = [
  "# /init-vibecoding — Tout installer (ou mettre à jour) pour toi (runbook IA)",
  "Tu installes l'environnement vibecoding **à la place de l'utilisateur** : tu exécutes les commandes du terminal, tu poses les questions en **langage simple**, tu expliques. L'utilisateur répond juste dans le chat. En français, chaleureux, zéro jargon non expliqué.",
  "## Étape 0 — Détecte l'état",
  "Regarde si **`.vibecoding.json`** existe dans le dossier courant.",
  "- **Il existe** → le projet est **déjà initialisé**. Lis sa `kitVersion`. Dis-le, et propose de **mettre à jour** :",
  "1. Montre d'abord ce qui changerait : `npx -y create-vibecoding-kit@latest --project . --refresh --dry-run`.",
  "2. Si l'utilisateur est d'accord : `npx -y create-vibecoding-kit@latest --project . --refresh`.",
  "3. Si le message parle d'« ancienne version / bloc en double », **ouvre `AGENTS.md`** et supprime l'ancien bloc de règles sous `vibecoding:end` (garde ses notes perso). Explique-lui ce que tu fais.",
  "→ **Stop ici** (pas de re-scaffold). Termine par « ton projet est à jour ✅ ».",
  "- **Il n'existe pas** → nouveau projet, continue.",
  "## Étape 1 — Les 2 questions (simples)",
  "1. **Quel type d'app ?** (donne des exemples) :",
  "- **saas** — site/app web avec comptes (SaaS, dashboard, réservation…)",
  "- **mobile** — app iPhone/Android",
  "- **desktop** — logiciel installable (Windows/Mac/Linux)",
  "- **vitrine** — site vitrine / portfolio / blog (optimisé Google + IA)",
  "2. **Le nom du projet ?** (ou « ici » pour installer dans le dossier courant).",
  "L'**assistant** = celui où tu tournes — ne le demande pas, déduis-le.",
  "## Étape 2 — Scaffold (tu le fais)",
  "Lance (remplace `<stack>`, `<assistant>`, `<dossier>` ; `.` = dossier courant). Les valeurs sont",
  "**littérales** : le CLI refuse tout le reste et sort en erreur — pas de « Claude Code », pas de `claude`.",
  "```bash",
  "# <stack> = saas | mobile | desktop | vitrine",
  "# <assistant> = cursor | claude-code | codex",
  "npx -y create-vibecoding-kit@latest --stack <stack> --assistant <assistant> --project <dossier> --yes",
  "```",
  "Montre le résultat, confirme que les fichiers sont créés (AGENTS.md, docs/, .mcp.json…).",
  "## Étape 3 — Onboarding (déroule `docs/A-FAIRE.md` AVEC lui)",
  "Ouvre **`docs/A-FAIRE.md`** (généré, adapté à sa stack) et traite chaque section :",
  "- **Ce que tu peux faire toi** : skills (`npx skills add …` s'ils manquent), MCP en ligne de commande pour Claude Code (`claude mcp add …`). Fais-les, montre le résultat.",
  "- **Ce qui demande son clic** (explique simplement, une action à la fois) : installer le plugin **superpowers**, installer le plugin de sa stack s'il y en a un, autoriser les **MCP** (toggle Cursor / `/mcp`). Attends qu'il confirme avant de passer au suivant.",
  "- Coche mentalement chaque case ; ne le noie pas — **une étape à la fois**.",
  "## Étape 4 — Vérifie + lance",
  "- Si superpowers est installé : lance **`/doctor`** (dit ce qui manque encore).",
  "- Termine : « Tout est prêt 🎉 — tape **`/new-project`** et décris ton idée, je m'occupe du reste. »",
  "> **Sur Codex**, ces runbooks ne sont pas des slash-commands : ils vivent dans `docs/commands/`.",
  "> Ne lui dis jamais « tape `/doctor` » — ouvre `docs/commands/doctor.md` et suis-le toi-même.",
  "## Règles",
  "- Ne submerge pas : **une question / une action à la fois**, attends la réponse.",
  "- Chaque commande terminal : dis **ce que tu vas faire** avant, montre le résultat après.",
  "- Jamais de secret en clair ; ne commit rien sans le dire.",
];

test('non-perte — aucune consigne du runbook d\'un bloc n\'est tombée au découpage', () => {
  assert.equal(LIGNES_AVANT_DECOUPAGE.length, 41, 'l\'inventaire d\'avant le découpage a changé de taille : dis quelle ligne, et pourquoi');
  const perdues = erreursNonPerte(ROOT, 'init-vibecoding', LIGNES_AVANT_DECOUPAGE, 6);
  assert.deepEqual(perdues, [], [
    `${perdues.length} consigne(s) du runbook d'avant le découpage ne sont dans AUCUN fichier de /init-vibecoding :`,
    ...perdues,
    '',
    'Découper déplace du texte, ça n\'en retire pas. Remets la ligne dans l\'étape qui la porte —',
    'ou, si elle a été volontairement réécrite, mets à jour LIGNES_AVANT_DECOUPAGE dans le même',
    'commit, en disant laquelle et pourquoi.',
  ].join('\n'));
});

test('l\'entrée de /init-vibecoding est une CHECKLIST : chaque étape citée, une fois, dans l\'ordre', () => {
  assert.deepEqual(erreursChecklist(ROOT, 'init-vibecoding', 40), []);
});

test('init-vibecoding : détecte, scaffolde OU met à jour, onboarde', () => {
  assert.deepEqual(validateInitCommand(ROOT), []);
});
