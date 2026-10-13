# 02 — Plan et exécution

> Étape 02/04 de `/new-feature` — les temps **2** et **3** de la boucle : le plan, puis le code. **Le cadre** (la boucle d'itération d'`AGENTS.md`, les gates humains) est dans le sommaire : `../new-feature.md`. Les `AC` dont tout dépend ici viennent de `01-spec-de-feature.md`.

### 2. Plan (`superpowers:writing-plans`) — gate
Plan TDD, tâches bite-sized, **dérivées des critères d'acceptation** (chaque AC → au moins un test). → **gate (validation)**.

Avant d'écrire le plan, charge le(s) **skill(s) officiels de best practices** de la stack (Convex : `convex-design`, `convex-authz`… ; Better Auth : `better-auth-best-practices`…) : les règles officielles deviennent des tâches, pas des surprises en revue.

### 3. Exécution (`superpowers:subagent-driven-development` + TDD)
Tâche par tâche, test rouge → vert (cadre de délégation : **« Règle sous-agents »** dans `AGENTS.md`). Un `[À CLARIFIER]` bloquant → repasse par la gate.
