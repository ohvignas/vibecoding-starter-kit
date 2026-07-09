<h1 align="center">📖 Glossaire du Vibe Coding</h1>

<p align="center">
  Tous les mots que tu croiseras en construisant avec l'IA — expliqués simplement, pour débutant·e.
</p>

---

> [!TIP]
> **Tu débutes ? Commence par ces 5 mots :** [Vibe Coding](#vibe-coding) · [LLM](#llm-large-language-model) · [Prompt](#prompt) · [Stack](#stack) · [MVP](#mvp-minimum-viable-product). Le reste viendra en construisant.

**Comment lire ce glossaire** — chaque terme a une définition en une ou deux phrases, un **exemple concret**, et parfois un lien vers la doc du kit. Organisé en 6 catégories, pas par ordre alphabétique (on va du plus fondamental au plus pointu).

- [1. Fondamentaux de l'IA](#1--fondamentaux-de-lia)
- [2. Le kit & ses commandes](#2--le-kit--ses-commandes)
- [3. Stacks & outils](#3--stacks--outils)
- [4. Capacités métier (domaines)](#4--capacités-métier-domaines)
- [5. Business & produit](#5--business--produit)
- [6. Sécurité](#6--sécurité)

---

## 1. 🧠 Fondamentaux de l'IA

- <a id="vibe-coding"></a>**Vibe Coding** — Construire un logiciel en **décrivant en langage naturel** ce qu'on veut à une IA qui écrit le code, plutôt qu'en tapant chaque ligne soi-même. Le rôle humain devient : cadrer, valider, corriger. *Ex. : « crée-moi une page de connexion » → l'IA génère le code, tu vérifies qu'il marche.*
- <a id="llm-large-language-model"></a>**LLM (Large Language Model)** — Un « grand modèle de langage » entraîné sur des milliards de mots, capable de comprendre et générer du texte et du code. *Ex. : Claude (Anthropic), GPT (OpenAI), Gemini (Google). Le kit vise les modèles Claude les plus récents.*
- <a id="prompt"></a>**Prompt** — L'**instruction en langage naturel** que tu donnes à l'IA. Un bon prompt est précis et contextualisé. *Ex. : « Ajoute un bouton “Payer” qui ouvre Stripe » est un meilleur prompt que « fais le paiement ».*
- **Prompt engineering** — L'art d'écrire des prompts efficaces (contexte, exemples, contraintes) pour obtenir un meilleur résultat. *Ex. : donner à l'IA les règles de la stack avant de lui demander du code.*
- **Token** — L'unité de texte que lit/écrit un LLM (≈ un bout de mot). On facture et on limite en tokens. *Ex. : « bonjour » ≈ 2 tokens ; un mot français ≈ 1,3 token.*
- **Fenêtre de contexte (context window)** — La quantité de texte (en tokens) que l'IA peut « avoir en tête » d'un coup. Au-delà, elle oublie le début. *Ex. : c'est pour ça que le kit réinjecte la [mémoire](#mémoire) et le [prochain jalon](#roadmap) à chaque session.*
- **Agent** — Une IA qui ne se contente pas de répondre : elle **agit** (lit des fichiers, lance des commandes, écrit du code) en boucle jusqu'à finir une tâche. *Ex. : l'assistant qui exécute `/build` est un agent.*
- <a id="subagent"></a>**Subagent (sous-agent)** — Un agent secondaire lancé par l'agent principal pour une tâche isolée, avec son propre contexte. *Ex. : le kit lance un sous-agent `code-reviewer` pour relire un diff sans polluer le contexte principal.*
- **Multi-agent** — Une architecture où **plusieurs agents spécialisés** collaborent (un qui code, un qui relit, un qui teste). *Ex. : la boucle du kit = implémenteur + reviewer + fixer.*
- <a id="mcp"></a>**MCP (Model Context Protocol)** — Un **standard** qui permet à l'IA de se brancher à des services externes (base de données, docs, Stripe…) via des « serveurs MCP ». *Ex. : le serveur MCP Convex laisse l'IA lire tes tables en direct. Voir [`docs/SETUP-AI.md`](../templates/) généré.*
- <a id="skill"></a>**Skill** — Un **mode d'emploi réutilisable** qu'on charge dans l'IA pour une compétence précise (ex. règles d'un framework, méthode de design). *Ex. : le skill `stack-saas` apprend à l'IA les règles Convex + TanStack + Better Auth.*
- <a id="hook"></a>**Hook** — Un **déclencheur automatique** : une commande qui tourne à un moment donné (à l'édition d'un fichier, avant un commit…). *Ex. : le kit câble un hook qui lance `tsc` (vérif des types) après chaque édition, en avertissement.*
- **RAG (Retrieval-Augmented Generation)** — Technique où l'IA **va chercher des documents** pertinents avant de répondre, pour être plus exacte et à jour. *Ex. : brancher les `llms.txt` officiels d'un framework pour que l'IA ne cite pas d'API périmée.*
- **Hallucination** — Quand l'IA **invente** une information fausse mais crédible (une fonction qui n'existe pas, une URL bidon). *Ex. : le kit réduit ça en donnant les docs officielles et en vérifiant en live.*

## 2. 🛠️ Le kit & ses commandes

- <a id="wizard"></a>**Wizard (assistant d'installation)** — La commande interactive `node scripts/setup.mjs` qui te **pose les questions** (stack, assistant, nom…) et installe l'environnement. C'est **toi** qui choisis, pas l'IA. *Ex. : évite que l'IA parte sur la mauvaise stack toute seule.*
- **`/new-project`** — La commande qui **pose la fondation** d'un projet : interview → PRD + tech spec + **maquette** (créée/itérée sur Stitch, ou la tienne) + design system + domaines + **roadmap dérivée de la maquette**. *Ex. : `/new-project "un SaaS de réservation pour coiffeurs"`.*
- **`/build`** — La commande qui **construit la roadmap jalon par jalon** (plan → code TDD → relance l'app, **comparée à la maquette** → jalon suivant). *Ex. : tu vois ton produit grandir, écran par écran.*
- **`/new-feature`** — La commande qui **livre une fonctionnalité isolée** : story + critères d'acceptation → build → test live → sécu → merge. *Ex. : `/new-feature "l'utilisateur voit ses rendez-vous"`.*
- **`/edit-design`** — Charge les **5 skills de design** + le `design.md` avant de toucher à l'interface. *Ex. : pour garder une UI cohérente et pro.*
- **`/doctor`** — **Auto-diagnostic** du projet : fichiers présents, MCP OK, hooks câblés, aucun secret commité. *Ex. : « pourquoi ça marche pas ? » → lance `/doctor`.*
- <a id="plugin"></a>**Plugin / `/add-plugin`** — Un **module qui ajoute des capacités** à ton assistant IA. Le kit en utilise un : **superpowers** (la boucle brainstorm→plan→TDD→review). Tu l'installes une fois en tapant `/add-plugin superpowers` (Cursor) dans le chat. *Ex. : après l'install, la commande `/brainstorm` devient disponible.*
- **`/next`** — La commande **GPS** : quand tu es perdu, elle lit où tu en es et te dit ta prochaine action. *Ex. : tu reviens après 3 jours → `/next` te remet sur les rails.*
- **`/sos`** — Le **bouton panique** : quelque chose casse, l'IA diagnostique calmement et propose 3 sorties (réparer / mettre de côté / revenir au dernier point qui marchait). *Ex. : « rien ne s'affiche » → `/sos`.*
- <a id="doom-loop"></a>**Doom loop (boucle infernale)** — Quand l'IA corrige un bug, en crée un autre, re-corrige… sans fin. Le kit l'empêche avec la **règle des 3 essais** (3 échecs → on s'arrête, on revient au dernier point vert). *Ex. : c'est la cause n°1 d'abandon — le kit te protège.*
- <a id="placeholder"></a>**Placeholder / code à moitié** — Quand l'IA laisse un trou : `// TODO`, `// reste du code`, `...`, ou une fonction vide qui fait semblant. Le kit l'**interdit** (règle « finir le travail / anti-flemme » dans `AGENTS.md` + `.cursor/rules/`) : chaque fonction est écrite en entier, rien n'est reporté, et « fini » = **vérifié**. *Ex. : plus de « je te laisse compléter » — l'IA termine ou dit précisément ce qui la bloque.*
- **Mode apprentissage** — Réglage (par défaut activé) où l'IA **explique ce qu'elle fait** et te pose **une question de compréhension** à chaque jalon. *Ex. : tu apprends en construisant au lieu de copier sans comprendre.*
- <a id="prd"></a>**PRD (Product Requirements Document)** — Le **document qui décrit le produit** : vision, utilisateurs, fonctionnalités, ce qu'on ne fait PAS. La source de vérité du projet. *Ex. : généré et validé avant la moindre ligne de code.*
- **Tech spec (spécification technique)** — Le **plan d'architecture** : les décisions durables (pattern, conventions, modèle de données) qu'un futur développeur ne peut pas deviner. *Ex. : « les erreurs ont toujours cette forme », « l'auth passe par ici ».*
- <a id="roadmap"></a>**Roadmap** — La **liste ordonnée des jalons** à construire, fondations d'abord, chacun avec un résultat visible. Relue à chaque tour de `/build` pour ne rien oublier. *Ex. : jalon 0 = « l'app démarre » ; jalon 5 = « l'utilisateur paie ».*
- **Jalon (milestone)** — Une **tranche verticale** de la roadmap = un morceau qui livre un résultat **observable**. *Ex. : « ✅ Ce que tu vois : l'écran de connexion s'affiche ».*
- <a id="maquette"></a>**Maquette** — Le **dessin des écrans** de ton app **avant** de coder. Dans le kit c'est le **pivot** : tu la crées/itères (sur [Stitch](#stitch), ou tu fournis la tienne), tu la valides, puis la **roadmap en découle** — le build réalise ce que tu as dessiné. *Ex. : 4 écrans porteurs dans `maquette/`, puis chaque écran devient un jalon.*
- **Story & critères d'acceptation** — Une **story** décrit un besoin (« en tant que X, je veux Y ») ; les **critères d'acceptation** sont les conditions testables qui prouvent que c'est fait. *Ex. : AC-1 « quand je clique Payer, Stripe s'ouvre ».*
- <a id="mémoire"></a>**Mémoire (du projet)** — Un « cerveau » écrit (`docs/memory/`) que l'IA **nourrit** quand elle découvre un piège, et **relit** au démarrage — pour ne pas refaire ses erreurs. *Ex. : « ne pas utiliser `@latest` pour Better Auth ».*
- **Dream hook** — Une GitHub Action qui, toutes les quelques heures, analyse les commits et **propose** des idées/bugs dans `docs/DREAM.md` (propose-only, ne code jamais). *Ex. : « et si on ajoutait un rappel par email ? ».*
- **Scaffold (échafaudage)** — **Générer la structure de départ** d'un projet (dossiers, config, dépendances) automatiquement. *Ex. : `npm create convex` scaffolde un projet Convex prêt à coder.*
- **Worktree** — Une **copie de travail isolée** d'un dépôt git, pour bosser sur une feature sans polluer le reste. *Ex. : le kit crée un worktree par `/new-feature`.*
- <a id="tdd"></a>**TDD (Test-Driven Development)** — Écrire le **test d'abord** (rouge), puis le code qui le fait passer (vert). Garantit que chaque bout de code est vérifié. *Ex. : toute la boucle du kit est en TDD.*
- **Gate (barrière de validation)** — Un **point d'arrêt** où l'humain (ou un test) doit valider avant de continuer. *Ex. : le kit met une gate après le PRD et après le plan.*
- **CI (Intégration Continue)** — Un robot (GitHub Actions) qui **lance les tests à chaque push** pour attraper les régressions. *Ex. : le badge « tests » vert du README.*
- **Diff** — L'**ensemble des changements** entre deux versions du code (ce qui a été ajouté/retiré). *Ex. : le reviewer relit le diff, pas tout le projet.*

## 3. 🧱 Stacks & outils

- <a id="stack"></a>**Stack (pile technique)** — L'**ensemble des technologies** choisies pour construire une app (front + back + base + auth…). *Ex. : le kit propose 4 stacks selon le type d'app.*
- **SaaS / mobile / desktop / vitrine** — Les **4 types d'app** du kit : SaaS = web hébergé, mobile = iOS/Android, desktop = logiciel installable, vitrine = site web statique (portfolio, blog). *Ex. : « une app de réservation » → SaaS.*
- **Convex** — Un **backend réactif tout-en-un** (base de données + fonctions serveur + temps réel) en TypeScript, sans écrire de SQL. *Ex. : `useQuery` met à jour l'UI automatiquement quand la donnée change.*
- **Convex — déploiement cloud vs local** — En **cloud** (défaut) le backend tourne sur les serveurs Convex (compte gratuit) ; en **local** il tourne sur ta machine (zéro Docker, zéro compte, données dans `.convex/`). *Ex. : `npx convex deployment select local` pour du 100 % local.*
- **TanStack Start** — Un **framework React full-stack** (rendu serveur, routing typé, server functions). *Ex. : la partie « site web » de la stack SaaS.*
- **Better Auth** — Une **librairie d'authentification** open-source, branchée à Convex, où tes utilisateurs vivent dans **ta** base. *Ex. : connexion Google, sessions, 2FA, sans service tiers payant.*
- **Expo / React Native** — **React Native** = écrire des apps mobiles iOS+Android en React ; **Expo** = la boîte à outils qui simplifie tout (build, simulateur, mises à jour). *Ex. : `npx expo start` puis `i` pour ouvrir le simulateur iPhone.*
- **Simulateur / émulateur** — Un **faux téléphone** sur ton ordi pour tester l'app mobile : **simulateur** iOS (via Xcode), **émulateur** Android (via Android Studio). *Ex. : voir ton app sans avoir de vrai téléphone branché.*
- **Electron** — Un **framework pour apps desktop** (Windows/Mac/Linux) construites en web (HTML/CSS/JS) dans une fenêtre native. *Ex. : VS Code et Slack sont en Electron.*
- **TypeScript** — Du **JavaScript typé** : tu déclares le type des données, l'éditeur attrape les erreurs avant l'exécution. *Ex. : `tsc --noEmit` vérifie les types sans rien lancer.*
- **shadcn/ui** — Une **collection de composants React** (boutons, modales, tableaux) prêts à copier dans ton projet et à styliser. *Ex. : ajouter une belle boîte de dialogue en une commande.*
- **Tailwind CSS** — Un **framework CSS** où tu stylises directement avec des classes utilitaires (`p-4`, `text-center`) au lieu d'écrire du CSS séparé. *Ex. : mise en page rapide sans quitter le HTML.*
- <a id="stitch"></a>**Stitch (Google)** — Un **outil de design par IA, gratuit** (compte Google) : tu décris un écran, il le génère (HTML/CSS), tu itères. Le kit installe ses skills et l'utilise pour créer la [maquette](#maquette). *Ex. : « une page de connexion épurée » → un écran prêt à exporter dans `maquette/`.*
- **tweakcn** — Un **éditeur de thème visuel** gratuit pour shadcn/Tailwind : tu règles couleurs/typo/rayons avec preview live, puis tu **exportes les variables CSS** à coller dans ton projet. *Ex. : donner son identité visuelle à l'app sans écrire de CSS.*
- **git / GitHub** — **git** = l'outil qui versionne ton code (historique, branches) ; **GitHub** = l'hébergeur en ligne des dépôts git (+ PR, Actions). *Ex. : chaque étape qui marche = un commit git.*
- **Node.js** — L'**environnement qui exécute du JavaScript** hors navigateur (outils, serveurs, scripts). Prérequis du kit (≥ 20.12). *Ex. : `node scripts/setup.mjs` lance le wizard.*
- **npm / npx** — **npm** installe des paquets ; **npx** exécute un paquet sans l'installer durablement. *Ex. : `npx expo-doctor` lance un check sans rien garder.*

## 4. 💳 Capacités métier (domaines)

- **Domaine (capacité métier)** — Une **brique fonctionnelle** qu'une vraie app a souvent besoin (paiement, email, stockage…). Le kit les liste dans `docs/DOMAINS.md` et l'IA **pioche selon le PRD**. *Ex. : PRD parle d'« abonnement » → domaine paiement.*
- **Stripe** — Le service de **paiement en ligne** de référence (cartes, abonnements). *Ex. : encaisser 9 €/mois pour un SaaS.*
- **Polar / RevenueCat** — Alternatives selon le cas : **Polar** = paiement « marchand de référence » qui gère la TVA pour toi ; **RevenueCat** = **achats intégrés** (IAP) pour les apps mobiles. *Ex. : abonnement dans une app iPhone → RevenueCat.*
- **IAP (In-App Purchase)** — Le **système d'achat imposé par Apple/Google** pour le contenu numérique consommé dans une app mobile. *Ex. : débloquer une fonctionnalité premium dans l'app → obligatoirement IAP, pas Stripe.*
- **Resend / email transactionnel** — Envoyer des **emails automatiques** déclenchés par une action (confirmation, reset de mot de passe). *Ex. : « Ton compte est créé ✅ ».*
- **Storage (stockage de fichiers)** — Stocker et servir des **fichiers** (images, PDF, avatars). *Ex. : Convex File Storage, intégré, pour l'avatar d'un utilisateur.*
- **PostHog / analytics** — Mesurer **comment les gens utilisent** ton produit (pages vues, entonnoirs, feature flags). *Ex. : « combien d'utilisateurs finissent l'inscription ? ».*
- **Sentry / suivi d'erreurs** — Être **alerté quand ça plante en production**, avec la trace de l'erreur. *Ex. : « l'app a crashé pour 3 utilisateurs à 14h ».*
- <a id="seo"></a>**SEO (Search Engine Optimization)** — Faire en sorte que **Google** trouve et classe bien ton site : titres, descriptions, sitemap, vitesse. *La stack vitrine le fait par défaut.*
- <a id="geo"></a>**GEO (Generative Engine Optimization)** — Le SEO des **IA** : faire en sorte que ChatGPT, Perplexity ou Claude **citent ton site** dans leurs réponses. Outils : données structurées (JSON-LD) + un fichier `llms.txt` qui résume ton site pour les IA. *La stack vitrine le fait par défaut.*
- **Auth (authentification)** — Vérifier **qui est l'utilisateur** (connexion, session, permissions). *Ex. : « seul le propriétaire voit ses rendez-vous ».*
- **API (Application Programming Interface)** — Une **interface** qui laisse deux logiciels communiquer, souvent via REST ou GraphQL. *Ex. : ton front demande les données au backend via une API.*
- **CRUD** — Les 4 opérations de base sur des données : **C**réer, **L**ire (Read), **M**ettre à jour (Update), **S**upprimer (Delete). *Ex. : un carnet de rendez-vous = du CRUD.*
- **Webhook** — Une **notification automatique** qu'un service externe envoie à ton app quand un événement arrive. *Ex. : Stripe appelle ton webhook quand un paiement réussit.*
- **Push (notification)** — Un **message envoyé sur le téléphone** même app fermée. *Ex. : « Ton rendez-vous est dans 1h ».*

## 5. 📈 Business & produit

- <a id="mvp-minimum-viable-product"></a>**MVP (Minimum Viable Product)** — La **version minimale** d'un produit avec **une seule fonctionnalité clé**, juste assez pour tester si ça intéresse des gens. *Ex. : lancer avec « prendre un rendez-vous » avant d'ajouter les rappels, la facturation, etc.*
- **Micro-SaaS** — Un petit logiciel en abonnement visant une **niche** (quelques centaines à milliers d'utilisateurs), souvent porté par une seule personne. *Ex. : un outil de réservation pour salons de coiffure indépendants.*
- **MRR (Monthly Recurring Revenue)** — Le **revenu récurrent mensuel** : la métrique reine d'un SaaS. *Ex. : 100 abonnés × 9 € = 900 € de MRR.*
- **ARR (Annual Recurring Revenue)** — Le **revenu récurrent annuel** (≈ MRR × 12), utilisé pour valoriser une boîte. *Ex. : 900 € de MRR → 10 800 € d'ARR.*
- **Churn (attrition)** — Le **taux de clients qui partent** chaque mois. Un micro-SaaS sain vise < 5 %. *Ex. : sur 100 abonnés, 5 se désabonnent ce mois-ci = 5 % de churn.*
- **Déploiement (deploy)** — **Mettre l'app en ligne** pour de vrais utilisateurs. *Ex. : `npx convex deploy` pour le backend + un hébergeur pour le front.*
- **Self-host (auto-hébergement)** — Héberger un service **sur ton propre serveur** au lieu du cloud du fournisseur. *Ex. : self-host le backend Convex via Docker (avancé).*

## 6. 🛡️ Sécurité

- **Secret** — Une **valeur sensible** (clé API, mot de passe, token) qui ne doit **jamais** être commitée ni mise dans le code client. *Ex. : `STRIPE_SECRET_KEY` va dans les variables d'environnement, pas dans le code.*
- **Scan de secrets** — Un outil qui **cherche les secrets** accidentellement commités et bloque. *Ex. : le hook pre-commit + gitleaks en CI du kit.*
- **Variable d'environnement (`.env`)** — Un endroit **hors du code** pour ranger la config sensible, non commité. *Ex. : `.env.local` pour l'URL Convex ; les secrets d'auth vont dans l'env Convex.*
- **SAST vs DAST** — **SAST** = analyse **statique** (lit le code sans l'exécuter) ; **DAST** = analyse **dynamique** (attaque l'app qui tourne). *Ex. : le kit fait du SAST ; un pentest comme Strix fait du DAST.*
- **Electronegativity** — Un **linter de sécurité pour Electron** qui repère les mauvaises configs (nodeIntegration, CSP manquante…). *Ex. : lancé en pre-push sur la stack desktop.*
- **Pentest (test d'intrusion)** — Simuler une **attaque** pour trouver les failles avant les vrais attaquants. **Uniquement sur une app que tu possèdes.** *Ex. : un agent comme Strix qui exploite pour valider une vulnérabilité.*
- **contextIsolation** — Un réglage **de sécurité Electron** qui isole le code de la page du système, pour qu'une faille web ne prenne pas le contrôle de la machine. *Ex. : activé par défaut dans un projet desktop bien configuré.*
- **Revue de code (code review)** — Faire **relire les changements** (par un humain ou un sous-agent) pour attraper bugs et failles avant de merger. *Ex. : le sous-agent `code-reviewer` du kit.*

---

<p align="center">
  Il manque un terme ? <a href="https://github.com/ohvignas/vibecoding-starter-kit/issues">Ouvre une issue</a> — ce glossaire grandit avec la formation.
</p>
