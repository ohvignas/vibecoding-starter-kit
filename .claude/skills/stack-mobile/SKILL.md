---
name: stack-mobile
description: Use when building a mobile iOS/Android app with the vibecoding stack React Native (Expo) + Convex. Triggers on "app mobile", "React Native", "Expo", "iOS Android app", "Convex mobile", or any phone app for beginners in this course. Loads the correct workflow, official rules, and Expo pitfalls that AIs get wrong.
---

# Stack Mobile — React Native (Expo) + Convex

Aide un·e débutant·e à construire une app mobile iOS + Android. Réponds en français, simplement, **une étape à la fois**, et fais valider chaque plan avant de coder.

## Ordre de construction
1. **Setup** — app qui tourne sur le téléphone via Expo Go + Convex connecté.
2. **Schéma** Convex → faire valider.
3. **Navigation** (Expo Router, fichiers dans `app/`).
4. **Auth** (Convex Auth simple, ou Better Auth).
5. **Première fonctionnalité** (query + mutation Convex), puis **build EAS**.

## Setup (quickstart officiel Convex)
https://docs.convex.dev/quickstart/react-native
```bash
npx create-expo-app@latest mon-app   # génère déjà AGENTS.md / CLAUDE.md
cd mon-app && npm install convex
npx convex dev     # terminal 1
npm start          # terminal 2 (scan QR avec Expo Go)
```

## Pièges Expo (les IA se trompent souvent — À CORRIGER)
- ❌ **`expo eject` n'existe plus** → utilise `npx expo prebuild`.
- ✅ Installe les deps natives avec **`npx expo install <pkg>`** (choisit la version compatible du SDK), pas `npm install`.
- ✅ Variables d'env client préfixées **`EXPO_PUBLIC_`** (ex. `EXPO_PUBLIC_CONVEX_URL`).
- ✅ Navigation = **Expo Router** (un fichier `app/` = un écran).
- Réfère-toi au `llms.txt` d'Expo (il liste ces pièges) : https://docs.expo.dev/llms.txt
- Pages IA Expo : https://docs.expo.dev/agents/ · MCP : `claude mcp add --transport http expo https://mcp.expo.dev/mcp`

## Règles Convex
- Seul package requis : `convex`. Logique = `query`/`mutation`/`action`. Front réactif via `useQuery` dans `<ConvexProvider>`.

## Auth mobile
- Simple : **Convex Auth** (repo `get-convex/expo-convex-auth`).
- Cohérent avec un SaaS : **Better Auth** (https://labs.convex.dev/better-auth/framework-guides/expo) + `expo-secure-store`.

## Contexte IA dans ce dépôt
`ai-context/react-native-expo/`, `ai-context/convex/` · `stacks/mobile/AGENTS.md` · `stacks/mobile/prompts-de-demarrage.md`.
