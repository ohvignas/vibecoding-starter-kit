## Règle Preuve (statuts, hiérarchie, interdits)

Un agent qui dit « c'est fait » n'apporte **aucune** information : les agents saturent les tests qu'ils voient (95-100 %) pendant que les tests cachés tombent à 35 %. Ici, on ne déclare pas — on **prouve**.

### Statuts autorisés
**PROUVÉ** · **NON PROUVÉ** · **BLOQUÉ**. Les mots « fait », « ça marche », « implémenté », « terminé » **sans preuve collée** sont interdits.
- **PROUVÉ** = la commande est écrite, sa **sortie brute est collée**, et elle sort en code 0.
- **NON PROUVÉ** = tu ne peux pas produire la preuve → dis-le, avec ce qui manque.
- **BLOQUÉ** = tu ne peux pas avancer → dis **ce qui échoue**, **ce que tu as essayé**, **ton hypothèse**. Dire « bloqué » est un **succès**, pas un échec.

### Hiérarchie de preuve (du plus faible au plus fort)
0. « L'agent déclare que c'est fait » → **nul, jamais accepté**.
1. Build / typecheck / lint verts → faible (absence d'erreur grossière).
2. Tests écrits par l'agent dans le même run → **faible et circulaire**.
3. Test committé **ROUGE avant** le code → moyen (rompt la circularité).
4. **Parcours réel** : navigateur/simulateur + **≥1 requête réseau observée** + état revérifié **après rechargement** → fort.
5. Critère vérifié par un test que l'agent **n'a pas écrit**, jugé en **contexte frais** → maximal.

### Interdits (non négociables)
- **Modifier, supprimer, skipper** (`.skip`, `xit`, `it.only`) ou assouplir un test pour passer au vert. Un test doit changer ? **Arrête-toi et demande.**
- Livrer **mock, `faker`, lorem, données en dur, TODO/FIXME, stub** hors des fichiers de test.
- Cocher une tâche sans avoir collé la **sortie de la commande** dans `docs/agents/JOURNAL.md`.
- Déclarer une feature UI finie sans qu'un **parcours réel** ait tourné.

### Boucle
**Maximum 3 tentatives** sur le même check. À la 3ᵉ : **BLOQUÉ** + ce qui échoue + ce que tu as essayé + ton hypothèse. Ne boucle jamais « jusqu'à ce que ça marche ».
