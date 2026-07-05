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

## 5. Récupérer ce dépôt

Pour avoir tout le contexte IA sur ta machine :
```bash
git clone <URL-de-ce-depot>
cd best_practices_vibecoding
```

Puis télécharge les fichiers de contexte IA officiels (règles + `llms.txt`) :
```bash
bash scripts/download-ai-context.sh
```

*(Le script est détaillé dans le README principal.)*

---

## Récapitulatif

| Outil | Rôle | Vérification |
|---|---|---|
| Node.js (LTS) | Exécute le code | `node --version` |
| Cursor **ou** VS Code | Éditer le code | l'app s'ouvre |
| Claude Code / IA Cursor | L'assistant | `claude` se lance |
| Git | Sauvegardes | `git --version` |

Une fois ces 4 outils prêts → choisis ta stack dans le dossier `stacks/`.
