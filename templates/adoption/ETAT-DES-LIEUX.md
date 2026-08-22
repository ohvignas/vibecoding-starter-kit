# 🗺️ État des lieux de ce projet

La **première page de la mémoire**. Le kit vient d'être installé dans un projet qui existait déjà :
il n'a rien deviné de ce qu'il y a dedans, et il ne prétend pas le savoir.

Ce fichier est le compte rendu de la **première lecture** du projet par l'IA. Il répond à cinq
questions, et il en garde une cinquième ouverte — celle des choses qu'elle n'a pas su déterminer.
Tant qu'une ligne y est marquée `À DÉTERMINER`, c'est qu'on ne sait pas : personne ne comble.

> **Rempli une fois, corrigé souvent.** Le kit ne régénère jamais ce fichier — ce qui est écrit ici
> t'appartient. Quand tu découvres qu'une ligne est fausse, corrige-la : c'est ce que l'IA relira.

---

## POUR L'IA — remplis ce fichier AVANT toute autre chose

C'est ta première tâche dans ce projet, et elle passe avant d'écrire la moindre ligne de code.

**Comment tu le remplis :** en **regardant**, pas en supposant. Tu ouvres les fichiers, tu lis les
dépendances déclarées, tu lis la configuration. Ce que tu n'as pas vu de tes yeux, tu ne l'écris pas.

**Les trois interdits :**

1. **Aucune techno déduite d'un nom de dossier.** Un dossier `api/` ne prouve aucun framework.
   Ce qui prouve, c'est une dépendance déclarée ou un import réel — cite le fichier où tu l'as vu.
2. **Aucune commande inventée.** Les commandes relevées sont dans `docs/RUN.md` (le kit les a lues
   dans le projet). Si tu en connais une autre, dis **comment** tu l'as apprise.
3. **`À DÉTERMINER` n'est pas un échec, c'est une réponse.** Une supposition écrite au présent
   devient une certitude au tour suivant, et personne ne saura d'où elle venait. Laisse la marque.

**Quand tu as fini :** dis en trois lignes ce que tu as compris du projet, et **pose les questions
restées ouvertes** — une par ligne `À DÉTERMINER`. C'est le moment où l'utilisateur répond le mieux.

---

## 1. Les technos que je vois

_(Une ligne par techno, avec **la preuve** : le fichier où tu l'as vue.)_

| Techno | Version vue | Où je l'ai vue |
| --- | --- | --- |
| À DÉTERMINER | | |

**Ce que je n'arrive pas à classer :** À DÉTERMINER.

---

## 2. La structure

_(Les dossiers qui portent du code, et ce qu'il y a dedans. Pas l'arborescence complète : ce qu'un
nouveau doit savoir pour ne pas chercher au mauvais endroit.)_

| Dossier | Ce qu'il contient |
| --- | --- |
| À DÉTERMINER | |

**La convention que je crois voir** (nommage, découpage, où va un nouveau fichier) : À DÉTERMINER.

---

## 3. Comment on lance

Les commandes relevées dans le projet sont dans **`docs/RUN.md`** — n'en recopie pas la liste ici,
elle serait périmée à la première modification. Ce qu'on écrit ici, c'est ce que `docs/RUN.md` ne
peut pas savoir :

- **La commande qui lance l'app pour la voir** : À DÉTERMINER.
- **Sur quelle adresse elle s'ouvre** : À DÉTERMINER.
- **Ce qu'il faut AVANT** (dépendances installées, variables d'environnement, base de données,
  service tiers démarré) : À DÉTERMINER.

---

## 4. Comment on teste

- **La commande de test** : À DÉTERMINER.
- **Ce qui est couvert, ce qui ne l'est pas** : À DÉTERMINER.
- **Ce qui doit passer avant un commit** : À DÉTERMINER.

> S'il n'y a **aucun test**, écris-le tel quel. C'est une information, pas une lacune à combler en
> douce : ça change la façon dont on vérifie chaque modification (voir « Règle de vérification »
> dans `AGENTS.md`).

---

## 5. Ce que je n'ai PAS su déterminer

_(La rubrique la plus utile du fichier. Chaque ligne est une question à poser.)_

- À DÉTERMINER.

**Ce qui m'a l'air d'être une décision volontaire mais que je ne comprends pas** — à ne surtout pas
« corriger » avant d'avoir demandé :

- À DÉTERMINER.

---

## Ce que ça change pour la suite

Une fois ce fichier rempli, ce qui compte y est **écrit**, donc relisible. Les faits durables
(conventions, pièges, décisions expliquées) se rangent ensuite dans `docs/memory/` — c'est là que
l'IA va les rechercher au fil des sessions, pas ici. Ce fichier-ci reste la photo du premier jour.
