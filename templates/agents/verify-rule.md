## Règle de vérification (après CHAQUE implémentation)

Tu n'as **pas fini** tant que tu ne l'as pas **vu marcher** — le **design** ET le **fonctionnement**. Après **chaque** morceau, pas seulement à la fin :

**1. Test auto** — les tests qui couvrent le changement, rouge → vert (`superpowers:test-driven-development` + `superpowers:verification-before-completion`).

**2. RENDU** — lance l'app (`docs/RUN.md`), ouvre l'écran (web · fenêtre desktop · simulateur mobile). **Cursor et Claude Code** ont un navigateur intégré ; **Codex n'en a pas** → pilote-en un vrai via le **Playwright MCP**. **Screenshot desktop ET mobile** (redimensionne la fenêtre) : ça attrape ce que les tests ratent (layout, texte coupé, couleur primaire absente). Compare à `maquette/`, ne devine jamais le rendu.

**3. FONCTIONNEMENT (end-to-end)** — le parcours doit être **refait en vrai**, **délégué au sous-agent `test-runner` en contexte frais**. Donne-lui la feature, le **flux**, les **critères** (`UJ-*` du PRD, les `AC` de `/new-feature`), l'écran de départ, l'outil : **Playwright MCP** en web, **Maestro MCP** en mobile. Il porte ses exigences de preuve et ses cas limites, et rend un **rapport court** (AC ✅/❌ + capture + 1er point cassé).

**4. Le gate est déterministe.** **Bloquant** : `expect(page).toMatchAriaSnapshot()` **+** chaque élément interactif produit un signal (URL, DOM, **requête réseau**) **+** l'état survit à un **rechargement**. **Non bloquant** : la comparaison d'images avec `maquette/` (capture, ou **PixelRAG** si installé) alerte, elle ne tranche pas. Écart réel → corrige **avant** de continuer.

**5. Cassé ?** → `superpowers:systematic-debugging`, avant tout fix. On **ne passe pas** à la suite sur un écran cassé ou une feature qui ne marche pas.

**6. Verdict final** — lance le sous-agent **`verificateur`** (contexte frais) : sur un jalon ou une feature, c'est **lui** qui prononce `PROUVÉ` (« Règle Preuve »), **lui seul** qui le reporte dans `docs/agents/state.yaml` et `docs/agents/JOURNAL.md`.
