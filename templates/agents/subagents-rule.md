## Règle sous-agents (quand déléguer, comment)

Un **sous-agent** = une copie de l'IA sur **une tâche isolée**, en **contexte frais** : il n'hérite **pas** de la conversation.

### Quand en créer
- **Code à construire** → `superpowers:subagent-driven-development` : 1 implémenteur **par tâche**, en séquence → 1 reviewer → fix (boucle de `/build` et `/new-feature`).
- **Largeur en LECTURE** (recherche, audit, critique, vérification) → **fan-out parallèle**, un par morceau, puis tu synthétises.
- **Tâche lourde et isolée** → 1 sous-agent ciblé. **Courte ou triviale** → aucun.

### Le contrat (il ne voit pas le chat → donne-lui tout)
0. **Modèle** — **`claude-sonnet-5`** pour tous ; **unique exception : `security-reviewer`, sur `claude-opus-5`**. Nulle part ailleurs le kit ne fixe de modèle (Claude Code : champ `model` · Cursor : sélecteur · Codex : dans le brief).
1. **Sa tâche**, une seule, précise. 2. **Ses skills** — un sous-agent design charge les skills design (« Règle design »), chacun les siens, **à chaque fois**. 3. **Les fichiers à lire**, chemins exacts. 4. **Ses règles** : il ne voit ni `AGENTS.md` ni `CLAUDE.md`. 5. **L'artefact à rendre** : un fichier précis ou un **résumé court**, jamais 10 000 tokens.

### Le crew du kit
Il vit dans le dossier d'agents de ton assistant (`.cursor/agents/` · `.claude/agents/` · `docs/agents/crew/` pour Codex) ; `/help` en donne la liste et les rôles. Améliore un agent **là**, tous les projets en profitent. Plusieurs critiques : **lentille différente** (produit / données / UX), pas un ton plus sévère · **preuve obligatoire**, un finding sans « où ça se vérifie » est jeté · **2 passes maximum** · **dédoublonne** · critique **détaché** de l'auteur.

### Règles d'or
- **Les sous-agents qui ÉCRIVENT du code ne travaillent jamais en parallèle** sur la même feature : deux décisions implicites contradictoires donnent un résultat inassemblable. Le fan-out est réservé à la **lecture** ; pour construire, **un implémenteur à la fois**.
- **Parallèle seulement si indépendant** : fichiers séparés, **même source pour tous** (`docs/design.md`, preset) ; c'est toi qui assembles et repasses sur la cohérence.
- Ne recopie **pas** le chat dans leur prompt : le contexte frais **est** la valeur.
