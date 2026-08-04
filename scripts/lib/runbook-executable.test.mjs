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

test('E2E — le runbook fait poser le script `typecheck` que le template n\'a pas', () => {
  const t = lire('templates/commands/new-project.md');
  // Mesuré sur le projet réellement produit : scripts = dev, build, preview, astro, lint.
  // Pas de `typecheck` → le hook du kit retombe sur `tsc --noEmit`, qui ne lit pas les `.astro`
  // et sort vert sans rien vérifier (c'est le bug F4, par un autre chemin).
  assert.match(t, /"typecheck":\s*"astro check"/, 'sans ce script, le check de la vitrine ne vérifie rien');
});
