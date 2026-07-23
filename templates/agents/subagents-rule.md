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
1. **Sa tâche** — précise, une seule.
2. **Les skills à charger** — ex. design → voir **« Règle design »** ci-dessus. Chaque sous-agent charge **ses** skills, **à chaque fois**.
3. **Les fichiers à lire** — chemins exacts (`docs/design.md`, `docs/PRD.md`…).
4. **L'artefact à rendre** — un **fichier** (ex. `maquette/parts/<ecran>.html`) ou un **résumé court** — jamais 10 000 tokens de blabla.

### Règles d'or
- **Parallèle seulement si indépendant** — sinon conflits (2 agents qui écrivent le même fichier). Fais-les écrire dans des fichiers séparés, tu assembles.
- **Même source pour tous** (`docs/design.md`, preset) → résultat cohérent.
- **Tu synthétises** : les sous-agents produisent, toi tu assembles + fais une **passe de cohérence**.
- Ne recopie **pas** l'historique du chat dans leur prompt — le contexte frais **est** la valeur.
