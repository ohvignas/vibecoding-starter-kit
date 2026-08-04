// scripts/lib/runbook-executable.test.mjs
// LE test que 394 autres ne faisaient pas : les commandes que les runbooks dictent sont-elles
// EXÉCUTABLES PAR UNE IA ? Toute la suite vérifie que les fichiers DISENT la bonne chose ; aucune
// ne vérifiait qu'en les suivant, il se passe quelque chose.
//
// Né d'un test de bout en bout réel : la Phase 7 de `/new-project` dictait
//   npx shadcn@latest init --preset <code> --template astro
// qui pose QUATRE questions interactives (monorepo · bibliothèque · preset · nom), dont trois aux
// flèches du clavier. `--yes` n'en saute aucune. Un humain répond ; l'IA à qui le runbook est
// adressé reste bloquée, sans erreur, sans sortie — le pire cas, rien n'indique quoi corriger.
//
// CE QUE CE TEST GARANTIT : une commande de scaffold citée par un runbook porte les drapeaux qui
// la rendent non interactive. C'est statique — il lit les drapeaux, il ne relance pas `npx` (ça
// coûte plusieurs minutes et le réseau). La vérification par exécution, elle, est dans
// `docs/superpowers/audits/` : forme complète jouée le 2026-08-04, `[build] Complete!` + `dist/`.
//
// CE QU'IL NE GARANTIT PAS, et il faut le dire :
//  · que les drapeaux existent encore dans la prochaine version de l'outil tiers — aucun test
//    hors-ligne ne peut le savoir, c'est le rôle de `rot-check` ;
//  · le cas `init` DANS un projet déjà créé (saas, desktop) : je n'ai mesuré que la forme qui
//    CRÉE le projet (`--template`). Les prompts y sont peut-être moins nombreux. Le test ne juge
//    donc que les commandes portant `--template`, et les autres reçoivent les deux drapeaux
//    connus (`--base`, `--no-monorepo`) sans que ce soit prouvé de bout en bout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lire = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Les drapeaux SANS lesquels `shadcn init` s'arrête sur une question. Mesurés un par un le
// 2026-08-04 sur shadcn@latest : chaque ligne est un prompt réellement rencontré.
const DRAPEAUX_SHADCN = [
  ['--no-monorepo', 'la question « Would you like to set up a monorepo? »'],
  ['--base', 'la question « Select a component library » (flèches)'],
  ['--preset', 'la question « Which preset would you like to use? » (flèches)'],
  ['--name', 'la question « What is your project named? »'],
];

test('E2E — une commande `shadcn init` citée par un runbook est non interactive', () => {
  const fichiers = fs.readdirSync(path.join(ROOT, 'templates/commands'))
    .filter((n) => n.endsWith('.md'))
    .map((n) => [`templates/commands/${n}`, lire(`templates/commands/${n}`)]);

  const fautes = [];
  let vues = 0;
  for (const [f, texte] of fichiers) {
    texte.split('\n').forEach((ligne, i) => {
      // Seulement les `init` qui CRÉENT un projet (`--template`) : c'est la seule forme dont
      // j'ai mesuré les quatre prompts. `shadcn add <bloc>` n'est pas interactif, et `init` dans
      // un projet existant n'a pas été joué (voir la limite en tête de fichier).
      if (!/`npx shadcn@latest init[^`]*--template[^`]*`/.test(ligne)) return;
      vues++;
      const cmd = ligne.match(/`(npx shadcn@latest init[^`]*)`/)[1];
      for (const [drapeau, prompt] of DRAPEAUX_SHADCN) {
        if (!cmd.includes(drapeau)) fautes.push(`${f}:${i + 1} — \`${drapeau}\` manque : ${prompt} bloquera l'IA.\n    ${cmd}`);
      }
    });
  }

  // Sans cette garde, supprimer la commande du runbook rendrait le test vert à vide.
  assert.ok(vues > 0, 'aucune commande `shadcn init` trouvée : le test ne prouve rien');
  assert.deepEqual(fautes, [], `commandes de scaffold qui bloqueraient une IA :\n${fautes.join('\n')}`);
});

test('E2E — le runbook dit que shadcn crée un SOUS-DOSSIER, et où lancer les scripts', () => {
  const t = lire('templates/commands/new-project.md');
  // `--name` fait naître l'app à côté de l'environnement du kit (qui, lui, est à la racine) :
  // `docs/RUN.md` promet `npm run dev` sans dire où. Mesuré : le package.json est un cran plus bas.
  assert.match(t, /SOUS-DOSSIER|sous-dossier/, 'le décalage racine / app n\'est pas dit');
  assert.match(t, /package\.json/, 'où vit le package.json n\'est pas dit');
});

// Chaque stack a sa commande de scaffold, dictée à une IA. Trois ont été JOUÉES le 2026-08-04 ;
// ce qu'elles ont produit est ce qui est asserté ici. La 4ᵉ (saas, `npm create convex@latest`)
// demande un compte Convex : non jouée, donc non assertée — dit plutôt que supposé.
// Les 4 commandes de scaffold, JOUÉES le 2026-08-04. Trois sur quatre bloquaient sur un prompt
// interactif — le mode d'exécution pour lequel le kit est fait. Ce que chaque drapeau débloque
// est mesuré, pas supposé.
const SCAFFOLDS = [
  ['create-convex', '-t tanstack-start', 'le sélecteur « Choose a client » (flèches)'],
  ['create-expo-app', '--yes', 'les confirmations d\'Expo'],
  ['create-electron-app', '--template=vite-typescript', 'le choix du template Forge'],
];

test('E2E — les 4 commandes de scaffold sont non interactives', () => {
  const t = lire('templates/commands/new-project.md');
  const fautes = [];
  for (const [outil, drapeau, prompt] of SCAFFOLDS) {
    const ligne = t.split('\n').find((l) => l.includes(outil));
    if (!ligne) { fautes.push(`${outil} : la commande a disparu du runbook`); continue; }
    if (!ligne.includes(drapeau)) fautes.push(`${outil} : \`${drapeau}\` manque — ${prompt} bloquera l'IA.`);
  }
  // Sans ça, renommer les outils rendrait le test vert à vide.
  assert.equal(SCAFFOLDS.length, 3, 'garde de montage : 3 outils tiers + shadcn (testé au-dessus)');
  assert.deepEqual(fautes, [], `scaffolds qui bloqueraient une IA :\n${fautes.join('\n')}`);
});

test('E2E — mobile : NativeWind est nommé ET son install est donnée', () => {
  const t = lire('templates/commands/new-project.md');
  // Le kit disait « create-expo-app + NativeWind » sans jamais dire comment l'installer :
  // la techno était nommée, le geste absent. `expo install` (pas `npm i`) choisit les versions
  // compatibles du SDK — c'est ce qui distingue une install qui marche d'une qui casse.
  //
  // On juge la COMMANDE, entre backticks — pas la ligne. La 1re version cherchait
  // `expo install … nativewind` n'importe où sur la ligne : elle restait verte quand la commande
  // devenait `npm i nativewind`, parce que la phrase d'explication à côté disait encore
  // « `expo install` choisit les versions ». Un garde qui se satisfait de sa propre prose ne
  // garde rien.
  const commandes = [...t.matchAll(/`([^`\n]*nativewind[^`\n]*)`/g)].map((m) => m[1]);
  assert.ok(commandes.length > 0, 'NativeWind n\'est prescrit par aucune commande');
  assert.ok(commandes.some((c) => /expo install/.test(c)),
    `NativeWind doit s'installer avec \`expo install\` (versions du SDK), pas \`npm i\` :\n  ${commandes.join('\n  ')}`);
});

test('E2E — saas : le template Convex n\'apporte pas d\'auth, le runbook le dit', () => {
  const t = lire('templates/commands/new-project.md');
  // Mesuré : `convex/` sort avec schema.ts + myFunctions.ts, rien d'autre. Il n'existe pas non
  // plus de `template-tanstack-start-convexauth` dans get-convex/templates (contrairement à
  // react-vite et nextjs). Promettre l'auth « incluse » serait faux.
  const ligne = t.split('\n').find((l) => l.includes('create-convex'));
  assert.ok(ligne, 'la commande saas a disparu');
  assert.match(ligne, /aucune auth|sans auth|n'inclut aucune auth/i, 'le template n\'apporte pas d\'auth : le dire');
});

test('E2E — desktop : Forge n\'a pas de template React, le runbook doit le dire', () => {
  const t = lire('templates/commands/new-project.md');
  // Mesuré : `create-electron-app --template=vite-typescript` produit un package.json SANS react
  // ni react-dom. Les 5 templates de Forge (electron/forge/packages/template) sont `base`, `vite`,
  // `vite-typescript`, `webpack`, `webpack-typescript` — aucun n'amène React. Or le runbook
  // enchaînait sur `shadcn init`, qui en dépend : la chaîne desktop était rompue.
  assert.doesNotMatch(t, /vite\s*\+\s*react/i, 'Forge ne fournit aucun template React');
  const ligne = t.split('\n').find((l) => l.includes('create-electron-app'));
  assert.ok(ligne, 'le runbook ne dit plus comment scaffolder le desktop');
  assert.match(ligne, /--template=vite-typescript/, 'le template doit être nommé, il n\'y a pas de défaut React');
  assert.match(ligne, /npm i react react-dom|react react-dom/, 'React doit être ajouté avant shadcn, qui en dépend');
});

test('E2E — le thème s\'applique à un projet existant avec `apply`, pas avec `init`', () => {
  const t = lire('templates/commands/new-project.md');
  // `shadcn apply [preset]` = « apply a preset to an existing project » (vérifié : shadcn --help).
  // `init --preset` ne vaut qu'à la CRÉATION : sur saas et desktop, où le projet existe déjà,
  // c'était la mauvaise commande.
  assert.match(t, /shadcn@latest apply --preset/, 'sur un projet déjà créé, le thème s\'applique avec `apply`');
});

test('E2E — les blocs OFFICIELS sont proposés avant le registry tiers', () => {
  const t = lire('templates/commands/new-project.md');
  // Vérifiés dans le registry officiel (`shadcn view`) : aucun registry à déclarer, aucune clé.
  // Le kit ne poussait que `@shadcnblocks/*`, tiers, qui exige une entrée dans components.json.
  for (const bloc of ['dashboard-01', 'login-0', 'signup-0', 'sidebar-0']) {
    assert.ok(t.includes(bloc), `bloc officiel jamais proposé : ${bloc}`);
  }
  const iOff = t.indexOf('dashboard-01'), iTiers = t.indexOf('@shadcnblocks');
  assert.ok(iOff !== -1 && iTiers !== -1 && iOff < iTiers,
    'les blocs sans clé doivent venir AVANT le registry tiers qui en demande une');
});

test('E2E — le tech spec vit à côté du PRD, pas dans la convention interne du kit', () => {
  const t = lire('templates/commands/new-project.md');
  // Il partait dans `docs/superpowers/specs/<date>-<projet>-architecture.md` : dossier ABSENT du
  // projet généré, nom daté, et `AGENTS.md` ne le listait même pas. Un débutant ne le retrouvait pas.
  assert.doesNotMatch(t, /docs\/superpowers\/specs/, 'le tech spec ne va pas dans la convention interne du kit');
  assert.match(t, /docs\/ARCHITECTURE\.md/, 'le tech spec doit vivre à côté de docs/PRD.md');
  assert.match(lire('scripts/lib/templates.mjs'), /docs\/ARCHITECTURE\.md/, 'AGENTS.md doit y renvoyer');
});

test('E2E — le runbook fait poser le script `typecheck` que le template n\'a pas', () => {
  const t = lire('templates/commands/new-project.md');
  // Mesuré sur le projet réellement produit : scripts = dev, build, preview, astro, lint.
  // Pas de `typecheck` → le hook du kit retombe sur `tsc --noEmit`, qui ne lit pas les `.astro`
  // et sort vert sans rien vérifier (c'est le bug F4, par un autre chemin).
  assert.match(t, /"typecheck":\s*"astro check"/, 'sans ce script, le check de la vitrine ne vérifie rien');
});
