# 🚀 Stack SaaS — Convex + TanStack Start + Better Auth

> Pour construire un **SaaS** : une application web où des utilisateurs créent un compte, se connectent, et utilisent ton service (dashboard, abonnements, données perso…).

**Les 3 briques :**
| Brique | Rôle | Analogie |
|---|---|---|
| **Convex** | Le backend : base de données + serveur + temps réel | Le cerveau et la mémoire |
| **TanStack Start** | Le front-end + le serveur web (les pages, la navigation) | Le visage et le squelette |
| **Better Auth** | L'authentification : comptes, connexion, sessions | Le portier |

Ces trois technos sont **conçues pour marcher ensemble** et il existe un **guide officiel qui les combine** (voir plus bas). Tout est en **TypeScript** de bout en bout.

---

## 1️⃣ Convex — le backend

**C'est quoi ?** Convex est un **backend tout-en-un** qui remplace à la fois ta base de données, ton serveur et ton code temps réel. Tu écris tout en **TypeScript** :
- Tes **données** vivent dans une base de données réactive.
- Tes **fonctions serveur** (queries pour lire, mutations pour écrire, actions pour appeler des services externes) tournent dans Convex — **pas de serveur à gérer**.

**Le super-pouvoir : la réactivité.** Comme un composant React réagit à un changement d'état, une query Convex **se met à jour toute seule** dès que la donnée change en base. Tu obtiens le **temps réel** (mises à jour en direct) **gratuitement**, sans configuration.

**Pourquoi c'est parfait pour débuter un SaaS :** tu n'assembles pas 10 outils (base + API + WebSockets + cache + cron + stockage). Tout est intégré, typé, et déployé pour toi. Convex inclut aussi : planificateur (cron/tâches de fond), stockage de fichiers, recherche plein-texte et vectorielle.

> **En une ligne vs Firebase/Supabase :** là où Firebase/Supabase te donnent une base à laquelle tu ajoutes du backend, Convex **fusionne base + backend + temps réel** dans un seul modèle où ton code TypeScript *est* la logique serveur.

**Démarrer :**
```bash
npm create convex@latest
# puis, pour lancer le backend de développement :
npx convex dev
```

---

## 2️⃣ TanStack Start — le front-end full-stack

**C'est quoi ?** Un **framework React full-stack** construit sur **TanStack Router + Vite**. Il te permet d'écrire le **front-end React** ET la **partie serveur** dans un seul projet :
- **SSR** (rendu côté serveur) + **streaming** → des pages rapides et bien référencées.
- **Server functions** (`createServerFn`) → des fonctions qui tournent sur le serveur mais que tu appelles depuis ton code client, avec des **types de bout en bout**. Plus besoin d'écrire une API REST à la main.
- **Routing 100 % type-safe** → tes routes, paramètres d'URL et liens sont vérifiés par TypeScript. **Énorme avantage en vibecoding** : l'IA fait beaucoup moins d'erreurs.

**C'est une alternative à Next.js**, dans la même famille (SSR, routes API, middleware), avec une approche « client-first » très typée.

> **Statut (mi-2026) :** TanStack Start est sur sa **ligne v1 stable** (version npm `latest` = `1.168.27`), utilisable en production et mise à jour en continu. Nuance : la page d'accueil de la doc affiche encore le libellé « Release Candidate ». À considérer comme **« v1, stable, qui évolue vite »**. → Réflexe vibecoding : demande à l'IA d'utiliser la **dernière version** et de se référer au `llms.txt`.

**Démarrer :**
```bash
npx @tanstack/cli@latest create
```
*(ou l'interface web « Builder » : https://tanstack.com/builder — en alpha)*

---

## 3️⃣ Better Auth — l'authentification

**C'est quoi ?** Un framework d'**authentification** complet en **TypeScript**, **agnostique** (marche avec React, TanStack Start, etc.). Au lieu de coder toi-même la gestion des comptes (long et risqué), tu obtiens **clé en main** :
- Email/mot de passe, **connexion sociale** (Google, GitHub, Apple… 40+ providers),
- **2FA** (double authentification), sessions, gestion des **organisations** (multi-utilisateurs, rôles, permissions).

**Self-hosted** : les données d'auth vivent dans **ta** base — tu restes propriétaire de tes utilisateurs, sans service tiers payant. Il **génère le schéma** d'auth tout seul, et a un **écosystème de plugins** (passkeys, magic links, SSO…).

**Pourquoi pour un SaaS débutant :** vs « rouler sa propre auth », tu évites les failles classiques et tu gagnes des semaines ; vs un service payant (Auth0/Clerk), c'est **gratuit, open-source, et tu gardes le contrôle**.

> Dans cette stack, Better Auth se branche à Convex via le **composant officiel `@convex-dev/better-auth`** (maintenu par Convex).

**CLI (setup composant Convex) :**
```bash
npx auth generate   # génère le schéma d'auth (Convex gère la base — pas de migrate séparé)
```

---

## 🔗 Assembler les trois (le chemin officiel)

Il existe un **guide officiel Convex Labs** qui monte **Convex + Better Auth + TanStack Start ensemble**. C'est **LA ressource à suivre** pour cette stack :

👉 **https://labs.convex.dev/better-auth/framework-guides/tanstack-start**

Chemin recommandé pour un débutant :
```bash
# 1. Créer le projet Convex + TanStack Start (template officiel)
npm create convex@latest -- -t tanstack-start

# 2. Ajouter Better Auth (composant Convex + lib) — respecte la version indiquée par la doc Convex
npm install @convex-dev/better-auth better-auth

# 3. Lancer le backend Convex (dans un terminal)
npx convex dev
# 4. Lancer le front (dans un autre terminal)
npm run dev
```

> ⚠️ Le composant Convex épingle une **version précise** de `better-auth` (ex. `~1.6.x`). Installe **la version indiquée par la doc Convex**, pas `better-auth@latest`.

**Autre option** : partir de l'exemple officiel **Trellaux** (un mini-Trello Convex + TanStack Start) :
```bash
npx gitpick TanStack/router/tree/main/examples/react/start-convex-trellaux start-convex-trellaux
```

---

## 📚 Documentation officielle (liens vérifiés)

### Convex
| Ressource | Lien |
|---|---|
| Docs principales | https://docs.convex.dev |
| Tous les quickstarts | https://docs.convex.dev/quickstart |
| Quickstart TanStack Start | https://docs.convex.dev/quickstart/tanstack-start |
| Guide client TanStack Start | https://docs.convex.dev/client/tanstack/tanstack-start/ |
| Tutoriel (app de chat en ~10 lignes) | https://docs.convex.dev/tutorial/ |
| Tarifs | https://www.convex.dev/pricing |
| GitHub | https://github.com/get-convex · helpers : https://github.com/get-convex/convex-helpers |

### TanStack Start
| Ressource | Lien |
|---|---|
| Overview | https://tanstack.com/start/latest/docs/framework/react/overview |
| Getting Started | https://tanstack.com/start/latest/docs/framework/react/getting-started |
| Quick Start | https://tanstack.com/start/latest/docs/framework/react/quick-start |
| Server Functions | https://tanstack.com/start/latest/docs/framework/react/guide/server-functions |
| Routing | https://tanstack.com/start/latest/docs/framework/react/guide/routing |
| Hébergement / déploiement | https://tanstack.com/start/latest/docs/framework/react/guide/hosting |
| Authentification | https://tanstack.com/start/latest/docs/framework/react/guide/authentication |
| GitHub (monorepo Router+Start) | https://github.com/TanStack/router |
| Exemples officiels | https://github.com/TanStack/router/tree/main/examples/react |

### Better Auth
| Ressource | Lien |
|---|---|
| Introduction | https://better-auth.com/docs/introduction |
| Installation | https://better-auth.com/docs/installation |
| Utilisation de base | https://better-auth.com/docs/basic-usage |
| Plugins | https://better-auth.com/docs/concepts/plugins |
| Connexion sociale (OAuth) | https://better-auth.com/docs/concepts/oauth |
| Base de données / adapters | https://better-auth.com/docs/concepts/database |
| Intégration TanStack Start | https://better-auth.com/docs/integrations/tanstack |
| Intégration Convex | https://better-auth.com/docs/integrations/convex |
| GitHub | https://github.com/better-auth/better-auth |
| **Composant Convex + Better Auth** | https://labs.convex.dev/better-auth · https://github.com/get-convex/better-auth |

---

## 🤖 Ressources IA — comment « donner cette stack » à Claude

C'est le cœur du vibecoding : plus tu donnes de contexte à l'IA, meilleur le résultat. Cette stack est **excellemment** outillée.

### A. Les `llms.txt` (résumé de la doc pour IA — téléchargés par le script)
| Techno | Court | Complet |
|---|---|---|
| Convex | https://www.convex.dev/llms.txt | https://docs.convex.dev/llms-full.txt |
| TanStack Start | https://tanstack.com/start/latest/llms.txt | *(pas de `llms-full` — utiliser le court)* |
| Better Auth | https://better-auth.com/llms.txt | *(pas de `llms-full` ; versions `.md` par page)* |

➡️ Lance **`bash scripts/download-ai-context.sh`** pour tout télécharger dans `ai-context/`.

### B. Les serveurs MCP (l'IA interroge la doc / ta base **en direct**) — voir `.mcp.json`
- **Convex MCP** : `npx -y convex@latest mcp start` — donne à l'IA l'accès à ton déploiement (tables, fonctions, logs). Doc : https://docs.convex.dev/ai/convex-mcp-server
- **Better Auth MCP** (doc en direct) : serveur `https://mcp.better-auth.com/mcp`. Doc : https://better-auth.com/docs/ai-resources/mcp

### C. Les skills / plugins officiels
- **Convex — plugin Claude Code officiel** :
  ```
  /plugin install convex@claude-plugins-official
  ```
  Puis `npm create convex@latest my-app`. Page : https://docs.convex.dev/ai/using-claude-code
  *(Pour Cursor : plugin `get-convex/convex-agent-plugins` — 18 règles + 6 skills + 2 agents.)*
- **Better Auth — skills officiels** :
  ```
  npx skills add better-auth/skills
  ```
  Page : https://better-auth.com/docs/ai-resources/skills
- **Convex — règles brutes** (à donner à n'importe quelle IA) : https://convex.link/convex_rules.txt (ou `.mdc` pour Cursor). Page IA : https://docs.convex.dev/ai

> ⚠️ **Piège TanStack Start :** le fichier `AGENTS.md` du dépôt GitHub de TanStack existe mais s'adresse aux **contributeurs du framework**, **PAS** à ton app. Ne le copie pas dans ton projet. Pour TanStack Start, utilise son **`llms.txt`** (ci-dessus).

### D. Le fichier de règles prêt à copier
Un **`AGENTS.md` combiné** pour cette stack est fourni : **`stacks/saas/AGENTS.md`**. Copie-le à la racine de ton projet → Claude Code et Cursor le lisent automatiquement.

> 🔒 **Avant de publier ton SaaS** : scan de sécurité + réduire tes coûts IA → [`guides/03-securite-et-couts.md`](../../guides/03-securite-et-couts.md) (dont un scan automatique à chaque Pull Request).

---

## 👉 Prochaine étape

Ouvre **`stacks/saas/prompts-de-demarrage.md`** pour les prompts prêts à copier-coller à ton IA, étape par étape.
