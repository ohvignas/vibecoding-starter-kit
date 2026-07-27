## Règle Preuve (statuts, hiérarchie, interdits)

Ici on ne déclare pas, on **prouve** : un agent sature les tests qu'il voit pendant que les tests cachés tombent à 35 %.

### Statuts
**PROUVÉ** · **NON PROUVÉ** · **BLOQUÉ**. « Fait », « ça marche », « terminé » **sans preuve collée** : interdits.
- **PROUVÉ** = commande écrite, **sortie brute collée**, code de sortie 0.
- **NON PROUVÉ** = tu ne peux pas produire la preuve → dis-le, avec ce qui manque.
- **BLOQUÉ** = tu ne peux pas avancer → **ce qui échoue**, **ce que tu as essayé**, **ton hypothèse**. Dire « bloqué » est un **succès**.

### Qui prononce PROUVÉ
**Une tâche** (un test, un check, une commande) : **toi**, si tu colles la commande **et** sa sortie. **Un jalon ou une feature** : le sous-agent **`verificateur` seul**, en contexte frais — on ne s'auto-décerne jamais `PROUVÉ` sur ce qu'on a écrit soi-même.

### Hiérarchie de preuve (croissante)
0. Déclaration de l'agent → **nulle**. 1-2. Build / lint verts, ou tests écrits par l'agent dans le même run → **circulaire**. 3. Test committé **ROUGE avant** le code → moyen. 4. **Parcours réel** : **≥1 requête réseau observée** + état revérifié **après rechargement** → fort. 5. Test que l'agent **n'a pas écrit**, jugé en **contexte frais** → maximal.

### Interdits (non négociables)
- **Modifier, supprimer, skipper** (`.skip`, `xit`, `it.only`) ou assouplir un test **existant** : en ajouter est normal, toucher à un test déjà là → **arrête-toi et demande**.
- Livrer du faux (mock, `faker`, lorem, données en dur, TODO/FIXME, stub) → « Règle Réalité ».
- Cocher une tâche sans la **sortie de la commande** collée dans `docs/agents/JOURNAL.md`.
- Déclarer une feature UI finie sans **parcours réel** joué.

### Règle des 3 tentatives (référence unique du kit)
**3 tentatives maximum** sur le même check ou le même bug. À la 3ᵉ : **STOP**, statut **BLOQUÉ**, piège noté dans `docs/memory/gotchas.md`. Repartir du dernier état vert (commit ou tag `jalon-*`) est une **option que tu proposes, que l'utilisateur tranche** — jamais automatique. Ne boucle jamais « jusqu'à ce que ça marche ».
