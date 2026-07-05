# Comment bien parler à l'IA (Claude, Cursor) quand on débute

> Ce guide est valable **pour toutes les stacks**. Lis-le en premier : c'est 80 % de la réussite en vibecoding.

Le vibecoding, ce n'est pas « l'IA code à ta place et tu regardes ». C'est un **dialogue** : tu décris ce que tu veux, l'IA propose, tu testes, tu corriges le tir. Plus tu donnes du **contexte** à l'IA, meilleur est le résultat. Ce dépôt existe précisément pour te donner ce contexte tout prêt (voir le dossier `ai-context/`).

---

## 1. La règle d'or : donne du contexte à l'IA

Une IA ne connaît pas *ton* projet. Elle a été entraînée sur des données qui s'arrêtent à une certaine date et qui ne contiennent pas forcément la dernière version de tes outils (Convex, TanStack Start, etc. bougent vite). Résultat : sans contexte, elle **invente** des fonctions qui n'existent pas.

Trois façons de donner du contexte, de la plus simple à la plus avancée :

| Méthode | Ce que c'est | Pour qui |
|---|---|---|
| **Fichier de règles** (`AGENTS.md` / `CLAUDE.md`) | Un fichier à la racine du projet que l'IA lit automatiquement. On y met les règles de la stack. | Tout le monde — **le minimum vital** |
| **`llms.txt`** | Un fichier officiel fourni par chaque outil, qui résume toute sa doc pour les IA. On le télécharge et on le donne à l'IA. | Tout le monde |
| **MCP** (Model Context Protocol) | Une « prise » qui branche l'IA directement sur un outil (base de données Convex, doc à jour…). L'IA va chercher l'info en direct. | Dès que tu es à l'aise |

👉 Ce dépôt te fournit les trois, prêts à l'emploi, pour chaque stack.

---

## 2. Anatomie d'un bon prompt

Un prompt faible : « fais-moi une app de todo ».

Un bon prompt donne **le quoi, le comment, et les limites** :

```
Je construis un SaaS de gestion de tâches.
Stack : Convex (backend) + TanStack Start (front) + Better Auth (auth).
Objectif : une page où l'utilisateur connecté voit SES tâches et peut en ajouter.

Contraintes :
- Respecte les règles du fichier AGENTS.md du projet.
- Utilise les fonctions Convex (query/mutation), pas d'appel HTTP maison.
- Explique-moi chaque étape simplement, je débute.

Commence par me proposer le schéma de la base de données, puis attends ma validation.
```

Les ingrédients :
1. **Le contexte projet** (c'est un SaaS de todo).
2. **La stack** (pour que l'IA utilise les bons outils).
3. **L'objectif précis** (une seule fonctionnalité à la fois).
4. **Les contraintes** (respecte les règles, explique, va doucement).
5. **Un point d'arrêt** (« attends ma validation ») → tu gardes le contrôle.

---

## 3. Les 7 réflexes du vibecoder

1. **Une fonctionnalité à la fois.** Ne demande pas « fais toute l'app ». Demande une brique, teste, puis la suivante.
2. **Fais valider le plan avant le code.** « Décris-moi ton plan avant d'écrire quoi que ce soit. » Corriger un plan coûte 10 secondes ; corriger 300 lignes de code, une heure.
3. **Teste après chaque étape.** Lance l'app, clique, regarde. Si ça marche, on continue. Sinon, on corrige *tout de suite* (pendant que le contexte est frais).
4. **Copie-colle les erreurs en entier.** Message d'erreur rouge dans le terminal ou la console ? Colle-le tel quel à l'IA. Ne le résume pas.
5. **Demande des explications.** « Pourquoi tu as fait ça comme ça ? » Tu es là pour apprendre, pas juste pour livrer.
6. **Commits fréquents.** Sauvegarde ton travail avec Git à chaque étape qui marche. Comme ça, si l'IA casse quelque chose, tu reviens en arrière sans douleur.
7. **Doute des IA sur les outils récents.** Si l'IA te propose du code qui « a l'air vieux », rappelle-lui : « utilise la dernière version, référence-toi au `llms.txt` de l'outil ».

---

## 4. Quand l'IA se trompe (et elle se trompera)

C'est normal. Voici la boucle de débogage :

1. **Ne panique pas, ne supprime pas tout.** Lis le message d'erreur.
2. **Donne l'erreur complète à l'IA** + « que se passe-t-il et comment on corrige ? ».
3. Si elle tourne en rond après 2-3 essais : **change d'angle.** « Oublie l'approche précédente. Explique-moi d'abord ce que ce code est censé faire, ligne par ligne. »
4. Toujours bloqué ? **Reviens au dernier commit qui marchait** et reprends plus petit.

> Astuce : plus la conversation est longue, plus l'IA « oublie » le début. Si ça part en vrille, ouvre une **nouvelle conversation**, redonne le contexte (AGENTS.md + objectif), et repars propre.

---

## 5. Ce que ce dépôt met à ta disposition

- `guides/` — les guides généraux (celui-ci + installation des outils).
- `stacks/` — pour chaque type d'app (SaaS, mobile, desktop) : explications débutant, liens de doc officielle, et **prompts de démarrage** prêts à copier.
- `ai-context/` — les fichiers à donner à l'IA (règles officielles, `llms.txt`) + un script pour les télécharger automatiquement.
- `.claude/skills/` — des **skills Claude Code** : Claude charge tout seul les bonnes règles selon ce que tu construis.
- `.mcp.json` — la config des serveurs MCP (doc à jour + accès Convex).

**Prochaine étape :** installe les outils (`guides/02-installer-les-outils.md`), puis choisis ta stack dans `stacks/`.
