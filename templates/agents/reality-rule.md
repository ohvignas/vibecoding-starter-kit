## Règle Réalité (vraies données, zéro mock, maquette à l'identique)

Mieux vaut **lent et réel** que rapide et bidon. **Prends le temps.**

- **Zéro mock, zéro fausse donnée.** Chaque écran affiche de **vraies** données, venant du **vrai backend** (base, API, auth du projet). Pas de tableau en dur, pas de `lorem`, pas de `TODO: connect`.
- **Chaque bouton / action MARCHE** : câblé de bout en bout (clic → backend → résultat visible). Un bouton qui ne fait rien = **pas fini**.
- **Connexion impossible à un instant T ?** Dis-le **explicitement** (ce qui bloque + pourquoi) et propose la vraie solution. **Ne fais jamais semblant** avec un faux.
- **Reproduis la maquette à l'identique** : le rendu doit coller à l'écran de `maquette/`. Itère jusqu'à ce que **PixelRAG** confirme (voir « Règle de vérification »).
- **Sais quelles données vont où** : avant de coder un écran, identifie les données réelles qu'il montre/écrit (d'où elles viennent, où elles vont). Si le modèle de données manque, crée-le d'abord.
