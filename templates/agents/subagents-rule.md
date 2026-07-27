## Règle sous-agents (quand déléguer, comment)

Un **sous-agent** = une copie de l'IA sur **une tâche isolée**, en **contexte frais** : il n'hérite **pas** du chat — et ne le lui recopie pas, ce détachement **est** la valeur.

### Quand en créer
- **Code à construire** → `superpowers:subagent-driven-development` : 1 implémenteur **par tâche**, en séquence → 1 reviewer → fix (boucle de `/build`, `/new-feature`).
- **Largeur en LECTURE** (recherche, audit, critique, vérification) → **fan-out parallèle**, un par morceau, puis tu synthétises.
- **Tâche lourde et isolée** → 1 ciblé. **Courte, triviale ou dépendante du fil** → aucun.

### Le contrat (il ne voit pas le chat → donne-lui tout)
0. **Modèle** — **`claude-sonnet-5`**, **sauf `security-reviewer` : `claude-opus-5`**. Seule **règle** qui en fixe un (Claude Code : champ `model` · Cursor : sélecteur · Codex : le brief).
1. **Sa tâche**, une seule, précise. 2. **Ses skills** — un sous-agent design charge les skills design (« Règle design »), chacun les siens, **à chaque fois**. 3. **Les fichiers à lire**, chemins exacts. 4. **Ses règles** : il ne voit ni `AGENTS.md` ni `CLAUDE.md`. 5. **L'artefact à rendre** : un fichier précis ou un **résumé court**, jamais 10 000 tokens. 6. **Le journal** : les bridés en écriture (3 critiques, `test-runner`, `code-reviewer`) **rendent** leur ligne, **c'est toi qui l'écris** dans `docs/agents/JOURNAL.md` ; `verificateur` et `security-reviewer` écrivent la leur.

### Le crew du kit
Il vit dans le dossier d'agents de ton assistant (`.cursor/agents/` · `.claude/agents/` · `docs/agents/crew/` pour Codex) ; `/help` les liste. Améliore un agent **là**, tous les projets en profitent. Plusieurs critiques : **lentille différente** (produit / données / UX), pas un ton plus sévère · **preuve obligatoire**, un finding sans preuve est jeté · **2 passes maximum** · **dédoublonne** · critique **détaché** de l'auteur.

### Règles d'or
- **Ceux qui ÉCRIVENT du code ne travaillent jamais en parallèle** sur la même feature : deux décisions contradictoires donnent un résultat inassemblable.
- **Parallèle seulement si indépendant** : fichiers séparés, **même source pour tous** (`docs/design.md`, preset) ; c'est toi qui assembles et vérifies la cohérence.
