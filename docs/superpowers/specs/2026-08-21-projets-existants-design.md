# Le kit s'installe sur un projet qui existe déjà — design

**Date :** 2026-08-21 · **Base :** `b512b24`, kit 0.16.0, 432 tests verts.

## Le problème

Le kit crée des projets neufs. Sur un projet qui existe déjà, il **échoue en silence** : il ne
casse rien, et il ne sert à rien.

Mesuré le 2026-08-21 sur un projet Next.js + Prisma sous git, avec un `AGENTS.md` personnel :

| Ce qui se passe | Conséquence |
|---|---|
| `setup.mjs:103-113` refuse d'écrire `AGENTS.md` et pond `AGENTS.md.new` | **La méthodologie n'arrive jamais.** Son `AGENTS.md` reste sans les règles du kit |
| L'avertissement est imprimé **ligne 58 sur 74** | Les 6 dernières lignes disent de lancer `/new-project`. Le message défile |
| Le wizard a posé `stack: saas` → Convex + TanStack | Le projet est Next.js + Prisma. `AGENTS-stack.md` parle de Convex : **règles d'une stack absente** |
| Le rapport annonce « Projet créé » | Sur un dépôt qui a deux ans d'historique |

Et `/init-vibecoding` ne rattrape pas : son étape `00-detecter-l-etat.md` ne connaît que **deux**
cas — `.vibecoding.json` existe (→ refresh) ou n'existe pas (→ **projet neuf**). Le cas « projet
réel que le kit n'a jamais touché » n'existe nulle part.

**Ce qui marche déjà, et qu'on ne refait pas :** rien n'est écrasé. `package.json`, `src/`, les
règles personnelles : intacts. C'est la base sur laquelle on construit.

## Ce qu'on construit

Un troisième parcours — **adopter un projet existant** — à côté de « créer » et « mettre à jour ».
Il installe la **méthodologie**, jamais des affirmations sur une techno que le kit n'a pas vérifiée.

### Décision 1 — La méthode, pas la stack

Le kit **n'écrit aucune règle de techno** sur un projet existant. Il ne peut pas prouver ce qu'il
n'a pas vérifié, et une règle Convex dans un projet Prisma est **pire que pas de règle**.

**Observer n'est pas prescrire.** Le kit a le droit d'écrire « ce projet utilise Prisma, on le
lance avec `pnpm dev` » — c'est un constat, vérifiable en regardant le dépôt. Il n'a pas le droit
d'écrire « avec Prisma, fais ceci plutôt que cela » — c'est une prescription qu'il n'a pas vérifiée.
La décision 4 relève du premier registre, jamais du second.

Rejeté : générer les règles de stack en lisant le projet. Ce dépôt refuse par principe ce qu'il ne
peut pas prouver — et 432 tests garantissent aujourd'hui que la Règle Preuve dit exactement ce
qu'elle dit. Générée, elle deviendrait un texte différent à chaque installation, que rien ne vérifie.

### Décision 2 — Sélection, pas compression

Composition mesurée de l'`AGENTS.md` rendu (2196 mots, pire cas `saas/*/learning=true`) :

| Bloc | Mots | Sur un projet existant |
|---|---|---|
| Règle Preuve · sous-agents · vérification · boucle · Réalité · mémoire · secrets · apprentissage | **1768** | ✅ c'est ce qu'il vient chercher |
| Règle design (147) · CSS maquette (144) · Docs du projet (27) · Contexte stack (20) | **338** | ❌ pointent `docs/design.md`, `maquette/`, `AGENTS-stack.md`, `ai-context/` — absents |
| plomberie | 90 | — |

On **retire les 338 mots qui parlent de fichiers absents**. Résultat : ~1860 mots, **zéro règle de
méthode perdue**. C'est de la sélection, donc c'est testable : chaque section retirée l'est parce
que le fichier qu'elle cite n'existe pas.

Rejeté : couper les justifications des grosses règles pour descendre à ~1200. Ce dépôt a déjà
mesuré qu'une règle sans son pourquoi se fait contourner.

Rejeté aussi : déporter le détail dans `docs/METHODE.md` et ne garder que les interdits (~700
mots). Un `AGENTS.md` est **toujours** en contexte ; un fichier renvoyé ne l'est que si quelque
chose l'ouvre. On échangerait 1100 mots garantis contre 1100 mots peut-être lus.

### Décision 3 — Fusion par marqueurs, après accord

Le mécanisme **existe déjà** : `mergeManagedSection` (`managed-section.mjs:25`) remplace le bloc
entre `vibecoding:start` et `vibecoding:end`, et **tout ce qui est hors des marqueurs n'est jamais
touché**. Il n'est appelé que par `refresh.mjs:36` — jamais à l'installation.

Le parcours « adopter » l'appelle. Résultat dans son fichier :

```
<!-- vibecoding:start -->     ← bloc du kit, régénérable, remplacé EN PLACE au refresh
   la méthode
<!-- vibecoding:end -->

# Mes règles                   ← ce que l'utilisateur a écrit : jamais lu, jamais modifié
- pnpm, pas npm
```

**On montre, on demande une fois, on écrit.** Le fichier qui pilote son IA ne se modifie pas en
silence : on affiche ce qui sera inséré, on dit ce que ça change, on attend un oui. Une seule fois —
`--refresh` ne redemande pas, il remplace en place.

Garanties : rien hors marqueurs n'est modifié (propriété testée) · réversible (`git diff`) ·
`--refresh` reste idempotent.

### Décision 4 — L'analyse produit deux fichiers, et pas plus

- **`docs/RUN.md`** — comment lancer *ce* projet (`pnpm dev`, pas `npm run dev`).
- **`docs/ETAT-DES-LIEUX.md`** — ce que l'IA a compris : technos vues, structure, comment on lance,
  comment on teste, **et ce qu'elle n'a pas su déterminer**. Ce fichier devient la première page de
  la mémoire : la session suivante démarre en sachant où elle est.

Sans trace écrite, l'analyse meurt avec la conversation — le défaut exact corrigé en 0.16.0 sur le
mode apprentissage.

Rejeté : y ajouter un diagnostic de dette (tests manquants, CI absente, secrets en clair). C'est un
audit, ça mérite sa propre commande, et ça commencerait la relation en jugeant son code.

### Décision 5 — `autoskills` recommandé, jamais embarqué

[`midudev/autoskills`](https://github.com/midudev/autoskills) scanne `package.json` / Gradle /
configs, détecte la stack, installe des skills curés (100+ technos), et pose un `skills-lock.json`
avec le SHA-256 de chacun.

**Le kit ne l'embarque pas.** Licence **CC BY-NC 4.0** contre un kit **MIT** : embarquer
redistribuerait du non-commercial sous MIT. Le lancer chez l'utilisateur ne redistribue rien —
c'est déjà le traitement des outils tiers (`/plugin install superpowers@…`, `npx skills add`).

Trois garde-fous, tous obligatoires :

1. **`--dry-run` d'abord.** On montre ce qui serait installé, puis on demande.
2. **La question n'apparaît pas sous Codex** — autoskills couvre Claude Code et Cursor seulement.
3. **On nomme l'outil, son auteur et sa licence.** Ces skills ne viennent pas du kit et n'ont pas
   été relus par lui.

**Zone grise assumée, à trancher hors de ce document :** la clause **NC** porte sur l'*usage*. Des
élèves l'utilisant dans le cadre d'une prestation payante — c'est une question pour midudev, pas
pour cette spec. Le kit n'y est pas exposé (il ne redistribue rien) ; l'utilisateur final l'est.

### Décision 6 — La 6ᵉ question ne touche pas le parcours neuf

`degraissage.test.mjs:49` fige **5 questions max** et vérifie la forme exacte des réponses. Ce n'est
pas un accident : c'est la promesse d'accueil (« quatre à cinq questions et c'est fini »).

La question autoskills n'a de sens que sur un projet existant — un projet neuf n'a pas encore de
`package.json` à scanner, et le kit connaît déjà sa stack.

| Parcours | Questions |
|---|---|
| **Neuf** | les 5 d'aujourd'hui. Inchangé, test vert |
| **Existant** | son propre flux, la question y vit |

## Correctif à passer au même endroit

`wizard.mjs:104` promet encore l'ancien mode apprentissage :
`« l'IA t'explique ce qu'elle fait et vérifie que tu suis ? »`. Le « vérifie que tu suis » a été
retiré en 0.16.0 — la question annonce ce que le kit ne fait plus. Une ligne.

## Périmètre — ce qui N'EST PAS dans ce chantier

- Aucun audit de dette technique.
- Aucune génération de règles de techno.
- Aucune modification du parcours « projet neuf ».
- Codex ne reçoit pas de skills tiers (limite d'autoskills, dite, pas contournée).

## Ce qu'il faudra prouver

- Sur un projet réel (Next.js + Prisma + `AGENTS.md` personnel) : les règles de méthode arrivent
  **dans** `AGENTS.md`, entre marqueurs, et les règles personnelles sont **intactes** ligne à ligne.
- Aucun renvoi mort : aucune section livrée ne cite un fichier absent du projet
  (`promesses-livrees.test.mjs` couvre déjà cette classe).
- `--refresh` reste **idempotent** : deux passages ne dupliquent pas le bloc.
- Le parcours neuf : **5 questions**, forme des réponses inchangée, `degraissage.test.mjs` vert.
- Sous Codex, la question autoskills **n'apparaît pas**.
