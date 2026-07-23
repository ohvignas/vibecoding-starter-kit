## Règle de vérification (après CHAQUE implémentation)

Tu n'as **pas fini** tant que tu ne l'as pas **vu marcher**. Après **chaque** morceau implémenté (pas seulement à la fin) :

1. **Test auto** — lance les tests qui couvrent le changement, rouge → vert (`superpowers:verification-before-completion` : « fini » = prouvé par une commande).
2. **Teste dans le navigateur** — lance l'app (`docs/RUN.md`) et **ouvre l'écran concerné dans le navigateur** (web) · fenêtre (desktop) · simulateur/smoke (mobile). **Chaque assistant a un navigateur intégré** (Cursor, Claude Code, Codex) — utilise-le, ne devine pas le rendu.
3. **Screenshot** — prends une **capture d'écran** du résultat. C'est ta **preuve**, et ça attrape ce que les tests ne voient pas (rendu cassé, style, layout, texte coupé). Web : prends-en **deux**, **desktop** et **mobile** (redimensionne la fenêtre) — le mobile s'oublie vite.
4. **Compare à la maquette** — le rendu doit s'approcher de l'écran correspondant dans `maquette/`. Sinon, corrige **avant** de continuer.
5. **Cassé ?** → `superpowers:systematic-debugging`. On **ne passe pas** à la suite sur un écran cassé.

Ne dis **jamais** « c'est fait » sans **test vert + screenshot du navigateur** à l'appui.
