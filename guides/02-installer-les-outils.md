# Installer les outils (prérequis communs à toutes les stacks)

> À faire **une seule fois** sur ta machine, avant de commencer n'importe quel projet.

Tu vas installer 4 choses : **Node.js** (le moteur), un **éditeur de code**, un **assistant IA**, et **Git** (les sauvegardes). Compte 15-20 minutes.

---

## 1. Node.js (obligatoire pour tout)

Node.js exécute le JavaScript/TypeScript sur ta machine. Toutes nos stacks en dépendent.

- Va sur **https://nodejs.org** et installe la version **LTS** (le gros bouton de gauche).
- Vérifie dans un terminal :
  ```bash
  node --version   # doit afficher v20 ou plus
  npm --version    # doit afficher un numéro
  ```

> `npm` (livré avec Node) sert à installer des librairies et à lancer les commandes de création de projet (`npm create ...`).

---

## 2. Un éditeur de code

Deux options, choisis-en **une** :

- **Cursor** (recommandé pour débuter en vibecoding) — un éditeur avec l'IA intégrée. https://cursor.com
- **VS Code** — l'éditeur gratuit de référence. https://code.visualstudio.com (tu y ajouteras l'IA à côté).

---

## 3. Ton assistant IA

- **Cursor** : l'IA est déjà dedans (raccourci pour chatter avec le code : `Cmd/Ctrl + L`).
- **Claude Code** : l'assistant en ligne de commande d'Anthropic. Installe-le :
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```
  Puis, dans le dossier de ton projet, lance :
  ```bash
  claude
  ```
  Claude Code lit automatiquement les fichiers `CLAUDE.md`, les **skills** (`.claude/skills/`) et la config MCP (`.mcp.json`) de ton projet — c'est exactement ce que fournit ce dépôt.

> Tu peux utiliser **les deux** : Cursor pour éditer visuellement, Claude Code dans le terminal pour les grosses tâches.

---

## 4. Git (les sauvegardes — ne saute pas cette étape)

Git enregistre l'historique de ton projet. C'est ta machine à remonter le temps quand l'IA casse quelque chose.

- **Mac** : `git` est souvent déjà là. Sinon : installe [Homebrew](https://brew.sh) puis `brew install git`.
- **Windows** : https://git-scm.com/download/win
- Vérifie : `git --version`

Configure ton identité (une fois) :
```bash
git config --global user.name "Ton Prénom"
git config --global user.email "ton@email.com"
```

Les réflexes Git de base, dans le dossier du projet :
```bash
git init                 # démarre le suivi (au début du projet)
git add -A               # prépare tous les changements
git commit -m "message"  # sauvegarde une étape
```

> Crée un compte gratuit sur **https://github.com** pour sauvegarder ton code en ligne et pouvoir cloner des projets (comme ce dépôt).

---

## 5. Créer ton projet

**C'est tout ce dont tu as besoin.** Dans un dossier vide, lance :
```bash
npm create vibecoding-kit@latest
```

Le wizard te pose 4 à 5 questions (quoi construire, quel assistant, le nom du projet, et — pour un SaaS — Convex en cloud ou en local ; plus le mode apprentissage) puis **pose tout** : règles, commandes, mémoire, hooks git, CI, agents. Rien à cloner, rien à copier à la main.

> **Stack vitrine ?** Astro 7 exige **Node ≥ 22.12** (`node --version`). Le wizard, lui, tourne dès 20.12 — c'est le site qui refusera de démarrer, pas l'installeur.

Ensuite : ouvre ton assistant IA dans le dossier créé et colle le prompt affiché par le wizard (il est aussi dans `COLLE-MOI-DANS-L-IA.md`). Le fichier `docs/A-FAIRE.md` liste les derniers gestes — les plugins et les MCP, que personne ne peut installer à ta place.

<details>
<summary>Tu préfères lire le kit avant de l'utiliser ? (optionnel)</summary>

Le dépôt du kit contient les guides, les fiches de stack et les contextes IA. Clone-le pour les lire :
```bash
git clone https://github.com/ohvignas/vibecoding-starter-kit.git
cd vibecoding-starter-kit
```
Puis, si tu veux rafraîchir les fichiers de contexte IA officiels (règles + `llms.txt`) :
```bash
bash scripts/download-ai-context.sh
```
Ce n'est **pas** nécessaire pour créer un projet : `npm create` fait tout.

</details>

---

## Récapitulatif

| Outil | Rôle | Vérification |
|---|---|---|
| Node.js (LTS) | Exécute le code | `node --version` |
| Cursor **ou** VS Code | Éditer le code | l'app s'ouvre |
| Claude Code / IA Cursor | L'assistant | `claude` se lance |
| Git | Sauvegardes | `git --version` |

Une fois ces 4 outils prêts → lance `npm create vibecoding-kit@latest` dans un dossier vide. Le wizard te demandera ta stack ; les 4 sont expliquées dans le dossier `stacks/`.
