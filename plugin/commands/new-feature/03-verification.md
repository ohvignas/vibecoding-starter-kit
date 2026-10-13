# 03 — Vérification

> Étape 03/04 de `/new-feature` — les temps **4** à **6bis** de la boucle : prouver, avant de livrer. **Le cadre** (la boucle d'itération d'`AGENTS.md`, les gates humains) est dans le sommaire : `../new-feature.md`. Les `AC` que cette étape vérifie viennent de `01-spec-de-feature.md`.

### 4. Review code (`superpowers:requesting-code-review`)
Bugs, conventions, sécurité du diff. Lance le sous-agent `code-reviewer` sur le diff : il existe sur les 3 assistants, la commande `/code-review` seulement sur Claude Code.

### 5. Test live — vérifie CHAQUE critère d'acceptation en vrai
Lance l'app et **valide chaque `AC-n`** de la spec : navigateur pour le web, fenêtre pour desktop, smoke pour mobile. Screenshot(s) à l'appui (voir **« Règle de vérification »** dans `AGENTS.md`). Un AC non satisfait → retour à l'exécution, `02-plan-et-execution.md` (`superpowers:systematic-debugging`).

### 6. Sécu
Revue sécurité des changements de la branche. Lance le sous-agent `security-reviewer` : il existe sur les 3 assistants, la commande `/security-review` seulement sur Claude Code.

### 6bis. Verdict (obligatoire avant commit)
Lance **`verificateur`** en contexte frais : il ne voit que le diff + les `AC`. **PROUVÉ** requis pour continuer. **NON PROUVÉ** → retour à l'exécution, `02-plan-et-execution.md`. **BLOQUÉ** → dis ce qui bloque, ne commit pas.
