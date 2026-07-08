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

La **maquette est le pivot** : on dessine les écrans **avant** de coder, on **itère dessus** jusqu'à validation, puis la roadmap en découle (Phase 6). Ne code rien ici.

**1. La maquette (le pivot) — 3 entrées possibles, aucune ne bloque**

Demande d'abord à l'utilisateur laquelle correspond :

- **(a) « J'ai déjà une maquette sur Stitch »** → connecte le MCP Stitch (voir `docs/SETUP-AI.md`), puis `list_projects` → `list_screens` → pour chaque écran validé, récupère le `htmlCode` (`get_screen`) et **écris-le dans `maquette/<ecran>.html`**.
- **(b) « J'ai une maquette ailleurs » (Figma, images, HTML)** → demande-lui de **déposer ses exports/captures dans `maquette/`** (un fichier par écran). Tu t'en serviras de référence visuelle.
- **(c) « Je n'ai pas de maquette »** → on la crée :
  - Si le MCP Stitch est connecté : `generate_screen_from_text` (skill `stitch::generate-design`) → itère → importe le HTML dans `maquette/`.
  - **Sinon (pas de Stitch — cas par défaut)** : **génère toi-même des wireframes HTML/CSS sobres** (Tailwind CDN, gris/noir/blanc, pas de logique) directement dans `maquette/<ecran>.html`, un par écran porteur (entrée canonique, écran héros du flux le plus complexe, un overlay, la vue liste/dashboard). Appuie-toi sur les parcours **UJ-*** du PRD.

**Itère jusqu'à validation** : montre, applique les retours, recommence. Vrai aller-retour, pas un one-shot.

**Génère la galerie `maquette/index.html`** : une page qui liste chaque écran dans une `<iframe>` (titre + aperçu), pour valider toute la maquette d'un coup d'œil dans le navigateur.

> Stitch est un **bonus** (maquettes IA plus léchées), jamais un péage : sans clé, le chemin (c) par wireframes HTML produit exactement le même livrable (`maquette/*.html`) pour la Phase 6. Le skill **`design-md`** aligne `docs/design.md` (§2).

**2. Design system → `docs/design.md`** *(dérivé de la maquette validée)*
Charge les 5 skills design : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`. Extrais de la maquette DEUX volets :

**A. DESIGN.md — l'identité visuelle** *(format google-labs design.md)*
- *Frontmatter tokens* (machine) : `colors` (nom→hex), `typography` (fontFamily/size/weight/lineHeight), `rounded`, `spacing`, `components` (composant→tokens).
- *Marque & style* · *Couleurs* (rôle) · *Typographie* (rôles, échelle) · *Layout & espacements* (grille, breakpoints) · *Élévation* (ombres) · *Formes* (rayons) · *Composants* (specs par composant) · *À faire / à éviter*.
- shadcn/Tailwind : réfère les tokens par nom plutôt que de tout redéfinir.
> **Affiner la palette** (shadcn/Tailwind) : régler couleurs/typo/rayons sur **[tweakcn.com](https://tweakcn.com)** (gratuit, export variables CSS) → colle dans `globals.css` + les *tokens* de `docs/design.md`.

**B. EXPERIENCE.md — le comportement**
- *Fondation* (form-factor, système d'UI) · *Architecture de l'information* · *Voix & ton* (microcopy) · *Patterns de composants* + *d'état* (chargement/vide/erreur/succès) · *Primitives d'interaction* · *Plancher d'accessibilité* · *Flux clés* (parcours avec protagoniste nommé + climax).

→ **validation utilisateur** (la maquette **et** le `design.md`) avant la Phase 6.

---

## Phase 6 — Analyse de la maquette + domaines → Roadmap `docs/ROADMAP.md`

1. **Sélection des domaines** : lis `docs/DOMAINS.md` (le catalogue de la stack) et repère, dans le PRD, les **domaines métier** nécessaires (paiement, email, storage, analytics, erreurs, push, caméra, cartes, auto-update, licence…). Ajoute les secrets correspondants à `.env.example` et leurs commandes à `docs/SETUP-AI.md`. Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.
2. **Analyse la maquette validée** (`maquette/`) : lis les fichiers exportés et **liste chaque écran + chaque flux** qu'elle montre. C'est la **cible concrète** que le build doit réaliser — la roadmap existe pour rendre ces écrans réels.
3. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — **Fondations d'abord**, puis balaie les dimensions : Modèle de données, Auth, **réaliser chaque écran/flux de la maquette**, **chaque feature du PRD**, **domaines sélectionnés**, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs.
4. Chaque jalon = une **tranche verticale** avec une ligne **`✅ Ce que tu vois :`** — idéalement **l'écran de la maquette qui devient réel** dans l'app — et un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
5. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.

---

## Phase 7 — Mise en place du projet
1. Scaffold la stack choisie (`npm create convex …` / `create-expo-app` / `create-electron-app`).
2. **Complète** l'`AGENTS.md` existant (déjà généré avec la boucle et la règle design — ne l'écrase pas) : ajoute des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle de jouer `docs/SETUP-AI.md` (plugins/skills/MCP) et d'utiliser `docs/RUN.md` pour lancer l'app.
3. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive) et `docs/DREAM.md` (vide, avec en-tête).

## Fini quand
Les fichiers fondation existent + le projet est scaffoldé + `AGENTS.md` contient la boucle et la règle design. Ensuite : « pour tout construire dans l'ordre avec un visuel à chaque étape, lance `/build` ; pour une feature isolée, `/new-feature` ».
