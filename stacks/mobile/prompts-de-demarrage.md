# Prompts de démarrage — App mobile (Convex + React Native / Expo)

> Copie-colle ces prompts à ton IA (Claude Code ou Cursor), **dans l'ordre**, un par un. Attends que chaque étape marche avant la suivante. Adapte le texte entre `⟨crochets⟩`.

---

### 🅰️ Avant de commencer
1. Crée l'app : `npx create-expo-app@latest mon-app` (elle contient déjà un `AGENTS.md` / `CLAUDE.md`).
2. Copie aussi les règles de **`stacks/mobile/AGENTS.md`** de ce dépôt dedans.
3. Copie le **`.mcp.json`** à la racine (MCP Convex + Expo).
4. Lance `bash scripts/download-ai-context.sh` pour récupérer les `llms.txt`.

---

### Prompt 1 — Installer et lancer
```
Je démarre une app mobile iOS + Android. Stack : Expo (React Native) + Convex.
Suis le quickstart officiel https://docs.convex.dev/quickstart/react-native
et respecte mon fichier AGENTS.md.

Objectif de cette étape UNIQUEMENT : que l'app démarre sur mon téléphone via Expo Go
et que Convex soit connecté. Donne les commandes une par une et dis-moi quoi vérifier.
Rappel : n'utilise jamais "expo eject" (utilise "npx expo prebuild" si besoin natif).
```

### Prompt 2 — Décrire mon app et modéliser les données
```
Mon app mobile sert à : ⟨décris en 2 phrases⟩.
L'utilisateur doit pouvoir : ⟨liste 3-4 actions⟩.

Propose le schéma Convex (convex/schema.ts) avec une explication par table.
NE CODE PAS le reste, attends ma validation.
```

### Prompt 3 — La navigation entre écrans
```
Mets en place la navigation avec Expo Router.
Je veux ces écrans : ⟨ex. "Accueil", "Détail", "Profil"⟩.
Explique-moi comment le système de fichiers dans app/ crée les écrans.
```

### Prompt 4 — L'authentification mobile
```
Ajoute l'authentification. Commence par le plus simple : Convex Auth
(inspire-toi du repo officiel get-convex/expo-convex-auth),
inscription + connexion email/mot de passe.
Stocke la session avec expo-secure-store. Explique comment tester avec un compte.
```

### Prompt 5 — Ma première vraie fonctionnalité
```
Construis : ⟨ex. "l'écran d'accueil affiche la liste des tâches de l'utilisateur
connecté, avec un bouton pour en ajouter"⟩.
Utilise une query Convex (lecture, temps réel) et une mutation (création).
L'utilisateur ne doit voir que SES données.
```

### Prompt 6 — Construire l'app pour les stores
```
Explique-moi comment fabriquer les fichiers installables iOS et Android avec EAS Build
(https://docs.expo.dev/build/introduction/). Quelles commandes, quels comptes
(Apple / Google) sont nécessaires, et dans quel ordre. Reste simple, je débute.
```

---

### 🆘 Prompt de débogage
```
J'ai cette erreur :
⟨colle le message COMPLET (terminal Expo ou console)⟩

Explique en une phrase simple ce qui se passe, puis corrige.
Vérifie d'abord si c'est un problème de version de package Expo (utilise "npx expo install").
```

> 💡 L'IA se trompe souvent sur Expo (infos périmées). Rappelle-lui : « réfère-toi au llms.txt d'Expo : https://docs.expo.dev/llms.txt ».
