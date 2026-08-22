# /new-project — Fondation d'un nouveau projet (runbook IA)

Tu construis la **FONDATION complète** d'un nouveau produit à partir de l'idée donnée en argument.
Va **étape par étape**, en français. **Chaque artefact attend la validation de l'utilisateur avant le suivant** (gate). Pour aller en profondeur, **lance des sous-agents en parallèle** (recherche, rédaction) puis synthétise — cadre : **« Règle sous-agents »** dans `AGENTS.md` (quand déléguer, comment).

Argument : `$ARGUMENTS` = description libre de l'idée.
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.

> ⛔ **`docs/ETAT-DES-LIEUX.md` existe ? Tu t'arrêtes ici.** C'est un projet **existant** que le kit a adopté (`--adopt`) : il a déjà son code, et ce runbook FONDE un projet — PRD, architecture, maquette, roadmap, scaffold. Le jouer par-dessus écraserait un projet qui tourne. **Ne scaffolde rien, ne crée aucun fichier de fondation.** Dis-le en une phrase, puis renvoie à **`/next`** (la prochaine action sur CE code) ou à **`/new-feature`** (ajouter UNE fonctionnalité). C'est la dernière porte : `/help`, `/next` et `/build` la ferment déjà en amont.

## Ce qu'on va faire ensemble — explique le parcours (à dire à l'utilisateur, EN PREMIER)
Avant toute question, dis-lui en **langage simple** ce qu'on va faire et ce qu'il obtiendra :
> « On va, ensemble : **1)** bien comprendre ton idée (quelques questions simples) · **2)** écrire le **plan** de ton app · **3)** **dessiner les écrans** (maquette) · **4)** en tirer une **feuille de route**. Ensuite `/build` construit, écran par écran. À la fin de cette étape tu auras un **plan clair + un design + une roadmap** — pas encore de code, et c'est normal. »
Puis propose le mode de travail. Garde ce cap : à chaque étape, redis en une phrase **ce que tu fais et ce que ça lui apporte**.

---

## Les 9 étapes — ouvre-les UNE PAR UNE, dans cet ordre
> Elles vivent dans le dossier `new-project/` posé **à côté de ce fichier** : `.cursor/commands/new-project/` (Cursor) · `.claude/commands/new-project/` (Claude Code) · `docs/commands/new-project/` (Codex). Pour chacune : **ouvre le fichier, fais ce qu'il dit, fais valider, passe à la suivante**. N'en saute aucune et ne la résume pas de mémoire — la sortie d'une étape est l'entrée de la suivante.
> *(Chez Codex, ce fichier-ci contient déjà les 9 étapes à la suite : tu peux simplement continuer à lire, dans le même ordre.)*

- [ ] **00** `new-project/00-mode-et-cadre.md` → le **mode de travail** choisi + les tags transverses (vaut pour toutes les étapes)
- [ ] **01** `new-project/01-cadrage.md` → l'idée **comprise et reformulée**, le **problème** énoncé sans sa solution, l'**entreprise** et les **objectifs commerciaux** connus (aucun fichier écrit à cette étape)
- [ ] **02** `new-project/02-prd.md` → `docs/PRD.md`
- [ ] **03** `new-project/03-stack-et-architecture.md` → `docs/ARCHITECTURE.md` (la stack, elle, est déjà fixée)
- [ ] **04** `new-project/04-arborescence.md` → la section **« Arborescence »** de `docs/PRD.md` : les écrans, leur hiérarchie, la navigation, les URL
- [ ] **05** `new-project/05-design-maquette.md` → `maquette/` + `docs/design.md`
- [ ] **06** `new-project/06-roadmap.md` → `docs/agents/inventaire.md`, puis `docs/ROADMAP.md` et la section « Pour ton projet » de `docs/A-FAIRE.md`
- [ ] **07** `new-project/07-scaffold.md` → le projet **scaffoldé**, `AGENTS.md` complété, `docs/memory/`
- [ ] **08** `new-project/08-fini-quand.md` → le contrôle de fin, et ce qu'on lance ensuite
