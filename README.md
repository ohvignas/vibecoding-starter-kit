<p align="center">
  <img src=".github/assets/hero.svg" alt="Vibecoding Starter Kit — l'environnement de dev IA niveau pro, pour débutants" width="100%">
</p>

<p align="center">
  <a href="#-démarrage-rapide"><strong>Démarrage rapide »</strong></a>
  ·
  <a href="#-comment-ça-marche">Comment ça marche</a>
  ·
  <a href="guides/glossaire.md">📖 Glossaire du vibecodeur</a>
  ·
  <a href="https://github.com/ohvignas/vibecoding-starter-kit/issues">Signaler un bug</a>
</p>

<p align="center">
  <a href="https://github.com/ohvignas/vibecoding-starter-kit/actions"><img src="https://img.shields.io/github/actions/workflow/status/ohvignas/vibecoding-starter-kit/ci.yml?branch=main&label=tests" alt="Tests"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ohvignas/vibecoding-starter-kit" alt="Licence"></a>
  <img src="https://img.shields.io/badge/Node-%E2%89%A520.12-339933?logo=node.js&logoColor=white" alt="Node">
  <img src="https://img.shields.io/badge/Cursor%20·%20Claude%20Code%20·%20Codex-support%C3%A9-2b7fff" alt="Assistants">
  <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-bienvenues-brightgreen.svg" alt="PRs bienvenues"></a>
</p>

---

Ce dépôt fait deux choses : c'est un **kit pour débutants** de la formation **Vibe Coding** (3 stacks expliquées + le contexte à donner à l'IA), **et** un **installeur (wizard interactif)** qui génère un environnement de développement complet — 9 commandes, mémoire persistante, revue de code, CI, filet de sécurité — pour **Cursor, Claude Code et Codex**.

> [!TIP]
> Pas besoin de choisir un seul assistant : l'installeur configure celui que tu utilises, et le projet reste **portable** (les mêmes règles marchent partout).

<details>
<summary><strong>📑 Table des matières</strong></summary>

- [Pourquoi ce projet](#-pourquoi-ce-projet)
- [Fonctionnalités](#-fonctionnalités)
- [Démarrage rapide](#-démarrage-rapide)
- [Comment ça marche](#-comment-ça-marche)
- [Les commandes](#-les-commandes)
- [Les 3 stacks](#-les-3-stacks)
- [Ce qui est généré](#-ce-qui-est-généré)
- [Mémoire & dream hook](#-mémoire--dream-hook)
- [Structure du dépôt](#-structure-du-dépôt)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

</details>

## 💡 Pourquoi ce projet

Le vibecoding — décrire ce qu'on veut à une IA qui code — marche **si l'IA a le bon contexte**. Seule, elle invente des fonctions périmées, oublie les décisions, code des UI hors-charte. Ce kit fournit les **rails** : règles de stack officielles, mémoire qui ne s'oublie pas, boucle de livraison disciplinée, revue de code et de sécurité — tout posé **automatiquement** pour l'assistant de l'élève.

Résultat : un débutant obtient un environnement de dev **niveau pro** sans savoir le configurer.

## ✨ Fonctionnalités

| | Fonctionnalité | Ce que ça fait |
|---|---|---|
| 🚀 | **9 commandes** | `/new-project`, `/build`, `/new-feature`, `/edit-design`, `/doctor`, `/next`, `/sos`, `/debug`, `/deploy` — tout le cycle de vie |
| 🧩 | **Environnement par stack** | selon la stack, le projet est câblé auto avec les **plugins + MCP + skills + hooks** du framework (`.mcp.json` mergé, checks warn-only, `docs/SETUP-AI.md` joué par l'IA) |
| 💳 | **Catalogue de domaines** | paiement (Stripe/Polar…), email, storage, analytics, erreurs, push, cartes… **choisis d'après le PRD** (`docs/DOMAINS.md`) — pas tout d'un coup |
| 🧠 | **Mémoire auto-croissante** | `docs/memory/` nourri à chaque session, rechargé au démarrage (+ le **prochain jalon roadmap**) → l'IA ne refait pas ses erreurs et sait où elle en est |
| 🌙 | **Dream hook** | GitHub Action qui analyse les commits et **propose** features/bugs/idées (propose-only) |
| 🛡️ | **Revue + sécu** | Subagents `code-reviewer` + `security-reviewer`, scan de secrets, CI, hook pre-commit |
| 🤖 | **Multi-assistant** | Cursor (règles `.mdc` typées + commandes + hooks sécu + Bugbot), Claude Code (CLAUDE.md + skills), Codex (AGENTS.md) |
| 🎨 | **Maquette-first** | ta maquette **Stitch** (importée), ta maquette **existante** (déposée), ou **l'IA la dessine** (wireframes) ; la **roadmap découle de la maquette validée** — le build réalise ce que tu as **dessiné**, pas une interprétation du PRD |
| 🎓 | **Mode apprentissage** | l'IA **explique** ce qu'elle construit et te pose **une question de compréhension** à chaque jalon — tu comprends, tu ne subis pas |
| 📐 | **Planif à fond** | PRD + tech spec + design (tokens via `design.md`, palette via [tweakcn](https://tweakcn.com)) détaillés avant la moindre ligne de code |
| 🆘 | **Filet de sécurité** | perdu → `/next` ; ça casse → `/sos` (revenir au dernier point vert) ; **règle des 3 essais** anti-boucle infernale ; tags git par jalon |
| 🚫 | **Anti-flemme** | l'IA **finit le travail** : zéro placeholder / `// TODO` / stub, zéro report « plus tard » ; « fini » = **vérifié** (test vert + résultat à l'écran). Règle non négociable dans `AGENTS.md` + `.cursor/rules/` |
| 🪟 | **Fiable & multi-OS** | le wizard fait un `git init` + hooks actifs + commit initial ; rapport honnête (jamais d'écrasement) ; **testé en CI sur Windows/macOS/Linux × Node 20.12/22** |
| 🔄 | **Mise à jour** | `node scripts/update.mjs` récupère les nouveautés du kit dans un projet existant, **sans toucher à ton travail** |

## ⚡ Démarrage rapide

**1. Installe le kit** — dans un dossier vide *(publié sur npm ✅)* :

```bash
npm create vibecoding-kit@latest
```

> **Prérequis : Node.js ≥ 20.12 + git.** Le wizard demande stack/assistant/nom (+ Convex cloud/local) et pose **tout** — fichiers, hooks, règles, commandes, mémoire, CI — et **installe les skills** (design + stack). Il peut demander un **code d'accès** (reçu par email) : appuie sur **Entrée** pour passer, jamais bloquant.

**2. Ouvre ton assistant IA** dans le dossier du projet et **colle le prompt affiché par le wizard** (aussi sauvé dans `COLLE-MOI-DANS-L-IA.md`)

Ton assistant te guide pour les **2 seuls gestes manuels** : installer le plugin **superpowers** (`/add-plugin superpowers`) et autoriser les **MCP** (`/mcp`). Les skills, eux, sont déjà installés par le wizard. Ensuite, lance :

```
/new-project
```

> [!TIP]
> La liste exacte des plugins/MCP à cocher est dans **`docs/SETUP-AI.md`**. Tout le reste est déjà posé.

> [!NOTE]
> **Windows** : lance avec `node` (pas de script `.sh`). Les hooks Git tournent sous **Git Bash**. Prérequis : Node.js ≥ 20.12 + git.

<details>
<summary>Préfères-tu tout comprendre à la main ? (chemin débutant)</summary>

Clone le dépôt, lis [`guides/01-comment-parler-a-l-IA.md`](guides/01-comment-parler-a-l-IA.md), puis choisis ta stack dans [`stacks/`](stacks/). Chaque stack a un README débutant + un `AGENTS.md` à copier + des prompts prêts à coller.

Un mot te bloque ? Le **[glossaire du vibe coding](guides/glossaire.md)** explique tout le vocabulaire (LLM, MCP, stack, MVP, hook…) simplement.

</details>

## 🔍 Comment ça marche

<p align="center">
  <img src=".github/assets/wizard.svg" alt="Aperçu du wizard : il génère AGENTS.md, .cursor/, docs/, CI et subagents, installe les skills, puis tu lances /new-project et /build" width="820">
</p>

```mermaid
flowchart TD
    A["Tu lances : npm create vibecoding-kit (ou node scripts/setup.mjs)"] --> C{"Réponds : stack ? assistant ? nom ? Convex cloud/local ?"}
    C --> D["setup.mjs génère l'environnement"]
    D --> E1["Cursor : .cursor/commands + rules .mdc + hooks + BUGBOT"]
    D --> E2["Claude Code : CLAUDE.md + .claude/skills"]
    D --> E3["Codex : AGENTS.md + docs/commands"]
    E1 --> F["Skills (design + stack) + hooks + mémoire + dream + CI + subagents posés auto"]
    E2 --> F
    E3 --> F
    F --> G0["Gestes manuels : installe superpowers (/add-plugin) + autorise /mcp"]
    G0 --> G["Dans ton assistant : /new-project « ton idée »"]
    G --> M["Maquette (Stitch) : crée → itère → valide"]
    M --> R["Roadmap dérivée de la maquette (chaque écran = un jalon)"]
    R --> H["/build : jalon par jalon, comparé à la maquette (visuel à chaque étape)"]
    H -.->|jalon suivant| H
```

Le **pilote** est la boucle [superpowers](https://github.com/obra/superpowers) : `brainstorm → plan → exécution (sub-agents, TDD) → review → test live → sécu → commit → PR → CI → merge`. Elle est écrite dans l'`AGENTS.md`/`CLAUDE.md` généré, toujours en contexte.

## 🎛️ Les commandes

| Commande | Rôle |
|---|---|
| **`/new-project`** | La fondation : interview → **PRD** + **tech spec** + **maquette** (créée/itérée sur **Stitch**, ou la tienne) + **design system** (`design.md`) + **domaines** + **roadmap dérivée de la maquette** (chaque jalon = un écran qui devient réel) |
| **`/build`** | Construit la roadmap **jalon par jalon** (subagent-driven, TDD) en **relançant la vraie app à chaque étape** et en la **comparant à la maquette** — tu vois ton produit grandir. Gate « on continue ? » ou « enchaîne tout » |
| **`/new-feature`** | La livraison d'une feature isolée : **story + critères d'acceptation** → build TDD → **test live** → sécu → commit → PR → CI → merge sur `dev` |
| **`/edit-design`** | Charge les **5 skills design** + `design.md` **avant** de toucher l'UI |
| **`/doctor`** | Auto-diagnostic : fichiers présents, **MCP de la stack** OK, hooks câblés, **aucun secret commité**, `.gitignore` correct |
| **`/next`** | « Je fais quoi maintenant ? » — l'IA lit l'état du projet et te donne ta **prochaine action** |
| **`/sos`** | Quelque chose casse : diagnostic **rassurant** + 3 sorties (réparer / mettre de côté / revenir au dernier point vert) |
| **`/debug`** | Débogage **méthodique** (reproduire → isoler → hypothèse → fix minimal → vérifier), avec la règle des 3 essais |
| **`/deploy`** | Mettre l'app **en ligne** selon la stack (Convex + Vercel/Netlify · Expo EAS · electron-builder) — secrets prod jamais commités |

Chaque commande est livrée au bon format : **commandes Cursor** (`.cursor/commands/`, typables au clavier), **commandes Claude Code** (`.claude/commands/`), ou référencée dans `AGENTS.md` (Codex).

> [!TIP]
> **Après l'install** : `/doctor` doit dire « ✅ ton environnement est prêt » avant de lancer `/new-project`. **Maîtrise tes coûts IA** → [`docs/COUTS.md`](docs/COUTS.md). **Récupérer les nouveautés du kit** dans un projet existant → `node <kit>/scripts/update.mjs` (ne touche jamais à ton travail).

> [!TIP]
> **Déjà un projet Cursor et tu veux juste les commandes ?** Installe le **plugin Cursor** `vibecoding` (`/add-plugin`, via une Team Marketplace ou la marketplace Cursor) — tu obtiens les 9 commandes + la règle de base sans rien scaffolder. Le plugin est dans [`cursor-plugin/`](cursor-plugin/) (voir [`PUBLISH.md`](PUBLISH.md)). Pour un **nouveau** projet complet, préfère `npm create vibecoding-kit`.

## 🧱 Les 3 stacks

| Type d'app | Stack |
|---|---|
| 💻 **SaaS / web** | Convex + TanStack Start + Better Auth |
| 📱 **Mobile iOS/Android** | React Native (Expo) + Convex |
| 🖥️ **Desktop** | Electron |

Chaque stack : explication débutant, **docs officielles vérifiées**, `AGENTS.md`, `llms.txt` téléchargeables (`ai-context/`), et un **exemple de feature** (`docs/examples/`).

## 📦 Ce qui est généré

<details>
<summary>Voir l'arbre d'un projet généré (assistant Claude Code)</summary>

```text
mon-app/
├── AGENTS.md · CLAUDE.md          # règles + boucle + @import mémoire (toujours les deux)
├── .claude/
│   ├── commands/                  # /new-project /build /new-feature /edit-design /doctor
│   ├── settings.json              # hooks PostToolUse → checks framework (warn-only)
│   ├── skills/stack-*             # règles de la stack
│   └── agents/                    # code-reviewer + security-reviewer
├── docs/
│   ├── SETUP-AI.md                # plugins/skills/MCP à installer (joué par l'IA)
│   ├── DOMAINS.md                 # catalogue des capacités métier de la stack
│   ├── ROADMAP.md                 # jalons (✅ ce que tu vois) — piloté par /build
│   ├── RUN.md                     # comment lancer l'app + ce que tu dois voir
│   ├── memory/                    # index + gotchas/conventions/decisions/archive
│   └── DREAM.md · examples/ · ONBOARDING.md
├── .github/workflows/             # ci · secrets (gitleaks) · dream · memory-consolidate
├── .githooks/                     # pre-commit (secrets+lint) · pre-push (sécu) · checks.mjs
├── ai-context/                    # llms.txt officiels
├── .env.example · .gitignore · .mcp.json   # MCP mergé par stack
└── maquette/
```
_(Cursor à la place : `.cursor/commands/` (mêmes slash-commands) · `.cursor/rules/*.mdc` typées (auto-attachées par framework) · `.cursor/hooks.json` + `.cursor/hooks/` (mémoire + `guard-shell` sécu) · `.cursor/BUGBOT.md` (review PR) · `.cursor/environment.json` (dev reproductible) · `.cursorignore` + `.cursorindexingignore`.)_

</details>

## 🧠 Mémoire & dream hook

- **Mémoire** — un « cerveau du projet » dans `docs/memory/` : dès que l'IA découvre un piège, elle l'écrit ; au démarrage, un **hook Cursor** le réinjecte. Une Action hebdo **consolide** (dédoublonne, archive).
- **Dream hook** — une GitHub Action (toutes les 4 h) analyse les derniers commits et **propose** features / bugs / améliorations dans `docs/DREAM.md`.

> [!IMPORTANT]
> Le dream hook est **propose-only** : il n'écrit que dans `docs/DREAM.md`, ne commit/merge **jamais** de code. C'est toi qui tries.

## 🗂️ Structure du dépôt

```text
vibecoding-starter-kit/
├── guides/            # comment parler à l'IA · installer les outils · sécurité & coûts
├── stacks/            # saas · mobile · desktop (README + AGENTS.md + prompts)
├── ai-context/        # llms.txt + règles officielles (via scripts/download-ai-context.sh)
├── playbook/          # le runbook que l'IA suit pour installer
├── templates/         # commandes, agents, mémoire, dream, CI, env, exemples
├── scripts/           # setup.mjs (moteur) + lib/ (testé, node --test)
└── docs/superpowers/  # specs & plans (design du système)
```

## 🤝 Contribuer

Les tests tournent sans dépendance :

```bash
git clone https://github.com/ohvignas/vibecoding-starter-kit.git
cd vibecoding-starter-kit
node --test        # toute la suite
```

Les specs/plans du système sont dans [`docs/superpowers/`](docs/superpowers/). PRs bienvenues.

## 📄 Licence

Distribué sous licence **MIT** — voir [`LICENSE`](LICENSE).

> Structures de templates (PRD, architecture, story) adaptées de [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (MIT). `DESIGN.md` d'après [google-labs-code/design.md](https://github.com/google-labs-code/design.md) (Apache-2.0). Boucle de dev : [superpowers](https://github.com/obra/superpowers).

---

<p align="center">
  Fait avec ❤️ pour la formation <strong>Vibe Coding</strong> · par <a href="https://github.com/ohvignas">@ohvignas</a>
</p>
