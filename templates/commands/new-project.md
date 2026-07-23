# /new-project — Fondation d'un nouveau projet (runbook IA)

Tu construis la **FONDATION complète** d'un nouveau produit à partir de l'idée donnée en argument.
Va **phase par phase**, en français. **Chaque artefact attend la validation de l'utilisateur avant le suivant** (gate). Pour aller en profondeur, **lance des sous-agents en parallèle** (recherche, rédaction) puis synthétise.

Argument : `$ARGUMENTS` = description libre de l'idée.
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.

> **Attribution** : la structure des templates PRD & architecture ci-dessous est **adaptée de BMAD-METHOD** (MIT © 2025 BMad Code, LLC). Le format `DESIGN.md` suit le spec **google-labs-code/design.md** (Apache-2.0, Google Labs). Adaptée/traduite ; « BMAD » est une marque de BMad Code, LLC (non affiliée).

## Mode de travail (demande au début)
Propose 2 modes et laisse l'utilisateur choisir :
- **Rapide** : tu rédiges les brouillons d'un coup, en marquant tes suppositions avec des tags `[HYPOTHÈSE: …]` que l'utilisateur corrigera.
- **Coaching** (par défaut) : tu avances **section par section**, avec des questions **ouvertes** (« parle-moi de X » plutôt que QCM). *L'élicitation, c'est la valeur* — ne propose pas TES idées à la place des siennes.

Discipline transverse : tag `[HYPOTHÈSE: …]`, `[NON-OBJECTIF v1]`, `[À CLARIFIER]` inline dans les brouillons ; balaie-les à la fin dans les sections dédiées.

---

## Phase 1 — Brainstorm produit (gate)
Invoque `superpowers:brainstorming`. Explore : intention, users/personas, contraintes, périmètre, critères de succès. Pose les questions **une à la fois**. → fais valider avant de continuer.

---

## Phase 2 — PRD complète → `docs/PRD.md` (gate)

Rédige une **PRD** en suivant ce template (colonne 100 %, chaque section = un titre + le contenu réel). Ordre à respecter :

1. **Vision** — quoi, pour qui, pourquoi ça compte. Assez clair pour tenir tout seul.
2. **Utilisateur cible**
   - *Jobs To Be Done* — le besoin émotionnel/social/fonctionnel/contextuel (même « c'est pour moi » est valide).
   - *Non-utilisateurs (v1)* — qui ce n'est **pas** (quand la frontière n'est pas évidente).
   - *Parcours utilisateurs clés* — récits avec persona nommé, numérotés **UJ-1 … UJ-N** (contexte, état d'entrée, chemin 3-5 étapes, climax, résolution).
3. **Glossaire** — les termes du produit, définis **exactement**. Interdit d'introduire un synonyme ailleurs.
4. **Fonctionnalités** — une sous-section par feature (4.1, 4.2…) :
   - *Description* comportementale (réalise UJ-X), avec tags `[HYPOTHÈSE]` inline.
   - *Exigences fonctionnelles* en blocs `#### FR-1 : {nom}` → prose « [Acteur] peut [capacité] sous [conditions]. Réalise UJ-X. » + **Conséquences (testables)** en puces + *Hors-scope* optionnel.
   - *NFR spécifiques* + *Notes* `[NOTE POUR PM]` optionnels.
5. **Non-objectifs (explicites)** — ce que le produit **n'est pas** / ne fera **pas** en v1. Coupe le « tant qu'on y est, ajoutons… » à tous les niveaux.
6. **Périmètre MVP** — *Dans le scope* (puces nettes) / *Hors scope MVP* (chaque item + raison ; marque ce qui est reporté en v2/v3).
7. **Métriques de succès** — *Primaires* / *Secondaires* / *Contre-métriques (à NE PAS optimiser)*. Format `**SM-1** : métrique — définition, cible. Valide FR-X.`
8. **Questions ouvertes** — numérotées. Deviennent des tickets/recherches, pas des trous silencieux.
9. **Index des hypothèses** — chaque `[HYPOTHÈSE]` du document, remonté ici pour **confirmation explicite** une par une.

**Clusters à ajouter selon le type de produit** (n'inclus que le pertinent) : *grand public* → Esthétique & ton, Architecture de l'information, Monétisation, Plateforme ; *entreprise* → Parties prenantes & approbations, Risques & mitigations, ROI, SLA/RTO/RPO, Intégrations, Rollout, Gouvernance des données ; *régulé* → Conformité (RGPD, HIPAA, PCI-DSS, WCAG 2.1 AA…) ; *produit dev* → Contrats d'API, Versioning/dépréciation, Budgets de perf.

**Checklist qualité (avant validation)** : prêt-à-décider · substance (pas de remplissage) · cohérence stratégique · « fini » clair · honnêteté du scope · utilisable par les phases suivantes · forme adaptée à l'enjeu. → **validation utilisateur**.

---

## Phase 3 — Stack (déjà fixée)
La stack a été **choisie par le wizard** : lis-la dans `AGENTS.md` (et les règles de `.cursor/rules/` ou `.claude/skills/`) — **ne redemande pas**. Le contexte officiel de la stack est dans `ai-context/`. Confirme-la à l'utilisateur en une phrase, puis continue.

---

## Phase 4 — Tech spec / architecture → `docs/superpowers/specs/<date>-<projet>-architecture.md` (gate)

Écris une **spine d'architecture** : on ne fixe QUE les **invariants** (les décisions durables qu'un futur builder ne peut **pas** déduire du code). Le reste (arbre complet, détails) appartient au code une fois écrit. Sections :

1. **Paradigme de design** — nomme le pattern (un pattern connu charge tout un modèle gratuitement) + mappe ses couches aux dossiers/namespaces.
2. **Invariants & règles** — le cœur durable. Un bloc par décision `### AD-1 — {décision}` avec **Lie** (ce qui est concerné), **Empêche** (la divergence évitée), **Règle** (applicable). Ajoute un **diagramme de dépendances** (Mermaid, jamais vide).
3. **Conventions de cohérence** — là où des builders indépendants dériveraient : nommage (entités/fichiers/interfaces/events), formats (ids/dates/forme d'erreur/enveloppes), état & transverse (mutations/erreurs/logging/config/auth).
4. **Stack** — nom + version uniquement (graine ; le code en devient propriétaire ensuite).
5. **Graine structurelle** — les formes qu'il vaut la peine de fixer au démarrage : vue système, **déploiement & environnements + topologie infra externe** (ne PAS laisser silencieux), **ERD** cœur (entités + relations, pas les colonnes), arbre source minimal.
6. **Map capacité → architecture** — chaque capacité du PRD : *vit dans* / *gouvernée par*.
7. **Différé** — décisions repoussées, chacune avec la raison qu'elle peut attendre.

**Checklist** : chaque AD est-il vraiment un invariant non-évident ? déploiement explicite ? sécurité/conformité traitée (AD ou différé, pas silence) ? → **validation utilisateur**.

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
Charge les **5 skills design** (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`) + le skill **`design-md`**.

- **Stack web (saas / desktop / vitrine) — commence par récupérer les préférences visuelles :** demande à l'utilisateur d'**ouvrir le compositeur de thème shadcn** en partant de ce preset de départ → **[ui.shadcn.com/create?preset=b27GcrRo](https://ui.shadcn.com/create?preset=b27GcrRo)**, de régler **en visuel** couleurs / rayons / typo, puis de te **renvoyer son code de preset** (l'URL `?preset=<code>`). Ces préférences = **base de `docs/design.md`** (palette/typo/rayons) ; **note le preset pour la Phase 7** (le scaffold l'appliquera). Pour affiner encore : **[tweakcn.com](https://tweakcn.com)** (export variables CSS).
- **Mobile** : jamais shadcn (c'est du DOM web) → NativeWind + patterns RN.

Puis **affine par un vrai aller-retour, une question à la fois** (mode coaching) — ce que le preset ne dit pas : ambiance/personnalité de la marque, références qui plaisent, public visé, densité, clair/sombre. Appuie-toi sur les parcours **UJ-*** du PRD. Écris le tout dans **`docs/design.md`** (volets A/B ci-dessous). **→ fais VALIDER `docs/design.md` avant de dessiner.**

**Étape 2 — la maquette ENSUITE : un sous-agent par page (en parallèle), en shadcn/ui.**
`docs/design.md` validé → dessine, **une page = un sous-agent** :
1. Liste les **écrans porteurs** (des parcours **UJ-*** du PRD) : entrée canonique, écran héros du flux le plus complexe, un overlay, la vue liste/dashboard.
2. **Délègue chaque écran à un sous-agent, en parallèle.** Chaque sous-agent, **à chaque fois** :
   - **charge les skills design** → voir **`AGENTS.md` → section « Règle design »** (la liste de référence : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`) ;
   - lit **`docs/design.md`** (preset + tokens) — **même source pour tous = maquette cohérente** ;
   - produit **sa page** calquée shadcn/ui (composants type shadcn, tokens du preset, Tailwind CDN) → écrit `maquette/parts/<ecran>.html` ;
   - **auto-vérifie** : ouvre sa `part` dans le navigateur + screenshot, corrige si c'est cassé, **avant** de la rendre.
3. **Assemble** les parts en **UN SEUL fichier `maquette/index.html`** — chaque écran = une **section pleine largeur, titrée, empilée**. Fais une **passe de cohérence** (mêmes boutons/espacements/typo partout), puis un seul fichier à ouvrir pour tout voir.
- **Stitch connecté** : à la place, un `generate_screen_from_text` par écran (skill `stitch::generate-design`) en passant le design → importe dans `maquette/`.
- **Mobile** : sous-agents calqués **NativeWind / patterns RN** (pas shadcn).

> Rappel : la maquette **EST** le design final (le scaffold Phase 7 la transforme en **vrais composants shadcn**, même preset), pas un wireframe gris.

**Itère jusqu'à validation** : montre, applique les retours, recommence. Vrai aller-retour, pas un one-shot.

### Le design system → `docs/design.md` (deux volets)
Avec les 5 skills design, fixe (cas c) ou extrais de la maquette (cas a/b) DEUX volets :

**A. DESIGN.md — l'identité visuelle** *(format google-labs design.md)*
- *Frontmatter tokens* (machine) : `colors` (nom→hex), `typography` (fontFamily/size/weight/lineHeight), `rounded`, `spacing`, `components` (composant→tokens).
- *Marque & style* · *Couleurs* (rôle) · *Typographie* (rôles, échelle) · *Layout & espacements* (grille, breakpoints) · *Élévation* (ombres) · *Formes* (rayons) · *Composants* (specs par composant) · *À faire / à éviter*.
- shadcn/Tailwind : réfère les tokens par nom plutôt que de tout redéfinir. Affine sur **[tweakcn.com](https://tweakcn.com)** → colle dans `globals.css` + les *tokens* de `docs/design.md`. Le scaffold appliquera le preset en Phase 7 (`npx shadcn@latest init --preset <code>`).

**B. EXPERIENCE.md — le comportement**
- *Fondation* (form-factor, système d'UI) · *Architecture de l'information* · *Voix & ton* (microcopy) · *Patterns de composants* + *d'état* (chargement/vide/erreur/succès) · *Primitives d'interaction* · *Plancher d'accessibilité* · *Flux clés* (parcours avec protagoniste nommé + climax).

→ **validation utilisateur** (la maquette **et** le `design.md`) avant la Phase 6.

---

## Phase 6 — Analyse de la maquette + domaines → Roadmap `docs/ROADMAP.md`

1. **Sélection des domaines + doc d'install SUR MESURE** : lis `docs/DOMAINS.md` (le catalogue de la stack) et repère, dans le PRD, les **domaines métier** nécessaires (paiement, email, storage, analytics, erreurs, jobs, recherche, push, caméra, cartes, auto-update, licence…). Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.

   **Stack vitrine** : les domaines `seo`, `geo` et `images` sont **toujours sélectionnés** (raison d'être de la stack), quel que soit le PRD — les triggers ne servent que pour `forms`, `analytics`, `i18n`…

   Puis **complète le fichier unique `docs/A-FAIRE.md`** (déjà créé par le wizard avec les gestes de base) en y ajoutant, à la fin, une section **`## Pour ton projet`** : **une entrée par domaine détecté**, en français simple, pour que l'utilisateur n'ait **rien à deviner**. Pour chacune : une ligne « à quoi ça sert », le **paquet** à installer (option officielle par défaut, tirée de `DOMAINS.md`), la **commande MCP** s'il y en a une (ex. paiement → `claude mcp add --transport http stripe https://mcp.stripe.com`), et le **secret** à mettre dans `.env.example` (ou l'env Convex). Chaque item en case `- [ ]`, commande copiable, **rien d'inventé** (tout vient de `DOMAINS.md`). Ajoute aussi les secrets à `.env.example`.

   **Un seul fichier d'install** : `docs/A-FAIRE.md` = gestes de base (posés par le wizard) **+** la section « Pour ton projet » que tu viens d'ajouter. Ne crée **aucun** autre doc d'install.
2. **Analyse la maquette validée** (`maquette/`) : lis les fichiers exportés et **liste chaque écran + chaque flux** qu'elle montre. C'est la **cible concrète** que le build doit réaliser — la roadmap existe pour rendre ces écrans réels.
3. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — **Fondations d'abord**, puis balaie les dimensions : Modèle de données, Auth, **réaliser chaque écran/flux de la maquette**, **chaque feature du PRD**, **domaines sélectionnés**, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs.
4. Chaque jalon = une **tranche verticale** avec une ligne **`✅ Ce que tu vois :`** — idéalement **l'écran de la maquette qui devient réel** dans l'app — et un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
5. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.

---

## Phase 7 — Mise en place du projet
1. Scaffold la stack choisie, **avec le preset shadcn** noté en Phase 5 :
   - **vitrine** : `npx shadcn@latest init --preset <code> --template astro` (crée l'app Astro complète avec le thème), puis Keystatic (`npx astro add react markdoc` + `@keystatic/core @keystatic/astro`).
   - **saas** : `npm create convex@latest` (TanStack Start + Convex), puis **dans le projet** : `npx shadcn@latest init --preset <code>`.
   - **desktop** : `create-electron-app` (vite+react), puis **dans le renderer** : `npx shadcn@latest init --preset <code>`.
   - **mobile** : `create-expo-app` + **NativeWind** (pas de shadcn en React Native).
   - Sans preset → `init` sans `--preset` (défaut).
2. **Complète** l'`AGENTS.md` existant (déjà généré avec la boucle et la règle design — ne l'écrase pas) : ajoute des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, **`docs/A-FAIRE.md`**, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle d'ouvrir **`docs/A-FAIRE.md`** (tout ce qu'il reste à installer : gestes de base + ton projet) et d'utiliser `docs/RUN.md` pour lancer l'app.
3. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive) et `docs/DREAM.md` (vide, avec en-tête).

## Fini quand
Les fichiers fondation existent + `docs/A-FAIRE.md` liste **tout ce qu'il reste à installer** (gestes de base + section « Pour ton projet ») + le projet est scaffoldé + `AGENTS.md` contient la boucle et la règle design. Dis à l'utilisateur d'ouvrir `docs/A-FAIRE.md` et de cocher. Ensuite : « pour tout construire dans l'ordre avec un visuel à chaque étape, lance `/build` ; pour une feature isolée, `/new-feature` ».
