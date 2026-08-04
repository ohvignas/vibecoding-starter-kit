# Ce qui reste à faire — état au 2026-08-04

**Point de départ** : 44 commits depuis `2fd3d80`, **404 tests / 0 fail**, 12 combinaisons vertes.
Version locale **0.13.0**, publiée sur npm **0.6.0**. Rien n'est poussé, rien n'est publié.

Tout ce qui suit est **vérifié sur le dépôt**, pas supposé. Les items sont classés par ce qu'ils
coûtent à l'utilisateur, pas par difficulté.

---

## ✅ 1. Les 4 stacks buildent — LEVÉ le 2026-08-04

Chaque stack menée du scaffold jusqu'au **build réel**, artefact vérifié :

| Stack | Artefact |
|---|---|
| vitrine | `dist/index.html` |
| saas | `dist/client` + `dist/server` — « ✓ built in 105ms » |
| desktop | `out/make/zip/darwin/arm64/mon-app-darwin-arm64-1.0.0.zip` (129 Mo), React bundlé |
| mobile | `dist/` — 4 routes exportées |

**Desktop a demandé trois tentatives**, chaque obstacle invisible à la lecture : `plugin-react@6`
exige `vite@^8` quand Forge livre vite@5 (ERESOLVE) · `@5` est ESM-only quand Forge charge la config
en `require` · seule `@4` est dual-format. L'épingle et ses deux raisons sont dans le runbook, tenues
par un garde.

Confirmation mesurée côté mobile : `expo install` pose **tailwindcss ^3.4.19**, pas la 4.3.3 que
`npm i` aurait prise — la consigne est justifiée par l'exécution, pas par principe.

**Plus aucun bloquant identifié avant publication.**

## 🟠 2. Défauts vérifiés, non corrigés

Chacun a été **constaté**, aucun n'est bloquant seul.

- **`.claude/skills/stack-saas/SKILL.md:40`** renvoie à `scripts/download-ai-context.sh`, **absent du
  projet généré** (c'est un script du dépôt du kit). Trancher : copier le script, ou retirer le
  renvoi. Même famille que F10, déjà corrigé pour les autres skills.
- **`templates/cursor/rules/10-css-maquette.mdc:7`** tolère la découpe du CSS « sans vérifier
  l'équilibre des accolades » — donc autorisée si on vérifie. La règle source
  (`templates/agents/css-maquette-rule.md`) l'interdit **absolument**. Contradiction active sur
  Cursor uniquement. Réassignée au Lot F par la revue du Lot B, jamais prise.
- **`guides/02-installer-les-outils.md`** dit « installe la **LTS** » sans chiffre. Vrai aujourd'hui,
  mais la vitrine exige **Node ≥ 22.12** et `guides/` part dans le paquet npm.
- **`selectDomains()` ne joue dans aucun parcours réel** : la détection 🎯 exige un `docs/PRD.md`
  **préexistant**, absent au premier scaffold, et `docs/DOMAINS.md` n'est pas régénéré au
  `--refresh` (pas même en `.new`). La table pilote la prose, pas le code.
- **`docs/RUN.md`, politique `.new`** : ni pur kit ni pur utilisateur. Un rafraîchissement en place
  écraserait ses notes ; le `.new` actuel est sûr mais peut dérouter. Décision produit.
- **Projets antérieurs en `--backend local`** : leur `.vibecoding.json` n'a pas de `backend` → au 1er
  `--refresh`, un `docs/RUN.md.new` apparaît **sans** la note « Backend en local ». Non destructif,
  trompeur. Migration possible : détecter la note et rétro-remplir le manifeste.

---

## 🟡 3. Dettes de garde — le kit est juste, rien ne garantit qu'il le reste

Les revues ont mesuré ça par **mutation** : on casse le correctif, on regarde si un test rougit.

- **Lot G : 8 mutations sur 8 passent.** Ses gardes vérifient le fond mais **aucun ne survit à une
  reformulation**. Le plus grave : la revendication « 12 combinaisons » porte sur 12 rendus **en
  mémoire** et **un seul scaffold réel** — un mauvais câblage `assistant → COLLE-MOI` passerait
  toute la suite.
- **Lot F : 7 mutations sur 17 passent.** Dont un garde lexical français sans jumeau anglais, dans
  le fichier même où la revue disait le trou refermé.
- **`setup.mjs:144`** : muter `if (s.ok) done.push(cl.repo)` en `if (true)` laisse la suite verte.
  Seule `summarizeClone` (fonction pure) est testée. Fermer ce trou demande une intégration réseau.
- **Windows n'a jamais tourné.** `resolveCheckCommand` dit `npx.cmd` + `shell:true`, et
  `.gitattributes` pose `eol=lf` — les deux sont testés en simulation, **aucun sur une vraie
  machine Windows**. La limite est écrite dans `scripts/lib/windows.test.mjs`.

---

## 🟢 4. Cosmétique

- **`scripts/lib/setup-ai.mjs`** s'appelle ainsi alors qu'il rend `docs/A-FAIRE.md` ; deux titres de
  test disent encore « SETUP-AI ». Trompeur, pas faux.
- **`.claude/worktrees/dreamy-mayer-a203d4/`** : worktree périmé avec une copie ancienne du kit
  (`/debug`, « 5 commandes »). Gitignoré, hors paquet npm — mais il piège tout `grep` sans exclusion.

---

## Publication

**La décision t'appartient.** Ce qui est sur npm (0.6.0) est **44 commits en arrière** et cassé pour
Claude Code. Rien dans ce chantier n'a été poussé ni publié.

```bash
npm publish
```

**Avant de publier, l'item 1 est le seul que je considère comme bloquant** : trois stacks dont le
chemin de construction n'a jamais produit d'application. Le reste est connu, écrit, et n'empêche pas
un débutant d'aboutir.

---

## Ce que ce chantier a établi, et qui vaut pour la suite

- **Un test qui lit ne remplace pas un test qui exécute.** 394 tests vérifiaient que les fichiers
  *disent* la bonne chose ; trois stacks sur quatre étaient cassées à la première commande réelle.
- **Un faux positif est pire qu'un trou** : un garde qui rougit sur de la documentation juste
  apprend à dégrader la documentation pour le faire taire.
- **Un garde doit mordre au site exact du bug**, et **un banc qui ne vérifie pas ses propres
  mutations ment** — deux fois un « vert » a été obtenu sur un fichier jamais modifié.
- **`\b` est ASCII** : `/\bécris\b/` ne matche jamais « écris ». Huit motifs étaient morts.
- **Le plan n'est pas une source de vérité supérieure au dépôt.** Les agents ont corrigé une dizaine
  d'erreurs de brief — numéros de ligne, statistiques, faits externes, et une citation d'erreur git
  mesurée sur la mauvaise commande.
