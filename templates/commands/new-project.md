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

## Phase 3 — Choix de la stack
Choisis parmi les 3 stacks du kit selon l'idée : SaaS (Convex+TanStack Start+Better Auth) / mobile (Expo+Convex) / desktop (Electron). Réutilise `stacks/<stack>/` (README + AGENTS.md + ai-context).

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

## Phase 5 — Design → `docs/design.md` (gate)

**Charge d'abord les 5 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`. Produis DEUX volets dans `docs/design.md` (le visuel et le comportement) :

**A. DESIGN.md — l'identité visuelle** *(format google-labs design.md)*
- *Frontmatter tokens* (machine) : `colors` (nom→hex), `typography` (fontFamily/size/weight/lineHeight), `rounded`, `spacing`, `components` (composant→tokens).
- *Marque & style* (posture esthétique, en prose) · *Couleurs* (rôle de chacune) · *Typographie* (rôles, échelle) · *Layout & espacements* (grille, breakpoints) · *Élévation & profondeur* (ombres) · *Formes* (rayons) · *Composants* (specs visuelles par composant) · *À faire / à éviter*.
- Si tu utilises shadcn/Tailwind : référence les tokens par nom plutôt que de tout redéfinir.

> **Créer le thème visuellement (option débutant, stack shadcn/Tailwind = SaaS)** : au lieu de tout décrire, l'utilisateur peut régler couleurs/typo/rayons sur **[tweakcn.com](https://tweakcn.com)** (éditeur de thème shadcn, gratuit, sans compte, preview live + contraste), puis **exporter les variables CSS**. Reprends cet export → écris-le dans les *tokens* de `docs/design.md` **et** dans le `globals.css` (ou l'équivalent Tailwind) → toute l'app est thémée. Propose-le explicitement.

**B. EXPERIENCE.md — le comportement**
- *Fondation* (form-factor, système d'UI) · *Architecture de l'information* · *Voix & ton* (microcopy) · *Patterns de composants* (comportement) · *Patterns d'état* (chargement/vide/erreur/succès) · *Primitives d'interaction* · *Plancher d'accessibilité* · *Flux clés* (parcours avec protagoniste nommé + moment climax).

Maquettes optionnelles (frontend-design / Pencil / Stitch / Figma) : 2-4 écrans porteurs seulement (entrée canonique, écran héros du flux le plus complexe, overlay porteur, vue liste/dashboard). → **validation utilisateur**.

---

## Phase 6 — Sélection des domaines + Roadmap exhaustive → `docs/ROADMAP.md`

1. **Sélection des domaines** : lis `docs/DOMAINS.md` (le catalogue de la stack) et repère, dans le PRD, les **domaines métier** nécessaires (paiement, email, storage, analytics, erreurs, push, caméra, cartes, auto-update, licence…). Ajoute les secrets correspondants à `.env.example` et leurs commandes à `docs/SETUP-AI.md`. Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.
2. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — parcours les dimensions : Fondations, Modèle de données, Auth, **chaque feature du PRD**, **domaines sélectionnés**, passe UI/design, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs. **Fondations d'abord**.
3. Chaque jalon = une **tranche verticale** avec une ligne **`✅ Ce que tu vois :`** (le résultat observable dans l'app) et un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
4. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.

---

## Phase 7 — Mise en place du projet
1. Scaffold la stack choisie (`npm create convex …` / `create-expo-app` / `create-electron-app`).
2. Écris `AGENTS.md` (+ copie `CLAUDE.md`) en y intégrant : `templates/agents/loop-section.md` (la boucle), `templates/agents/design-rule.md` (règle design), les règles mémoire, et des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle de jouer `docs/SETUP-AI.md` (plugins/skills/MCP) et d'utiliser `docs/RUN.md` pour lancer l'app.
3. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive) et `docs/DREAM.md` (vide, avec en-tête).

## Fini quand
Les fichiers fondation existent + le projet est scaffoldé + `AGENTS.md` contient la boucle et la règle design. Ensuite : « pour tout construire dans l'ordre avec un visuel à chaque étape, lance `/build` ; pour une feature isolée, `/new-feature` ».
