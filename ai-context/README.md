# 📂 ai-context/ — le contexte à donner à ton IA

Ce dossier contient les **fichiers officiels** qui apprennent à ton IA à utiliser correctement chaque techno. **Sans eux, l'IA invente des fonctions périmées.**

## Comment le remplir

Lance depuis la racine du dépôt :
```bash
bash scripts/download-ai-context.sh
```
Ça télécharge les `llms.txt` et règles officielles (relance-le de temps en temps, les outils évoluent).

## Ce qu'il y a dedans (après téléchargement)

| Dossier | Fichiers | Source officielle |
|---|---|---|
| `convex/` | `llms.txt`, `llms-full.txt`, `convex_rules.txt`, `convex_rules.mdc` | convex.dev · convex.link |
| `tanstack-start/` | `llms.txt`, `llms-tanstack-global.txt` | tanstack.com |
| `better-auth/` | `llms.txt` | better-auth.com |
| `react-native-expo/` | `expo-llms.txt`, `expo-llms-full.txt`, `react-native-llms.txt` | docs.expo.dev · reactnative.dev |
| `electron/` | *(vide — Electron n'a pas de llms.txt ; utilise les skills `electron:*`)* | — |

> Les fichiers `*-full.txt` sont **gros** (2+ Mo) : c'est toute la doc. Donne le `llms.txt` court en priorité, et le `-full` seulement si l'IA a besoin de détails précis.

## Les 3 façons de s'en servir

**1. Glisser-déposer** — glisse le `llms.txt` de ta techno dans le chat de ton IA quand tu démarres.

**2. Le laisser dans le projet** — garde ce dossier et dis à l'IA : *« réfère-toi aux fichiers de `ai-context/` »*. Le fichier `AGENTS.md` de ta stack le fait déjà.

**3. Les serveurs MCP (le plus puissant)** — l'IA va chercher la doc **à jour, en direct**, sans fichier. Config fournie dans **`.mcp.json`** à la racine :

| Serveur MCP | Ce qu'il fait | Activation |
|---|---|---|
| **convex** | Accès à ton déploiement Convex (tables, fonctions, logs) + doc | Automatique dans un projet Convex |
| **expo** | Doc Expo à jour + historique EAS Build + crashs | Dans Claude Code : `/mcp` pour te connecter (compte Expo) |
| **better-auth** | Recherche dans la doc Better Auth | Automatique |

Pour Claude Code, copie `.mcp.json` à la racine de ton projet — il est chargé au lancement.
Tu peux aussi ajouter Expo en une commande : `claude mcp add --transport http expo https://mcp.expo.dev/mcp`.

> 💡 **Context7** est un autre MCP très utile (doc à jour de milliers de librairies). Ajoute-le si tu veux : cherche « Context7 MCP » dans la doc de ton IA.
