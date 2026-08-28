// scripts/lib/new-project-runbook.test.mjs
// `/new-project` n'est plus UN fichier : c'est une entrée courte + un dossier d'étapes
// (`templates/commands/new-project/`). Ce fichier garde les trois propriétés qui font qu'un
// runbook découpé vaut encore le runbook d'un seul bloc :
//   1. rien n'est tombé au découpage (l'inventaire ci-dessous, seule trace du fichier d'avant) ;
//   2. l'entrée est une CHECKLIST : chaque étape du disque y est citée, une fois, dans l'ordre ;
//   3. le validateur reste vert, sujet par sujet, dans le fichier d'étape qui porte le sujet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewProjectCommand } from './validate-commands.mjs';
import { COMMANDS, cheminRunbook, etapesDuRunbook, fichiersDuRunbook } from './commands-list.mjs';
import { erreursRenvois } from './runbook-decoupe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// L'entrée ET ses étapes, dans l'ordre — dérivées de la source unique (`commands-list.mjs`), donc
// aucun nom d'étape n'est recopié ici : ajouter une étape la met sous contrôle sans toucher ce test.
const FICHIERS = () => fichiersDuRunbook(ROOT, 'new-project');

// ── L'INVENTAIRE D'AVANT LE DÉCOUPAGE ─────────────────────────────────────────────────────────
// Les 111 lignes de contenu (hors lignes vides et `---`) que `templates/commands/new-project.md`
// portait quand il pesait 170 lignes d'un bloc. Extraites AVANT le commit qui l'a découpé : la
// référence n'existe plus nulle part ailleurs, ni sur le disque ni dans un test.
//
// DIX-NEUF DE CES LIGNES ONT ÉTÉ RÉÉCRITES DEPUIS, et le dire fait partie du contrat que le
// message d'échec ci-dessous impose (« dis laquelle et pourquoi ») — il avait été tenu pour
// `/new-feature` (3 lignes) et `/init-vibecoding` (0), jamais ici. Les 92 autres sont mot pour mot
// celles de `3ca5ecf^`. Les 19, toutes du même lot P4 (« une étape se nomme par son fichier ») :
//   · 7 TITRES qui perdent leur préfixe (`## Phase 2 — PRD complète…` → `## PRD complète…`) ;
//   · 2 lignes de cadre où le MOT change (« va phase par phase » → « va étape par étape ») ;
//   · 9 RENVOIS croisés où le numéro devient un fichier (« noté en Phase 5 » → « noté à l'étape
//     `05-design-maquette.md` ») — un numéro de phase ne désignait aucun fichier ouvrable, et le
//     découpage l'avait rendu faux (les Phases 3 et 4 tenaient dans le même `03-…`) ;
//   · 1 seule ligne au contenu changé, celle du PRD : elle gagne les trois ajouts de P4
//     (« problème », « entreprise et objectifs commerciaux `OC-*` ») et la consigne « Laisse la
//     section « Arborescence » vide », qui donne sa raison d'être à l'étape `04-…`.
// Aucune consigne n'a été retirée : vérifié ligne à ligne contre `3ca5ecf^`, les 19 s'apparient
// une à une avec les 19 lignes d'origine, et rien ne reste orphelin d'un côté ou de l'autre.
//
// POURQUOI CETTE FORME. Une liste de « marqueurs » (chemins, commandes, mots-clés) ne prouve
// rien : une consigne entière sans backtick ni chemin — « Ne saute aucune section : ce que le PRD
// ne dit pas, la roadmap ne le construira pas. » — peut disparaître sans qu'aucun marqueur ne
// manque. C'est exactement le défaut qui a fait échouer les revues des lots B et C. On exige donc
// la LIGNE, à la trime près, dans l'union « entrée + étapes » : découper déplace du texte, ça n'en
// retire pas. Une ligne réécrite par un lot ultérieur fait rougir ce test — c'est voulu : elle
// oblige à rouvrir cet inventaire et à dire, ligne à ligne, ce qui a changé et pourquoi.
const LIGNES_AVANT_DECOUPAGE = [
  "# /new-project — Fondation d'un nouveau projet (runbook IA)",
  "Tu construis la **FONDATION complète** d'un nouveau produit à partir de l'idée donnée en argument.",
  "Va **étape par étape**, en français. **Chaque artefact attend la validation de l'utilisateur avant le suivant** (gate). Pour aller en profondeur, **lance des sous-agents en parallèle** (recherche, rédaction) puis synthétise — cadre : **« Règle sous-agents »** dans `AGENTS.md` (quand déléguer, comment).",
  "Argument : `$ARGUMENTS` = description libre de l'idée.",
  "> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.",
  "> **Attribution** : la structure des templates PRD & architecture (`docs/templates/PRD.md`, `docs/templates/architecture.md`) est **adaptée de BMAD-METHOD** (MIT © 2025 BMad Code, LLC) — l'attribution est répétée en tête de chacun. Le format `DESIGN.md` suit le spec **google-labs-code/design.md** (Apache-2.0, Google Labs). Adaptée/traduite ; « BMAD » est une marque de BMad Code, LLC (non affiliée).",
  "## Ce qu'on va faire ensemble — explique le parcours (à dire à l'utilisateur, EN PREMIER)",
  "Avant toute question, dis-lui en **langage simple** ce qu'on va faire et ce qu'il obtiendra :",
  "> « On va, ensemble : **1)** bien comprendre ton idée (quelques questions simples) · **2)** écrire le **plan** de ton app · **3)** **dessiner les écrans** (maquette) · **4)** en tirer une **feuille de route**. Ensuite `/build` construit, écran par écran. À la fin de cette étape tu auras un **plan clair + un design + une roadmap** — pas encore de code, et c'est normal. »",
  "Puis propose le mode de travail. Garde ce cap : à chaque étape, redis en une phrase **ce que tu fais et ce que ça lui apporte**.",
  "## Mode de travail (demande au début)",
  "Propose 2 modes et laisse l'utilisateur choisir :",
  "- **Rapide** : tu proposes des brouillons d'un coup avec tes suppositions taguées `[HYPOTHÈSE: …]` ; l'utilisateur corrige. **Moins de questions** — bien si l'idée est déjà claire.",
  "- **Pas à pas** (par défaut) : tu avances **section par section** avec des questions. Plus guidé, mais **plus de questions** — dis-le pour qu'il choisisse en connaissance de cause.",
  "Discipline transverse : tag `[HYPOTHÈSE: …]`, `[NON-OBJECTIF v1]`, `[À CLARIFIER]` inline dans les brouillons ; balaie-les à la fin dans les sections dédiées.",
  "## Brainstorm : comprendre l'idée (gate)",
  "Invoque `superpowers:brainstorming`, **adapté débutant** :",
  "- **Peu de questions** (vise **4-6 essentielles**), **une à la fois**, en **langage simple**, **zéro jargon** dans la question.",
  "- **Un exemple concret à chaque question** (« ex. : … ») pour qu'il voie ce que tu attends.",
  "- **Le pourquoi** en une demi-ligne (« ça m'aide à … »).",
  "- **Reformule** sa réponse après coup (« donc ton app fait X, pour Y »).",
  "- Si tu peux **deviner**, propose une **hypothèse** (`[HYPOTHÈSE: …]`) au lieu de demander.",
  "- L'essentiel à couvrir : **c'est quoi** l'app · **pour qui** · le **truc principal** qu'elle fait · **2-3 fonctions** must-have · ce que ce **n'est pas** (v1).",
  "Le vocabulaire technique (personas, JTBD, exigences…) va dans le **document** `docs/PRD.md`, **jamais** dans les questions posées. → fais valider avant de continuer.",
  "## PRD complète → `docs/PRD.md` (gate)",
  "**Ouvre `docs/templates/PRD.md`** et suis-le section par section (problème, vision, utilisateur cible et parcours `UJ-*`, entreprise et objectifs commerciaux `OC-*`, glossaire, fonctionnalités en `FR-*`, non-objectifs, périmètre MVP, métriques, questions ouvertes, index des hypothèses) — il porte aussi les clusters par type de produit et la checklist qualité. **Laisse la section « Arborescence » vide** : c'est l'étape `04-arborescence.md` qui la remplira, une fois l'architecture posée. Écris le résultat dans **`docs/PRD.md`** ; le template reste intact.",
  "Ne saute aucune section : ce que le PRD ne dit pas, la roadmap ne le construira pas. → **validation utilisateur**.",
  "## Stack (déjà fixée)",
  "La stack a été **choisie par le wizard** : lis-la dans `AGENTS.md` (et les règles de `.cursor/rules/` ou `.claude/skills/`) — **ne redemande pas**. Le contexte officiel de la stack est dans `ai-context/`. Confirme-la à l'utilisateur en une phrase, puis continue.",
  "## Tech spec / architecture → `docs/ARCHITECTURE.md` (gate)",
  "**Ouvre `docs/templates/architecture.md`** et suis-le : on ne fixe QUE les décisions durables qu'un futur builder ne peut **pas** déduire du code (paradigme, `AD-*` + diagramme de dépendances, conventions de cohérence, stack, graine structurelle, map capacité → architecture, différé). Le template porte aussi sa checklist.",
  "Écris le résultat dans `docs/ARCHITECTURE.md`. → **validation utilisateur**.",
  "## Maquette + Design → `maquette/` + `docs/design.md` (gate)",
  "La **maquette est le pivot** : on fixe le design **avant** de coder, on **itère** jusqu'à validation, puis la roadmap en découle (étape `06-roadmap.md`). Ne code rien ici.",
  "**Demande d'abord à l'utilisateur son cas** (pour les écrans) — aucune réponse ne bloque :",
  "- **(a)** « J'ai déjà une maquette sur **Stitch** »",
  "- **(b)** « J'ai une maquette **ailleurs** » (Figma, images, HTML)",
  "- **(c)** « Je **n'ai pas** de maquette »",
  "L'ordre du travail dépend du cas : si une maquette existe déjà (a/b), on en **dérive** le design ; s'il n'y en a pas (c), on fixe le **design d'abord**, puis on dessine.",
  "### Cas (a) / (b) — une maquette existe → on en dérive le design",
  "1. Récupère la maquette dans `maquette/` :",
  "- **(a) Stitch** : connecte le MCP (voir `docs/A-FAIRE.md`), `list_projects` → `list_screens` → pour chaque écran validé `get_screen` (`htmlCode`) → écris-le dans `maquette/<ecran>.html`.",
  "- **(b) Ailleurs** : demande à l'utilisateur de **déposer ses exports/captures dans `maquette/`** (un fichier par écran) ; ça te sert de référence visuelle.",
  "2. **Dérive `docs/design.md`** de la maquette validée (les deux volets « Le design system » ci-dessous).",
  "3. Génère la galerie **`maquette/index.html`** : une page qui liste chaque écran dans une `<iframe>` (titre + aperçu), pour tout valider d'un coup d'œil.",
  "> Beaucoup d'écrans ? **délègue un sous-agent par écran** pour les importer/normaliser sur `docs/design.md` (mêmes skills : `AGENTS.md → « Règle design »`).",
  "### Cas (c) — pas de maquette → **design d'abord, maquette ensuite** (étape par étape)",
  "**Étape 1 — `docs/design.md` D'ABORD (préférences shadcn → questions → skills).**",
  "Charge les **4 skills design** (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) + le skill **`design-md`**.",
  "- **Stack web (saas / desktop / vitrine) — commence par récupérer les préférences visuelles :** demande à l'utilisateur d'**ouvrir le compositeur de thème shadcn** en partant de ce preset de départ → **[ui.shadcn.com/create?preset=b27GcrRo](https://ui.shadcn.com/create?preset=b27GcrRo)**, de régler **en visuel** couleurs / rayons / typo, puis de te **renvoyer son code de preset** (l'URL `?preset=<code>`). Ces préférences = **base de `docs/design.md`** (palette/typo/rayons) ; **note le preset pour l'étape `07-scaffold.md`** (le scaffold l'appliquera). Pour affiner encore : **[tweakcn.com](https://tweakcn.com)** (export variables CSS).",
  "- **Mobile** : jamais shadcn (c'est du DOM web) → NativeWind + patterns RN.",
  "Puis **affine par un vrai aller-retour, une question à la fois** (mode pas à pas) — ce que le preset ne dit pas : ambiance/personnalité de la marque, références qui plaisent, public visé, densité, clair/sombre. Appuie-toi sur les parcours **UJ-*** du PRD. Écris le tout dans **`docs/design.md`** (volets A/B ci-dessous). **→ fais VALIDER `docs/design.md` avant de dessiner.**",
  "**Étape 2 — la maquette ENSUITE : un sous-agent par page (en parallèle), en shadcn/ui.**",
  "`docs/design.md` validé → dessine, **une page = un sous-agent** :",
  "1. Liste les **écrans porteurs** (des parcours **UJ-*** du PRD) : entrée canonique, écran héros du flux le plus complexe, un overlay, la vue liste/dashboard.",
  "2. **Délègue chaque écran à un sous-agent, en parallèle.** Chaque sous-agent, **à chaque fois** :",
  "- **charge les skills design** → voir **`AGENTS.md` → section « Règle design »** (la liste de référence : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) ;",
  "- lit **`docs/design.md`** (preset + tokens) — **même source pour tous = maquette cohérente** ;",
  "- produit **sa page** calquée shadcn/ui (composants type shadcn, tokens du preset, Tailwind CDN) → écrit `maquette/parts/<ecran>.html` ;",
  "- pour aller vite : **repère** les blocs shadcnblocks qui collent (`hero`, `pricing`, `features`…) et recopie leur structure en HTML/Tailwind CDN. On ne les **installe pas** ici : le registry n'est câblé qu'à l'étape `07-scaffold.md`, sur un projet scaffoldé — la maquette, elle, n'est qu'un dossier de pages ;",
  "- **auto-vérifie avant de rendre sa part** : ouvre-la dans le navigateur + screenshot, corrige si c'est cassé ;",
  "- puis compare à l'écran maquette de référence, à l'œil ou avec **PixelRAG** s'il est installé : cette comparaison d'images **alerte, elle ne tranche pas** (voir « Règle de vérification »).",
  "3. **Assemble** les parts en **UN SEUL fichier `maquette/index.html`** — chaque écran = une **section pleine largeur, titrée, empilée**. Fais une **passe de cohérence** (mêmes boutons/espacements/typo partout), puis un seul fichier à ouvrir pour tout voir.",
  "- **Stitch connecté** : à la place, un `generate_screen_from_text` par écran (skill `stitch::generate-design`) en passant le design → importe dans `maquette/`.",
  "- **Mobile** : sous-agents calqués **NativeWind / patterns RN** (pas shadcn).",
  "> Rappel : la maquette **EST** le design final (le scaffold de l'étape `07-scaffold.md` la transforme en **vrais composants shadcn**, même preset), pas un wireframe gris.",
  "**Itère jusqu'à validation** : montre, applique les retours, recommence. Vrai aller-retour, pas un one-shot.",
  "### Le design system → `docs/design.md` (deux volets)",
  "Avec les 4 skills design, fixe (cas c) ou extrais de la maquette (cas a/b) DEUX volets :",
  "**A. DESIGN.md — l'identité visuelle** *(format google-labs design.md)*",
  "- *Frontmatter tokens* (machine) : `colors` (nom→hex), `typography` (fontFamily/size/weight/lineHeight), `rounded`, `spacing`, `components` (composant→tokens).",
  "- *Marque & style* · *Couleurs* (rôle) · *Typographie* (rôles, échelle) · *Layout & espacements* (grille, breakpoints) · *Élévation* (ombres) · *Formes* (rayons) · *Composants* (specs par composant) · *À faire / à éviter*.",
  "- shadcn/Tailwind : réfère les tokens par nom plutôt que de tout redéfinir. Affine sur **[tweakcn.com](https://tweakcn.com)** → colle dans `globals.css` + les *tokens* de `docs/design.md`. Le scaffold appliquera ce preset à l'étape **`07-scaffold.md`** (la commande exacte y est écrite — ne la recopie pas ici, elle a cinq drapeaux obligatoires).",
  "**B. EXPERIENCE.md — le comportement**",
  "- *Fondation* (form-factor, système d'UI) · *Architecture de l'information* · *Voix & ton* (microcopy) · *Patterns de composants* + *d'état* (chargement/vide/erreur/succès) · *Primitives d'interaction* · *Plancher d'accessibilité* · *Flux clés* (parcours avec protagoniste nommé + climax).",
  "→ **validation utilisateur** (la maquette **et** le `design.md`) avant l'étape `06-roadmap.md`.",
  "## Analyse de la maquette + domaines → Roadmap `docs/ROADMAP.md`",
  "1. **Sélection des domaines + doc d'install SUR MESURE** : ouvre `docs/DOMAINS.md` (le catalogue de la stack). Chaque capacité y liste ses **`_Déclencheurs :_`** — les mots qui, présents dans le PRD, l'allument. **Applique-les au texte de `docs/PRD.md`, un par un**, et note les capacités allumées : c'est ta sélection de départ, elle ne se devine pas. (Si `docs/DOMAINS.md` porte déjà des 🎯, c'est le kit qui les a appliqués — vérifie-les, ne les recopie pas les yeux fermés.) Ajoute ensuite ce que les mots ne peuvent pas voir, retire ce que le PRD ne demande pas, et **dis à l'utilisateur ce que tu as ajouté ou retiré, et pourquoi**. Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.",
  "**Stack vitrine** : les domaines `seo`, `geo` et `images` sont **toujours sélectionnés** (raison d'être de la stack), quel que soit le PRD — les déclencheurs ne servent que pour `forms`, `analytics`, `i18n`…",
  "Puis **complète le fichier unique `docs/A-FAIRE.md`** (déjà créé par le wizard avec les gestes de base) en y ajoutant, à la fin, une section **`## Pour ton projet`** : **une entrée par domaine détecté**, en français simple, pour que l'utilisateur n'ait **rien à deviner**. Pour chacune : une ligne « à quoi ça sert », le **paquet** à installer (option officielle par défaut, tirée de `DOMAINS.md`), la **commande MCP** s'il y en a une (ex. paiement → `claude mcp add --transport http stripe https://mcp.stripe.com`), et le **secret** à mettre dans `.env.example` (ou l'env Convex). Chaque item en case `- [ ]`, commande copiable, **rien d'inventé** (tout vient de `DOMAINS.md`). Les secrets des capacités sont déjà proposés (commentés) dans `.env.example` sous « Secrets des capacités métier » : **décommente ceux des domaines retenus**, n'en invente aucun autre.",
  "**Un seul fichier d'install** : `docs/A-FAIRE.md` = gestes de base (posés par le wizard) **+** la section « Pour ton projet » que tu viens d'ajouter. Ne crée **aucun** autre doc d'install.",
  "2. **Audit complet de complétude — AVANT d'écrire la roadmap.** But : ne **rien** oublier, pour que la roadmap couvre **tout** le produit designé (**toutes les features**, pas un sous-ensemble — on ne coupe pas).",
  "- **Analyse EXHAUSTIVE de la maquette** (`maquette/`) : **lis** chaque fichier ET **regarde** chaque écran (screenshot ; **PixelRAG** rend le coup d'œil plus fiable s'il est installé, il ne remplace pas la lecture). Liste **chaque écran** ET **chaque élément** (bouton, champ, liste, filtre, onglet, modale, menu) et les **états** (vide/chargement/erreur/succès) — l'IA rate ce qu'elle ne regarde pas.",
  "- **Pour chaque page**, détermine **tout ce dont elle a besoin pour FONCTIONNER** : vraies **données** (quel modèle, d'où), **features** déclenchées, **connexions backend** (auth, API, domaines), **permissions**, **états**.",
  "- **Croise** avec le PRD (chaque feature, chaque `UJ-*`) et les domaines. Appuie-toi sur les **docs/skills** de la stack — **rien d'inventé**.",
  "- Remplis l'**inventaire de complétude** dans **`docs/agents/inventaire.md`** (le tableau y est déjà : une ligne par élément — écran × élément × donnée réelle × feature du PRD × états × jalon). C'est la **base** de la roadmap, et le contrat de couverture que les critiques reliront.",
  "3. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — **Fondations d'abord**, puis balaie les dimensions : Modèle de données, Auth, **réaliser chaque écran/flux de la maquette**, **chaque feature du PRD**, **domaines sélectionnés**, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs.",
  "Chaque jalon précise **les données** : quelles **vraies** données l'écran montre/écrit, d'où elles viennent (modèle de données, API, auth), et leur **câblage réel** — **zéro mock, zéro fausse donnée**. Si le modèle de données manque, il passe **avant** l'écran qui l'utilise.",
  "4. Chaque jalon = une **tranche verticale** avec **`✅ Ce que tu vois :`** = **un bouton/une action qui MARCHE avec de la vraie donnée** (l'écran de la maquette devenu réel, pas une coquille) — + un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.",
  "5. **Panel critique — avant de figer la roadmap.** Dispatche les **3 agents critiques du kit en parallèle** (contexte frais, `claude-sonnet-5`) — chacun a **sa lentille**, donc ils trouvent des trous **différents** :",
  "- **`critique-produit`** (Vera) — features/écrans/parcours oubliés ;",
  "- **`critique-donnees`** (Marc) — données réelles, modèle, câblage, zéro mock, permissions ;",
  "- **`critique-ux`** (Lina) — états vide/chargement/erreur, impasses, responsive, accessibilité.",
  "Donne à chacun les quatre mêmes chemins : `maquette/`, `docs/PRD.md`, l'inventaire `docs/agents/inventaire.md` et `docs/ROADMAP.md`. Chaque `MANQUE` doit citer sa **preuve** (l'écran/élément de la maquette ou la ligne du PRD) — **sans preuve, jette-le**. Puis **dédoublonne** les rapports (les lentilles se recoupent) et intègre dans la roadmap.",
  "**Deux passes MAXIMUM** (la 2ᵉ ne relit que ce qui vient d'être ajouté). Ne boucle pas au-delà : au-delà de 2 tours, une revue multi-agents produit surtout des **faux positifs** et des sur-corrections — on gagne du bruit, pas de la qualité. S'il reste un doute après la 2ᵉ passe, **tranche avec l'utilisateur**, pas avec un 3ᵉ tour.",
  "> Ces agents vivent dans le dossier d'agents de ton assistant : `.cursor/agents/ (Cursor) · .claude/agents/ (Claude Code) · docs/agents/crew/ (Codex)` — tu peux les **appeler n'importe quand** (« lance `critique-ux` sur cet écran »), pas seulement ici.",
  "6. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.",
  "## Mise en place du projet",
  "1. Scaffold la stack choisie, **avec le preset shadcn** noté à l'étape `05-design-maquette.md` :",
  // ⚠️ CES DEUX LIGNES ONT ÉTÉ RÉÉCRITES PAR LE LOT « vitrine → Astro + Convex » (tâche 3), et
  // c'est le contrat du message ci-dessous : dire lesquelles, et pourquoi.
  //  · la 1re — la stack ne scaffolde plus UNE app mais DEUX (`site/` puis `dashboard/`), et
  //    Keystatic disparaît : le contenu vit dans Convex. `--name <nom-du-projet>` devient
  //    `--name site`, le sous-dossier étant désormais la disposition voulue et non un effet de bord.
  //  · la 2de — le piège des 5 drapeaux et celui du SOUS-DOSSIER sont conservés MOT POUR MOT ;
  //    seule la fin change. La consigne `"typecheck": "astro check"` qu'elle portait n'est pas
  //    perdue : elle a migré vers l'item 4 de la puce (les scripts de chaque application), et elle
  //    reste gardée par `runbook-executable.test.mjs` (« le runbook fait poser le script
  //    typecheck que le template n'a pas ») ET par V2bis (`cablage-stacks.test.mjs`), qui
  //    construit la racine décrite par la puce et échoue si `astro check` n'y est plus.
  "1. **`site/`** : `npx shadcn@latest init --template astro --base base --no-monorepo --preset <code> --name site --yes` — crée l'app Astro complète, avec le thème, dans `site/`.",
  "⚠️ **Les 5 drapeaux sont obligatoires** : sans eux `init` pose 4 questions (monorepo · bibliothèque · preset · nom), 3 aux flèches — `--yes` n'en saute aucune et **une IA reste bloquée sans erreur**. Pas de preset à l'étape `05-design-maquette.md` → `--preset nova`. **`--name` crée un SOUS-DOSSIER**, et ici c'est voulu : l'app Astro et son `package.json` vivent dans `site/`, `npm run dev` se lance **de là**.",
  "- **saas** : `npm create convex@latest <nom> -- -t tanstack-start` — ⚠️ **le `-t` est obligatoire** : sans lui, `create-convex` s'arrête sur un sélecteur aux flèches et une IA reste bloquée. Le template **n'inclut aucune auth** (`convex/` sort avec `schema.ts` + `myFunctions.ts`) : Better Auth s'ajoute ensuite. Puis, **dans le projet** : `npx shadcn@latest init --base base --no-monorepo --yes`, puis applique le thème (ci-dessous).",
  "- **desktop** : `npx create-electron-app@latest <nom> --template=vite-typescript`. ⚠️ **Forge n'a pas de template React** (ses 5 templates : `base`, `vite`, `vite-typescript`, `webpack`, `webpack-typescript`) — le projet sort **sans React**. Ajoute-le avant shadcn, qui en dépend : `npm i react react-dom` puis `npm i -D @vitejs/plugin-react@^4 @types/react @types/react-dom`. ⚠️ **La `^4` est obligatoire** : la v6 exige `vite@^8` alors que Forge livre `vite@5` (`ERESOLVE`), et la v5 est **ESM-only** alors que la config vite de Forge est chargée en `require`. Seule la v4 est dual-format. Branche `react()` dans `vite.renderer.config.ts`, renomme `src/renderer.ts` en `.tsx`, ajoute `<div id=\"root\">` à `index.html` et monte un `createRoot`. Ensuite seulement : `npx shadcn@latest init --base base --no-monorepo --yes`. Ensuite seulement : `npx shadcn@latest init --base base --no-monorepo --yes`.",
  "- **mobile** : `npx create-expo-app@latest <nom> --yes`, puis **NativeWind** (pas de shadcn en React Native) : `npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context` — `expo install` choisit les versions compatibles de ton SDK, `npm i` ne le fait pas. Config officielle : [nativewind.dev](https://www.nativewind.dev/getting-started/installation).",
  "2. **Applique le thème de l'étape `05-design-maquette.md`** — sur un projet **déjà créé**, ce n'est pas `init` mais : `npx shadcn@latest apply --preset <code> --yes` (`--only theme` ou `--only font` pour n'en prendre qu'une partie). Pour la vitrine, `init --preset` l'a déjà fait à la création.",
  "3. **Prends les écrans tout faits avant d'en coder un.** Le registry **officiel** livre des blocs complets, **sans clé ni registry à déclarer** : `npx shadcn@latest add dashboard-01` · `login-01..05` · `signup-01..05` · `sidebar-01..12`. Ils **héritent du preset** appliqué à l'étape 2 — c'est la chaîne : thème → bloc → écran déjà à ta charte. Liste complète : `npx shadcn@latest search @shadcn -q <mot>`, et `npx shadcn@latest view <bloc>` pour regarder avant d'installer.",
  "Blocs **shadcnblocks.com** (tiers, plus de choix) : ajoute d'abord le registry à **`components.json`** (fusionne, n'écrase pas) — `{ \"registries\": { \"@shadcnblocks\": { \"url\": \"https://www.shadcnblocks.com/r/{name}\", \"headers\": { \"Authorization\": \"Bearer ${SHADCNBLOCKS_API_KEY}\" } } } }` — puis `npx shadcn add @shadcnblocks/<bloc>` (gratuits sans clé ; `SHADCNBLOCKS_API_KEY` dans `.env` pour le pro).",
  "4. **Complète** l'`AGENTS.md` existant (déjà généré avec la boucle et la règle design — ne l'écrase pas) : ajoute des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, **`docs/A-FAIRE.md`**, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle d'ouvrir **`docs/A-FAIRE.md`** (tout ce qu'il reste à installer : gestes de base + ton projet) et d'utiliser `docs/RUN.md` pour lancer l'app.",
  "5. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive).",
  "## Fini quand",
  "Les fichiers fondation existent + `docs/A-FAIRE.md` liste **tout ce qu'il reste à installer** (gestes de base + section « Pour ton projet ») + le projet est scaffoldé + `AGENTS.md` contient la boucle et la règle design. Dis à l'utilisateur d'ouvrir `docs/A-FAIRE.md` et de cocher. Ensuite : « pour tout construire dans l'ordre avec un visuel à chaque étape, lance `/build` ; pour une feature isolée, `/new-feature` ».",
];

test('non-perte — aucune consigne du runbook d\'un bloc n\'est tombée au découpage', () => {
  const fichiers = FICHIERS();
  // Garde de montage : l'inventaire ne peut pas être vidé pour faire taire le test, et l'union
  // doit vraiment être celle d'un runbook découpé (une entrée + ses étapes).
  assert.equal(LIGNES_AVANT_DECOUPAGE.length, 111, 'l\'inventaire d\'avant le découpage a changé de taille : dis quelle ligne, et pourquoi');
  assert.ok(fichiers.length >= 10, `montage : ${fichiers.length} fichier(s) lu(s) — l'union entrée + étapes est vide ou incomplète`);

  const vues = new Set();
  for (const f of fichiers) for (const l of read(f).split('\n')) vues.add(l.trim());
  const perdues = LIGNES_AVANT_DECOUPAGE
    .filter((l) => !vues.has(l))
    .map((l) => `  ${l.slice(0, 110)}${l.length > 110 ? '…' : ''}`);
  assert.deepEqual(perdues, [], [
    `${perdues.length} consigne(s) du runbook d'avant le découpage ne sont dans AUCUN des ${fichiers.length} fichiers :`,
    ...perdues,
    '',
    'Découper déplace du texte, ça n\'en retire pas. Remets la ligne dans l\'étape qui la porte —',
    'ou, si elle a été volontairement réécrite, mets à jour LIGNES_AVANT_DECOUPAGE dans le même',
    'commit, en disant laquelle et pourquoi.',
  ].join('\n'));
});

test('l\'entrée est une CHECKLIST : chaque étape du disque y est citée, une fois, dans l\'ordre', () => {
  const entree = read(cheminRunbook('new-project'));
  const etapes = etapesDuRunbook(ROOT, 'new-project');
  assert.ok(etapes.length > 0, 'montage : aucune étape sur le disque, la checklist ne prouve rien');

  // Chez Codex, une étape est un FICHIER qu'un humain ouvre : rien ne l'empêche d'en sauter un,
  // sauf la checklist de l'entrée. Une étape livrée mais jamais citée est invisible.
  const positions = etapes.map((e) => {
    const occurrences = [...entree.matchAll(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
    assert.equal(occurrences.length, 1, `l'entrée cite « ${e} » ${occurrences.length} fois — il en faut exactement une`);
    return occurrences[0].index;
  });
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'l\'ordre des étapes dans l\'entrée n\'est pas celui de leurs numéros');

  // …et chacune annonce sa SORTIE : sans elle, la checklist est une table des matières, et
  // l'utilisateur ne sait pas à quoi reconnaître qu'une étape est finie.
  for (const e of etapes) {
    const ligne = entree.split('\n').find((l) => l.includes(e));
    assert.match(ligne, /→/, `l'entrée cite « ${e} » sans dire ce qu'elle produit`);
    assert.match(ligne, /^- \[ \]/, `« ${e} » n'est pas une case à cocher : l'entrée est une checklist, pas un sommaire`);
    assert.ok(ligne.length > e.length + 30, `« ${e} » : sortie attendue trop maigre — ${ligne}`);
  }

  // L'entrée reste COURTE : c'est tout l'objet du découpage. 170 lignes d'un bloc, c'était le mur.
  assert.ok(entree.split('\n').length <= 40, `l'entrée fait ${entree.split('\n').length} lignes : le mur revient`);
});

// ⚠️ `$ARGUMENTS` ne se substitue que dans le fichier chargé COMME COMMANDE. Dans une étape citée
// par son chemin, c'est du texte littéral — et le repli « si vide, demande la description » perd
// son déclencheur. Il doit donc rester dans l'entrée, et nulle part ailleurs.
test('$ARGUMENTS reste dans l\'entrée : une étape ne le substitue pas', () => {
  assert.match(read(cheminRunbook('new-project')), /\$ARGUMENTS/, 'l\'entrée ne prend plus l\'idée en argument');
  const fautives = FICHIERS().slice(1).filter((f) => read(f).includes('$ARGUMENTS'));
  assert.deepEqual(fautives, [], 'une étape n\'est pas chargée comme commande : `$ARGUMENTS` y resterait littéral');
});

test('le runbook /new-project est cohérent (sujets + sorties + templates)', () => {
  assert.deepEqual(validateNewProjectCommand(ROOT), []);
});

// ── UNE SEULE FAÇON DE NOMMER UNE ÉTAPE ───────────────────────────────────────────────────────
// Un runbook découpé a UN identifiant par étape : le nom de son FICHIER. « Phase 7 » n'en est pas
// un — rien sur le disque ne porte ce nom, donc rien ne peut vérifier qu'un renvoi « Phase 7 »
// vise encore quelque chose. Le découpage l'a rendu carrément faux : la Phase 3 et la Phase 4
// tenaient dans le MÊME fichier (`03-…`), et deux étapes (arborescence, fini-quand) n'avaient
// aucune phase. Le numéro de phase et le numéro d'étape avaient donc cessé de coïncider, en
// silence, dans 24 textes livrés (`docs/A-FAIRE.md`, `.env.example`, `docs/templates/PRD.md` et
// `architecture.md`, `/edit-design`, la règle design, et les étapes elles-mêmes).
//
// CONVENTION RETENUE, et la seule vérifiable : **une étape se nomme par son fichier**
// (`07-scaffold.md`). Deux exigences sur tout ce que `templates/` livre :
//   1. aucun « Phase N » — un numéro de phase ne désigne aucun fichier ;
//   2. toute étape citée entre backticks MÈNE QUELQUE PART (`erreursRenvois`). Ce deuxième volet
//      vivait ici en dur, et il ne connaissait qu'une forme de renvoi : le fichier NU
//      (`02-prd.md`). La forme que la CHECKLIST D'ENTRÉE écrit — `new-project/02-prd.md`, avec son
//      dossier — lui échappait entièrement : mesuré, `new-projet/02-prd.md` dans l'entrée laissait
//      les 416 tests verts, et une 10ᵉ case vers une étape jamais livrée aussi. Le contrôle vit
//      donc dans `runbook-decoupe.mjs`, avec les autres propriétés du découpage, et distingue les
//      deux formes (cf. son commentaire).
// Et dans le runbook découpé lui-même, le mot « phase » ne survit pas du tout : une seule chose,
// un seul mot — sans quoi l'entrée parlerait d'étapes pendant que les étapes parlent de phases.
const PHASE_NUMEROTEE = /\bphases?\s+\d/i;
const sousArbre = (rel) => fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? sousArbre(`${rel}/${d.name}`) : [`${rel}/${d.name}`]));

test('P4 — une étape se nomme par son fichier, jamais « Phase N »', () => {
  const livres = sousArbre('templates');
  assert.ok(livres.length > 80, `montage : ${livres.length} fichiers balayés dans templates/ — le corpus est vide ou tronqué`);
  // …et le balayage descend vraiment dans les sous-dossiers : les quatre familles qui portaient
  // une fuite (les étapes, les env, le template PRD, les règles d'agent) doivent toutes y être.
  for (const p of ['templates/commands/new-project/', 'templates/env/', 'templates/prd/', 'templates/agents/']) {
    assert.ok(livres.some((f) => f.startsWith(p)), `montage : aucun fichier de ${p} dans le corpus`);
  }

  const phases = [];
  for (const f of livres) {
    read(f).split('\n').forEach((l, i) => {
      if (PHASE_NUMEROTEE.test(l)) phases.push(`  ${f}:${i + 1} — ${l.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(phases, [], ['« Phase N » désigne un fichier qui n\'existe pas :', ...phases, '',
    'Nomme l\'étape par son fichier (`07-scaffold.md`) : c\'est le seul identifiant qu\'un lecteur',
    'peut ouvrir, et le seul qu\'un test peut vérifier.'].join('\n'));

  // 2. Aucun renvoi mort — ni nu, ni avec son dossier. C'est le contrôle que l'item 7 de /doctor
  // demandera à l'assistant de refaire chez l'utilisateur : ce qui rougit ici lui rendrait un ✗.
  const mortes = erreursRenvois(ROOT, livres);
  assert.deepEqual(mortes, [], ['Renvois morts vers une étape inexistante :', ...mortes, '',
    'Un chemin cité que le kit ne livre pas ouvre dans le vide chez les trois assistants — et',
    '`/doctor` (item 7) le rendra en ✗ pour un fichier qui n\'a jamais existé.'].join('\n'));

  // Dans un runbook découpé, le MOT disparaît aussi : l'entrée annonce des étapes, les étapes ne
  // peuvent pas se rappeler entre elles par un autre nom. Vrai pour TOUS les runbooks découpés, pas
  // seulement `/new-project` — un deuxième découpage aurait pu réintroduire le vocabulaire abandonné
  // sans que rien ne le voie.
  const decoupes = COMMANDS.filter((c) => etapesDuRunbook(ROOT, c).length > 0);
  assert.ok(decoupes.length >= 3, `montage : ${decoupes.length} runbook(s) découpé(s) — l'interdit ne porterait presque sur rien`);
  const reste = [];
  for (const f of decoupes.flatMap((c) => fichiersDuRunbook(ROOT, c))) {
    read(f).split('\n').forEach((l, i) => { if (/\bphases?\b/i.test(l)) reste.push(`  ${f}:${i + 1} — ${l.trim().slice(0, 100)}`); });
  }
  assert.deepEqual(reste, [], ['Le runbook dit encore « phase » là où l\'entrée dit « étape » :', ...reste].join('\n'));
});

