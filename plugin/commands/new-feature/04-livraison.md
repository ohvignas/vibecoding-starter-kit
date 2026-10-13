# 04 — Livraison

> Étape 04/04 de `/new-feature` — les temps **7** à **10** de la boucle, puis le contrôle de fin. **Le cadre** (la boucle d'itération d'`AGENTS.md`, les gates humains) est dans le sommaire : `../new-feature.md`. On n'arrive ici qu'avec le verdict de `03-verification.md`.

### 7. Commit
`git add -A` puis `git commit` en **Conventional Commits** (`feat:`, `fix:`, `docs:`… + un corps qui dit le *pourquoi*). Aucun plugin de commit n'est installé par le kit : c'est `git`, directement.

### 8. PR
`git push -u origin HEAD` puis `gh pr create --fill --base <la base relevée au préflight>`. Description = quoi + pourquoi + comment tester (les AC). La cible n'est **jamais** écrite d'avance : tu as branché depuis cette base, la PR y revient — sinon tu ouvres la PR ailleurs que là d'où tu es parti.

### 9. CI — surveille jusqu'au bout
`gh pr checks <n>` puis `gh run watch <id> --exit-status`. Rouge → diagnostiquer (`superpowers:systematic-debugging`), pas de merge.

### 10. Merge sur **la base d'où tu es parti** (`superpowers:finishing-a-development-branch`, squash)
Celle relevée au préflight, pas une autre. **N'invente aucune branche d'intégration** : le scaffold n'en crée pas, et un dépôt qui en a une l'a déjà.

## Fini quand
Mergé sur **la base relevée au préflight** (CI verte + review OK, un PR à la fois) **ET** **chaque critère d'acceptation testé en live** par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche d'aller au bout → **dire exactement ce qui manque**.
