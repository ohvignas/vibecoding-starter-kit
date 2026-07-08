# /debug — Trouver et corriger un bug, méthodiquement (runbook IA)

Un truc ne marche pas. **Ne corrige pas au hasard.** Suis `superpowers:systematic-debugging`.

1. **Reproduire** : quelle action déclenche le bug ? Note les étapes exactes + le message d'erreur **complet** (terminal, console navigateur, test).
2. **Isoler** : où ça casse ? Réduis à la plus petite portion (un fichier, une fonction, un appel). Lis le code concerné, ne devine pas.
3. **Hypothèse** : formule UNE cause probable, en une phrase (« la session est nulle car l'auth n'est pas branchée »).
4. **Tester l'hypothèse** : écris un test (ou un `console.log` ciblé) qui la confirme ou l'infirme AVANT de corriger.
5. **Corriger au minimum** : le plus petit changement qui règle la cause (pas un contournement).
6. **Vérifier en vrai** : relance l'app (`docs/RUN.md`), refais l'action → le bug a disparu. Relance les tests.
7. **Noter** : écris le piège + la solution dans `docs/memory/gotchas.md` pour ne pas le revivre.

> **Règle des 3 essais** : 3 corrections ratées sur le même bug → STOP, reviens au dernier état vert (`/sos`), repars d'une conversation neuve. Ne t'acharne jamais.
