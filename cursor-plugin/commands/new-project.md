# /new-project — Fondation d'un nouveau projet (runbook IA)

Tu construis la **FONDATION complète** d'un nouveau produit à partir de l'idée donnée en argument.
Va **phase par phase**, en français. **Chaque artefact attend la validation de l'utilisateur avant le suivant** (gate). Pour aller en profondeur, **lance des sous-agents en parallèle** (recherche, rédaction) puis synthétise — cadre : **« Règle sous-agents »** dans `AGENTS.md` (quand déléguer, comment).

Argument : `$ARGUMENTS` = description libre de l'idée.
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.

> **Attribution** : la structure des templates PRD & architecture (`docs/templates/PRD.md`, `docs/templates/architecture.md`) est **adaptée de BMAD-METHOD** (MIT © 2025 BMad Code, LLC) — l'attribution est répétée en tête de chacun. Le format `DESIGN.md` suit le spec **google-labs-code/design.md** (Apache-2.0, Google Labs). Adaptée/traduite ; « BMAD » est une marque de BMad Code, LLC (non affiliée).

## Ce qu'on va faire ensemble — explique le parcours (à dire à l'utilisateur, EN PREMIER)
Avant toute question, dis-lui en **langage simple** ce qu'on va faire et ce qu'il obtiendra :
> « On va, ensemble : **1)** bien comprendre ton idée (quelques questions simples) · **2)** écrire le **plan** de ton app · **3)** **dessiner les écrans** (maquette) · **4)** en tirer une **feuille de route**. Ensuite `/build` construit, écran par écran. À la fin de cette étape tu auras un **plan clair + un design + une roadmap** — pas encore de code, et c'est normal. »
Puis propose le mode de travail. Garde ce cap : à chaque phase, redis en une phrase **ce que tu fais et ce que ça lui apporte**.

---

## Mode de travail (demande au début)
Propose 2 modes et laisse l'utilisateur choisir :
- **Rapide** : tu proposes des brouillons d'un coup avec tes suppositions taguées `[HYPOTHÈSE: …]` ; l'utilisateur corrige. **Moins de questions** — bien si l'idée est déjà claire.
- **Pas à pas** (par défaut) : tu avances **section par section** avec des questions. Plus guidé, mais **plus de questions** — dis-le pour qu'il choisisse en connaissance de cause.

Discipline transverse : tag `[HYPOTHÈSE: …]`, `[NON-OBJECTIF v1]`, `[À CLARIFIER]` inline dans les brouillons ; balaie-les à la fin dans les sections dédiées.

---

## Phase 1 — Brainstorm : comprendre l'idée (gate)
Invoque `superpowers:brainstorming`, **adapté débutant** :
- **Peu de questions** (vise **4-6 essentielles**), **une à la fois**, en **langage simple**, **zéro jargon** dans la question.
- **Un exemple concret à chaque question** (« ex. : … ») pour qu'il voie ce que tu attends.
- **Le pourquoi** en une demi-ligne (« ça m'aide à … »).
- **Reformule** sa réponse après coup (« donc ton app fait X, pour Y »).
- Si tu peux **deviner**, propose une **hypothèse** (`[HYPOTHÈSE: …]`) au lieu de demander.
- L'essentiel à couvrir : **c'est quoi** l'app · **pour qui** · le **truc principal** qu'elle fait · **2-3 fonctions** must-have · ce que ce **n'est pas** (v1).

Le vocabulaire technique (personas, JTBD, exigences…) va dans le **document** `docs/PRD.md`, **jamais** dans les questions posées. → fais valider avant de continuer.

---

## Phase 2 — PRD complète → `docs/PRD.md` (gate)

**Ouvre `docs/templates/PRD.md`** et suis-le section par section (vision, utilisateur cible et parcours `UJ-*`, glossaire, fonctionnalités en `FR-*`, non-objectifs, périmètre MVP, métriques, questions ouvertes, index des hypothèses) — il porte aussi les clusters par type de produit et la checklist qualité. Écris le résultat dans **`docs/PRD.md`** ; le template reste intact.

Ne saute aucune section : ce que le PRD ne dit pas, la roadmap ne le construira pas. → **validation utilisateur**.

---

## Phase 3 — Stack (déjà fixée)
La stack a été **choisie par le wizard** : lis-la dans `AGENTS.md` (et les règles de `.cursor/rules/` ou `.claude/skills/`) — **ne redemande pas**. Le contexte officiel de la stack est dans `ai-context/`. Confirme-la à l'utilisateur en une phrase, puis continue.

---

## Phase 4 — Tech spec / architecture → `docs/superpowers/specs/<date>-<projet>-architecture.md` (gate)

**Ouvre `docs/templates/architecture.md`** et suis-le : on ne fixe QUE les décisions durables qu'un futur builder ne peut **pas** déduire du code (paradigme, `AD-*` + diagramme de dépendances, conventions de cohérence, stack, graine structurelle, map capacité → architecture, différé). Le template porte aussi sa checklist.

Écris le résultat dans `docs/superpowers/specs/<date>-<projet>-architecture.md`. → **validation utilisateur**.

---

## Phase 5 — Maquette + Design → `maquette/` + `docs/design.md` (gate)

La **maquette est le pivot** : on fixe le design **avant** de coder, on **itère** jusqu'à validation, puis la roadmap en découle (Phase 6). Ne code rien ici.

**Demande d'abord à l'utilisateur son cas** (pour les écrans) — aucune réponse ne bloque :

- **(a)** « J'ai déjà une maquette sur **Stitch** »
- **(b)** « J'ai une maquette **ailleurs** » (Figma, images, HTML)
- **(c)** « Je **n'ai pas** de maquette »

L'ordre du travail dépend du cas : si une maquette existe déjà (a/b), on en **dérive** le design ; s'il n'y en a pas (c), on fixe le **design d'abord**, puis on dessine.

### Cas (a) / (b) — une maquette existe → on en dérive le design
1. Récupère la maquette dans `maquette/` :
   - **(a) Stitch** : connecte le MCP (voir `docs/A-FAIRE.md`), `list_projects` → `list_screens` → pour chaque écran validé `get_screen` (`htmlCode`) → écris-le dans `maquette/<ecran>.html`.
   - **(b) Ailleurs** : demande à l'utilisateur de **déposer ses exports/captures dans `maquette/`** (un fichier par écran) ; ça te sert de référence visuelle.
2. **Dérive `docs/design.md`** de la maquette validée (les deux volets « Le design system » ci-dessous).
3. Génère la galerie **`maquette/index.html`** : une page qui liste chaque écran dans une `<iframe>` (titre + aperçu), pour tout valider d'un coup d'œil.

> Beaucoup d'écrans ? **délègue un sous-agent par écran** pour les importer/normaliser sur `docs/design.md` (mêmes skills : `AGENTS.md → « Règle design »`).

### Cas (c) — pas de maquette → **design d'abord, maquette ensuite** (étape par étape)

**Étape 1 — `docs/design.md` D'ABORD (préférences shadcn → questions → skills).**
Charge les **4 skills design** (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) + le skill **`design-md`**.

- **Stack web (saas / desktop / vitrine) — commence par récupérer les préférences visuelles :** demande à l'utilisateur d'**ouvrir le compositeur de thème shadcn** en partant de ce preset de départ → **[ui.shadcn.com/create?preset=b27GcrRo](https://ui.shadcn.com/create?preset=b27GcrRo)**, de régler **en visuel** couleurs / rayons / typo, puis de te **renvoyer son code de preset** (l'URL `?preset=<code>`). Ces préférences = **base de `docs/design.md`** (palette/typo/rayons) ; **note le preset pour la Phase 7** (le scaffold l'appliquera). Pour affiner encore : **[tweakcn.com](https://tweakcn.com)** (export variables CSS).
- **Mobile** : jamais shadcn (c'est du DOM web) → NativeWind + patterns RN.

Puis **affine par un vrai aller-retour, une question à la fois** (mode pas à pas) — ce que le preset ne dit pas : ambiance/personnalité de la marque, références qui plaisent, public visé, densité, clair/sombre. Appuie-toi sur les parcours **UJ-*** du PRD. Écris le tout dans **`docs/design.md`** (volets A/B ci-dessous). **→ fais VALIDER `docs/design.md` avant de dessiner.**

**Étape 2 — la maquette ENSUITE : un sous-agent par page (en parallèle), en shadcn/ui.**
`docs/design.md` validé → dessine, **une page = un sous-agent** :
1. Liste les **écrans porteurs** (des parcours **UJ-*** du PRD) : entrée canonique, écran héros du flux le plus complexe, un overlay, la vue liste/dashboard.
2. **Délègue chaque écran à un sous-agent, en parallèle.** Chaque sous-agent, **à chaque fois** :
   - **charge les skills design** → voir **`AGENTS.md` → section « Règle design »** (la liste de référence : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) ;
   - lit **`docs/design.md`** (preset + tokens) — **même source pour tous = maquette cohérente** ;
   - produit **sa page** calquée shadcn/ui (composants type shadcn, tokens du preset, Tailwind CDN) → écrit `maquette/parts/<ecran>.html` ;
   - pour aller vite : **repère** les blocs shadcnblocks qui collent (`hero`, `pricing`, `features`…) et recopie leur structure en HTML/Tailwind CDN. On ne les **installe pas** ici : le registry n'est câblé qu'en Phase 7, sur un projet scaffoldé — la maquette, elle, n'est qu'un dossier de pages ;
   - **auto-vérifie avant de rendre sa part** : ouvre-la dans le navigateur + screenshot, corrige si c'est cassé ;
   - puis compare à l'écran maquette de référence, à l'œil ou avec **PixelRAG** s'il est installé : cette comparaison d'images **alerte, elle ne tranche pas** (voir « Règle de vérification »).
3. **Assemble** les parts en **UN SEUL fichier `maquette/index.html`** — chaque écran = une **section pleine largeur, titrée, empilée**. Fais une **passe de cohérence** (mêmes boutons/espacements/typo partout), puis un seul fichier à ouvrir pour tout voir.
- **Stitch connecté** : à la place, un `generate_screen_from_text` par écran (skill `stitch::generate-design`) en passant le design → importe dans `maquette/`.
- **Mobile** : sous-agents calqués **NativeWind / patterns RN** (pas shadcn).

> Rappel : la maquette **EST** le design final (le scaffold Phase 7 la transforme en **vrais composants shadcn**, même preset), pas un wireframe gris.

**Itère jusqu'à validation** : montre, applique les retours, recommence. Vrai aller-retour, pas un one-shot.

### Le design system → `docs/design.md` (deux volets)
Avec les 4 skills design, fixe (cas c) ou extrais de la maquette (cas a/b) DEUX volets :

**A. DESIGN.md — l'identité visuelle** *(format google-labs design.md)*
- *Frontmatter tokens* (machine) : `colors` (nom→hex), `typography` (fontFamily/size/weight/lineHeight), `rounded`, `spacing`, `components` (composant→tokens).
- *Marque & style* · *Couleurs* (rôle) · *Typographie* (rôles, échelle) · *Layout & espacements* (grille, breakpoints) · *Élévation* (ombres) · *Formes* (rayons) · *Composants* (specs par composant) · *À faire / à éviter*.
- shadcn/Tailwind : réfère les tokens par nom plutôt que de tout redéfinir. Affine sur **[tweakcn.com](https://tweakcn.com)** → colle dans `globals.css` + les *tokens* de `docs/design.md`. Le scaffold appliquera ce preset en **Phase 7** (la commande exacte y est écrite — ne la recopie pas ici, elle a cinq drapeaux obligatoires).

**B. EXPERIENCE.md — le comportement**
- *Fondation* (form-factor, système d'UI) · *Architecture de l'information* · *Voix & ton* (microcopy) · *Patterns de composants* + *d'état* (chargement/vide/erreur/succès) · *Primitives d'interaction* · *Plancher d'accessibilité* · *Flux clés* (parcours avec protagoniste nommé + climax).

→ **validation utilisateur** (la maquette **et** le `design.md`) avant la Phase 6.

---

## Phase 6 — Analyse de la maquette + domaines → Roadmap `docs/ROADMAP.md`

1. **Sélection des domaines + doc d'install SUR MESURE** : ouvre `docs/DOMAINS.md` (le catalogue de la stack). Chaque capacité y liste ses **`_Déclencheurs :_`** — les mots qui, présents dans le PRD, l'allument. **Applique-les au texte de `docs/PRD.md`, un par un**, et note les capacités allumées : c'est ta sélection de départ, elle ne se devine pas. (Si `docs/DOMAINS.md` porte déjà des 🎯, c'est le kit qui les a appliqués — vérifie-les, ne les recopie pas les yeux fermés.) Ajoute ensuite ce que les mots ne peuvent pas voir, retire ce que le PRD ne demande pas, et **dis à l'utilisateur ce que tu as ajouté ou retiré, et pourquoi**. Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.

   **Stack vitrine** : les domaines `seo`, `geo` et `images` sont **toujours sélectionnés** (raison d'être de la stack), quel que soit le PRD — les déclencheurs ne servent que pour `forms`, `analytics`, `i18n`…

   Puis **complète le fichier unique `docs/A-FAIRE.md`** (déjà créé par le wizard avec les gestes de base) en y ajoutant, à la fin, une section **`## Pour ton projet`** : **une entrée par domaine détecté**, en français simple, pour que l'utilisateur n'ait **rien à deviner**. Pour chacune : une ligne « à quoi ça sert », le **paquet** à installer (option officielle par défaut, tirée de `DOMAINS.md`), la **commande MCP** s'il y en a une (ex. paiement → `claude mcp add --transport http stripe https://mcp.stripe.com`), et le **secret** à mettre dans `.env.example` (ou l'env Convex). Chaque item en case `- [ ]`, commande copiable, **rien d'inventé** (tout vient de `DOMAINS.md`). Les secrets des capacités sont déjà proposés (commentés) dans `.env.example` sous « Secrets des capacités métier » : **décommente ceux des domaines retenus**, n'en invente aucun autre.

   **Un seul fichier d'install** : `docs/A-FAIRE.md` = gestes de base (posés par le wizard) **+** la section « Pour ton projet » que tu viens d'ajouter. Ne crée **aucun** autre doc d'install.
2. **Audit complet de complétude — AVANT d'écrire la roadmap.** But : ne **rien** oublier, pour que la roadmap couvre **tout** le produit designé (**toutes les features**, pas un sous-ensemble — on ne coupe pas).
   - **Analyse EXHAUSTIVE de la maquette** (`maquette/`) : **lis** chaque fichier ET **regarde** chaque écran (screenshot ; **PixelRAG** rend le coup d'œil plus fiable s'il est installé, il ne remplace pas la lecture). Liste **chaque écran** ET **chaque élément** (bouton, champ, liste, filtre, onglet, modale, menu) et les **états** (vide/chargement/erreur/succès) — l'IA rate ce qu'elle ne regarde pas.
   - **Pour chaque page**, détermine **tout ce dont elle a besoin pour FONCTIONNER** : vraies **données** (quel modèle, d'où), **features** déclenchées, **connexions backend** (auth, API, domaines), **permissions**, **états**.
   - **Croise** avec le PRD (chaque feature, chaque `UJ-*`) et les domaines. Appuie-toi sur les **docs/skills** de la stack — **rien d'inventé**.
   - Remplis l'**inventaire de complétude** dans **`docs/agents/inventaire.md`** (le tableau y est déjà : une ligne par élément — écran × élément × donnée réelle × feature du PRD × états × jalon). C'est la **base** de la roadmap, et le contrat de couverture que les critiques reliront.
3. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — **Fondations d'abord**, puis balaie les dimensions : Modèle de données, Auth, **réaliser chaque écran/flux de la maquette**, **chaque feature du PRD**, **domaines sélectionnés**, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs.

   Chaque jalon précise **les données** : quelles **vraies** données l'écran montre/écrit, d'où elles viennent (modèle de données, API, auth), et leur **câblage réel** — **zéro mock, zéro fausse donnée**. Si le modèle de données manque, il passe **avant** l'écran qui l'utilise.
4. Chaque jalon = une **tranche verticale** avec **`✅ Ce que tu vois :`** = **un bouton/une action qui MARCHE avec de la vraie donnée** (l'écran de la maquette devenu réel, pas une coquille) — + un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
5. **Panel critique — avant de figer la roadmap.** Dispatche les **3 agents critiques du kit en parallèle** (contexte frais, `claude-sonnet-5`) — chacun a **sa lentille**, donc ils trouvent des trous **différents** :
   - **`critique-produit`** (Vera) — features/écrans/parcours oubliés ;
   - **`critique-donnees`** (Marc) — données réelles, modèle, câblage, zéro mock, permissions ;
   - **`critique-ux`** (Lina) — états vide/chargement/erreur, impasses, responsive, accessibilité.
   Donne à chacun les quatre mêmes chemins : `maquette/`, `docs/PRD.md`, l'inventaire `docs/agents/inventaire.md` et `docs/ROADMAP.md`. Chaque `MANQUE` doit citer sa **preuve** (l'écran/élément de la maquette ou la ligne du PRD) — **sans preuve, jette-le**. Puis **dédoublonne** les rapports (les lentilles se recoupent) et intègre dans la roadmap.

   **Deux passes MAXIMUM** (la 2ᵉ ne relit que ce qui vient d'être ajouté). Ne boucle pas au-delà : au-delà de 2 tours, une revue multi-agents produit surtout des **faux positifs** et des sur-corrections — on gagne du bruit, pas de la qualité. S'il reste un doute après la 2ᵉ passe, **tranche avec l'utilisateur**, pas avec un 3ᵉ tour.

   > Ces agents vivent dans le dossier d'agents de ton assistant : `.cursor/agents/ (Cursor) · .claude/agents/ (Claude Code) · docs/agents/crew/ (Codex)` — tu peux les **appeler n'importe quand** (« lance `critique-ux` sur cet écran »), pas seulement ici.
6. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.

---

## Phase 7 — Mise en place du projet
1. Scaffold la stack choisie, **avec le preset shadcn** noté en Phase 5 :
   - **vitrine** : `npx shadcn@latest init --template astro --base base --no-monorepo --preset <code> --name <nom-du-projet> --yes` (crée l'app Astro complète avec le thème), puis Keystatic (`npx astro add react markdoc` + `@keystatic/core @keystatic/astro`).
     ⚠️ **Les 5 drapeaux sont obligatoires** : sans eux `init` pose 4 questions (monorepo · bibliothèque · preset · nom), 3 aux flèches — `--yes` n'en saute aucune et **une IA reste bloquée sans erreur**. Pas de preset en Phase 5 → `--preset nova`. **`--name` crée un SOUS-DOSSIER** : l'environnement du kit reste à la racine, l'app Astro et son `package.json` vont dans `<nom-du-projet>/` — dis à l'utilisateur que `npm run dev` se lance **de là**. Enfin, **ajoute `"typecheck": "astro check"`** au `package.json` créé : le template n'en pose aucun, et sans lui le hook retombe sur `tsc --noEmit`, qui **ne lit pas les `.astro`** et sort vert sans rien vérifier.
   - **saas** : `npm create convex@latest` (TanStack Start + Convex), puis **dans le projet** : `npx shadcn@latest init --preset <code> --base base --no-monorepo --yes`.
   - **desktop** : `create-electron-app` (vite+react), puis **dans le renderer** : `npx shadcn@latest init --preset <code> --base base --no-monorepo --yes`.
   - **Blocs shadcnblocks** (saas / desktop / vitrine) : après `shadcn init`, ajoute le registry à **`components.json`** (fusionne, n'écrase pas) —
     ```json
     { "registries": { "@shadcnblocks": { "url": "https://www.shadcnblocks.com/r/{name}", "headers": { "Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}" } } } }
     ```
     puis `npx shadcn add @shadcnblocks/<bloc>` fonctionne (gratuits **sans clé** ; `SHADCNBLOCKS_API_KEY` dans `.env` pour le pro).
   - **mobile** : `create-expo-app` + **NativeWind** (pas de shadcn en React Native).
   - Sans preset → `init` sans `--preset` (défaut).
2. **Complète** l'`AGENTS.md` existant (déjà généré avec la boucle et la règle design — ne l'écrase pas) : ajoute des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, **`docs/A-FAIRE.md`**, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle d'ouvrir **`docs/A-FAIRE.md`** (tout ce qu'il reste à installer : gestes de base + ton projet) et d'utiliser `docs/RUN.md` pour lancer l'app.
3. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive).

## Fini quand
Les fichiers fondation existent + `docs/A-FAIRE.md` liste **tout ce qu'il reste à installer** (gestes de base + section « Pour ton projet ») + le projet est scaffoldé + `AGENTS.md` contient la boucle et la règle design. Dis à l'utilisateur d'ouvrir `docs/A-FAIRE.md` et de cocher. Ensuite : « pour tout construire dans l'ordre avec un visuel à chaque étape, lance `/build` ; pour une feature isolée, `/new-feature` ».
