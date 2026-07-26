## Règle sous-agents (quand déléguer, comment)

Un **sous-agent** = une copie de l'IA lancée sur **une tâche isolée**, avec un **contexte frais** (il n'hérite **pas** de la conversation). Bien utilisé : plus rapide (parallèle) et ton contexte reste propre.

### Quand en créer
| Situation | Pattern |
|---|---|
| **Code à construire** (tâche de plan, feature) | `superpowers:subagent-driven-development` : 1 implémenteur **par tâche** (séquentiel) → 1 reviewer (spec + qualité) → fix. C'est la boucle de `/build` et `/new-feature`. |
| **Largeur indépendante** (recherche multi-sources, 1 écran de maquette, 1 domaine à documenter, audit multi-fichiers) | **fan-out parallèle** : N sous-agents en même temps, un par morceau, puis tu synthétises. |
| **Une seule tâche lourde et isolée** | 1 sous-agent ciblé. |
| Tâche courte, dépendante du fil, ou triviale | **pas** de sous-agent — fais-le directement. |

### Comment créer un sous-agent (le contrat)
Il ne voit pas le chat → donne-lui **tout** dans son prompt :
0. **Modèle** : dispatche **tous** les sous-agents sur **`claude-sonnet-5`** (Claude Code : paramètre `model` du sous-agent ; Cursor : sélectionne Sonnet 5). Les sous-agents **design** (maquette, UI) chargent **en plus** les skills design (voir « Règle design »).
1. **Sa tâche** — précise, une seule.
2. **Les skills à charger** — ex. design → voir **« Règle design »** ci-dessus. Chaque sous-agent charge **ses** skills, **à chaque fois**.
3. **Les fichiers à lire** — chemins exacts (`docs/design.md`, `docs/PRD.md`…).
4. **L'artefact à rendre** — un **fichier** (ex. `maquette/parts/<ecran>.html`) ou un **résumé court** — jamais 10 000 tokens de blabla.

### Panel de critiques (quand plusieurs agents relisent le même travail)
L'équipe du kit vit dans `.claude/agents/` — tu peux l'appeler **n'importe quand** (`critique-produit` · `critique-donnees` · `critique-ux` · `test-runner` · `code-reviewer` · `security-reviewer`). Améliore un agent **là** et tous les projets en profitent.
- **Diversité par la lentille, pas par le tempérament** : ce qui fait trouver des trous différents, c'est un **périmètre différent** (produit / données / UX). Un ton « sévère » n'ajoute rien et provoque des sur-corrections.
- **Preuve obligatoire** : chaque finding cite **où** il se vérifie (écran, élément, ligne du PRD). Sans preuve → jeté. Une vérification concrète tue un faux positif mieux que n'importe quel ton adversarial.
- **2 passes maximum** : au-delà, une revue multi-agents fabrique surtout des **faux positifs** (le rappel monte, la précision s'effondre). Doute restant → tranche avec l'utilisateur.
- **Dédoublonne** les rapports avant d'agir (les lentilles se recoupent).
- Le critique est **détaché** de celui qui a produit le travail (contexte frais) : c'est ce détachement qui lui fait voir ce que l'auteur ne voit plus.

### Règles d'or
- **Les sous-agents qui ÉCRIVENT du code ne travaillent jamais en parallèle** sur la même feature : chaque action porte des décisions implicites, et deux décisions contradictoires donnent un résultat inassemblable. Le fan-out parallèle est réservé à la **lecture** (recherche, critique, vérification). Pour construire : **un implémenteur à la fois**, en séquence.
- **Un sous-agent ne voit ni `AGENTS.md` ni `CLAUDE.md`** : il ne reçoit que son propre prompt. Donne-lui donc **ses règles** (ou les fichiers exacts à lire) dans son brief — sinon il travaille sans les règles du projet.
- **Parallèle seulement si indépendant** — sinon conflits (2 agents qui écrivent le même fichier). Fais-les écrire dans des fichiers séparés, tu assembles.
- **Même source pour tous** (`docs/design.md`, preset) → résultat cohérent.
- **Tu synthétises** : les sous-agents produisent, toi tu assembles + fais une **passe de cohérence**.
- Ne recopie **pas** l'historique du chat dans leur prompt — le contexte frais **est** la valeur.
