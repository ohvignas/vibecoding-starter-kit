# Règles projet pour l'IA — SaaS (Convex + TanStack Start + Better Auth)

> Copie ce fichier à la **racine de ton projet**. Claude Code et Cursor le lisent automatiquement.
> Renomme-le en `CLAUDE.md` si tu utilises uniquement Claude Code (les deux noms fonctionnent).

## Contexte du projet
Je construis un **SaaS** en TypeScript. Stack imposée :
- **Convex** — backend (base de données réactive + fonctions serveur + temps réel).
- **TanStack Start** — framework React full-stack (SSR, server functions, routing type-safe).
- **Better Auth** — authentification, branchée à Convex via `@convex-dev/better-auth`.

Je débute. Explique tes choix simplement et avance **une étape à la fois**.

## Règles générales
- Tout est en **TypeScript**, typé de bout en bout. Pas de `any` sauf nécessité justifiée.
- Avant d'écrire du code pour une nouvelle fonctionnalité, **propose d'abord un plan court et attends ma validation**.
- Utilise **toujours la dernière version** des APIs. En cas de doute, réfère-toi aux `llms.txt` (voir dossier `ai-context/`) ou interroge les serveurs MCP configurés dans `.mcp.json`.
- Après chaque étape, dis-moi **comment tester** (quelle commande, quoi cliquer).

## Règles Convex
- La logique serveur = **fonctions Convex** : `query` (lecture), `mutation` (écriture), `action` (appels externes). **N'écris pas d'API REST maison** ni d'appels `fetch` vers un serveur custom pour les données.
- Définis le **schéma** dans `convex/schema.ts`. Fais-le valider avant d'écrire les fonctions.
- Côté front, lis les données avec les hooks réactifs (`useQuery`) — elles se mettent à jour **automatiquement**, ne recharge pas manuellement.
- Respecte les règles officielles Convex : https://convex.link/convex_rules.txt
- Doc IA Convex : https://docs.convex.dev/ai · MCP : `npx -y convex@latest mcp start`

## Règles TanStack Start
- Routing **basé sur les fichiers** dans `src/routes` — type-safe. Utilise les liens typés du routeur, pas des `<a href>` en dur pour la navigation interne.
- Pour exécuter du code serveur appelé depuis le client, utilise les **server functions** (`createServerFn`), pas une API séparée.
- ⚠️ Le fichier `AGENTS.md` du dépôt GitHub de TanStack vise les **contributeurs du framework** — ne t'en inspire pas pour ce projet.
- Réfère-toi au `llms.txt` officiel : https://tanstack.com/start/latest/llms.txt

## Règles Better Auth
- L'auth passe par le composant Convex **`@convex-dev/better-auth`**. Suis le guide officiel : https://labs.convex.dev/better-auth/framework-guides/tanstack-start
- ⚠️ **Version épinglée** : installe la version de `better-auth` **indiquée par la doc Convex** (ex. `~1.6.x`), pas `@latest`, sinon incompatibilité.
- Génère le schéma d'auth avec le CLI (`npx @better-auth/cli@latest generate`) plutôt qu'à la main.
- Protège les routes privées côté serveur (vérifie la session avant de rendre la page).

## Sécurité & bonnes pratiques
- Ne mets jamais de secret (clés API, tokens) dans le code client. Utilise les variables d'environnement Convex / `.env`.
- Commit Git après chaque étape qui fonctionne.
