# Règles projet pour l'IA — App mobile (Convex + React Native / Expo)

> Copie ce fichier à la **racine de ton projet**. Claude Code et Cursor le lisent automatiquement.
> Note : `create-expo-app` génère déjà un `AGENTS.md` / `CLAUDE.md` — tu peux fusionner ces règles dedans.

## Contexte du projet
Je construis une **app mobile iOS + Android** en TypeScript. Stack :
- **React Native + Expo** — l'app sur le téléphone (Expo Router pour la navigation).
- **Convex** — backend (base de données réactive + temps réel).

Je débute. Explique simplement et avance **une étape à la fois**.

## Règles générales
- Tout en **TypeScript**. Avant une nouvelle fonctionnalité, **propose un plan court et attends ma validation**.
- Utilise **toujours la dernière version** des APIs. En cas de doute, réfère-toi aux `llms.txt` (`ai-context/`) ou aux serveurs MCP (`.mcp.json`).

## Règles Expo / React Native (pièges fréquents pour l'IA)
- **N'utilise PAS `expo eject`** : cette commande n'existe plus. Pour accéder au code natif, utilise **`npx expo prebuild`**.
- Navigation = **Expo Router** (fichiers dans `app/`, un fichier = un écran). N'introduis pas une autre lib de navigation sans raison.
- Pour installer des dépendances natives, utilise **`npx expo install <pkg>`** (pas `npm install`) — Expo choisit la version compatible avec le SDK.
- Les variables d'env exposées au client doivent commencer par **`EXPO_PUBLIC_`** (ex. `EXPO_PUBLIC_CONVEX_URL`).
- Réfère-toi au `llms.txt` Expo (il documente les erreurs fréquentes des IA) : https://docs.expo.dev/llms.txt
- Pages IA officielles : https://docs.expo.dev/agents/ · Claude Code : https://docs.expo.dev/agents/claude/

## Règles Convex
- Le **seul** package pour connecter Convex à l'app est `convex`.
- Logique serveur = fonctions Convex (`query`/`mutation`/`action`). Pas d'API REST maison.
- Enveloppe l'app dans `<ConvexProvider>` (dans `app/_layout.tsx`) et lis les données avec `useQuery` (réactif).
- Quickstart officiel : https://docs.convex.dev/quickstart/react-native · MCP : `npx -y convex@latest mcp start`

## Authentification
- Deux options : **Convex Auth** (le plus simple, repo `get-convex/expo-convex-auth`) ou **Better Auth + Convex** (guide : https://labs.convex.dev/better-auth/framework-guides/expo).
- Sur mobile, stocke les sessions avec **`expo-secure-store`** (jamais en clair).

## Bonnes pratiques
- Ne mets jamais de secret dans le code client.
- Teste sur ton téléphone via **Expo Go** (scan du QR code) après chaque étape.
- Commit Git après chaque étape qui fonctionne.
