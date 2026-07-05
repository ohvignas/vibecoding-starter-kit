# 📱 Stack Mobile — Convex + React Native (Expo)

> Pour construire une **application mobile** installable sur **iOS et Android** à partir d'un seul code.

**Technos : React Native (avec Expo) pour l'app + Convex pour le backend**

---

## Les technos, expliquées simplement

### React Native + Expo (l'app sur le téléphone)

**React Native** te permet de construire de vraies apps natives iOS **et** Android à partir d'un seul code écrit en **React + TypeScript** — le même langage que pour les sites web. Au lieu d'apprendre Swift (iOS) et Kotlin (Android) séparément, tu écris une fois, ça tourne sur les deux.

Mais React Native « tout seul » est bas niveau : il manque la navigation entre écrans, la compilation, les mises à jour… C'est là qu'intervient **Expo**, une boîte à outils complète posée par-dessus. Aujourd'hui **Expo est le moyen officiellement recommandé** par l'équipe React Native pour démarrer. Il t'apporte :
- **Expo Router** — la navigation basée sur tes fichiers (un fichier dans `app/` = un écran).
- **EAS Build** — un service cloud qui fabrique les fichiers `.ipa`/`.apk` de ton app **sans que tu aies besoin d'un Mac ou d'Android Studio** configuré.
- Un mode dev ultra simple : tu scannes un QR code et ton app s'affiche sur ton téléphone.

> 💡 **Image utile : Expo est à React Native ce que Next.js est à React** — la façon standard de construire.

### Convex (le backend)

**Convex** est le backend tout-en-un (base de données + serveur + temps réel), écrit en **TypeScript**. Tes données se synchronisent **automatiquement** : quand une donnée change, ton app mobile se met à jour toute seule, en direct. Pas de serveur à gérer, pas d'API à assembler.

> 📖 Convex est expliqué en détail dans **`stacks/saas/README.md`** (même backend que pour un SaaS). Ici on voit juste comment le brancher à une app mobile.

---

## Démarrer un projet (commandes officielles vérifiées)

Convex fournit un **quickstart React Native officiel** : https://docs.convex.dev/quickstart/react-native

```bash
# 1. Créer l'app Expo
npx create-expo-app@latest mon-app
cd mon-app

# 2. Ajouter Convex (c'est le SEUL package nécessaire pour connecter Convex)
npm install convex

# 3. Lancer le backend Convex (crée le projet, génère les types en continu)
npx convex dev

# 4. Dans un autre terminal, lancer l'app
npm start
```

Ensuite tu scannes le QR code avec l'app **Expo Go** sur ton téléphone.

> ✨ **Bon à savoir :** `create-expo-app` génère **automatiquement** les fichiers `AGENTS.md`, `CLAUDE.md` et `.claude/settings.json` dans ton projet. Ton app est donc **prête pour Claude Code dès la création** — l'IA connaît déjà les conventions Expo.

**Brancher Convex dans l'app** (dans `app/_layout.tsx`) :
```ts
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});
// puis on enveloppe l'app dans <ConvexProvider client={convex}> …
// et on lit les données avec le hook useQuery
```

---

## L'authentification sur mobile

Deux voies officielles (les deux documentées par Convex) :

| Option | Pour qui | Doc officielle |
|---|---|---|
| **Convex Auth** (natif Convex, *beta*) | Le plus simple à démarrer | https://docs.convex.dev/auth/convex-auth · exemple : https://github.com/get-convex/expo-convex-auth |
| **Better Auth + Convex** | Cohérent si tu fais aussi un SaaS avec Better Auth | https://labs.convex.dev/better-auth/framework-guides/expo |

Pour Better Auth sur mobile, les packages sont :
```bash
npm install convex@latest @convex-dev/better-auth
npm install better-auth @better-auth/expo
npx expo install expo-secure-store   # stockage sécurisé des sessions sur le téléphone
```

> Pour débuter, **Convex Auth** (repo `expo-convex-auth`) est le chemin le plus court. Passe à Better Auth si tu veux la même auth que ton SaaS.

---

## 📚 Documentation officielle (liens vérifiés)

**React Native / Expo**
| Ressource | Lien | À quoi ça sert |
|---|---|---|
| React Native — démarrage | https://reactnative.dev/docs/environment-setup | Setup officiel ; recommande Expo + donne `npx create-expo-app@latest`. |
| Expo — doc d'accueil | https://docs.expo.dev | Le hub de toute la documentation Expo. |
| Expo — créer un projet | https://docs.expo.dev/get-started/create-a-project/ | Créer ta première app pas à pas. |
| Expo Router | https://docs.expo.dev/router/introduction/ | La navigation entre écrans (un fichier = une route). |
| EAS Build | https://docs.expo.dev/build/introduction/ | Compiler ton app dans le cloud pour l'App Store / Play Store. |

**Convex (côté mobile)**
| Ressource | Lien | À quoi ça sert |
|---|---|---|
| Quickstart React Native | https://docs.convex.dev/quickstart/react-native | Le guide officiel Convex + Expo. |
| Docs Convex | https://docs.convex.dev | Toute la doc Convex (voir aussi `stacks/saas/`). |

**Repos GitHub officiels**
- Exemples Expo : https://github.com/expo/examples
- Démo Convex + React Native : https://github.com/get-convex/convex-backend (dossier `npm-packages/demos/react-native/`)
- Expo + Convex Auth : https://github.com/get-convex/expo-convex-auth
- Monorepo complet (Expo + Next.js + Convex + Clerk) : https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo

---

## 🤖 Ressources IA — comment « donner cette stack » à Claude

Expo est **excellent** côté IA. Tout est officiel et vérifié :

**1. Les `llms.txt` (à télécharger — voir `scripts/download-ai-context.sh`)**
- Expo court : https://docs.expo.dev/llms.txt
- Expo complet : https://docs.expo.dev/llms-full.txt
- Convex court : https://www.convex.dev/llms.txt
- Convex complet : https://docs.convex.dev/llms-full.txt

> ⚠️ Le `llms.txt` d'Expo contient une section « idées reçues » qui prévient que **les IA donnent souvent des infos périmées sur Expo** (ex. la commande `expo eject` n'existe plus → utiliser `npx expo prebuild`). Raison de plus pour le donner à ton IA.

**2. Les serveurs MCP officiels** (doc à jour + accès build en direct — configurés dans `.mcp.json`)
- Expo : `claude mcp add --transport http expo https://mcp.expo.dev/mcp`
- Convex : `npx -y convex@latest mcp start`

**3. Les pages officielles « IA » d'Expo**
- Vue d'ensemble agents : https://docs.expo.dev/agents/
- Claude Code + Expo : https://docs.expo.dev/agents/claude/
- Expo Skills : https://docs.expo.dev/skills/ (installe via le repo https://github.com/expo/skills)

**4. Les skills Convex** (voir `stacks/saas/README.md`) : plugin `convex@claude-plugins-official`.

Un `AGENTS.md` prêt à copier dans ton projet est fourni : `stacks/mobile/AGENTS.md`.

> 🔒 **Avant de publier sur les stores** : sécurité + coûts IA → [`guides/03-securite-et-couts.md`](../../guides/03-securite-et-couts.md).

---

## 👉 Prochaine étape

Ouvre **`stacks/mobile/prompts-de-demarrage.md`** pour les prompts prêts à copier-coller.
