## Règle Réalité (vraies données, zéro mock, maquette à l'identique)

Mieux vaut **lent et réel** que rapide et bidon. **Prends le temps.**

- **Zéro mock, zéro fausse donnée** — **unique exception : les fichiers de test** (fixtures, stubs, `faker` y sont normaux). Ailleurs : ni tableau en dur, ni `lorem`, ni `TODO: connect`, ni stub bidon.
- **Vraies données du vrai backend** : chaque écran lit et écrit dans la base, l'API et l'auth **du projet**.
- **Chaque bouton / action MARCHE**, câblé de bout en bout (clic → backend → résultat visible). Un bouton qui ne fait rien = **pas fini**.
- **Connexion impossible ?** Dis **ce qui bloque et pourquoi**, propose la vraie solution. **Ne fais jamais semblant**.
- **Reproduis la maquette à l'identique**. Ce qui décide, c'est le gate de la « Règle de vérification » ; la comparaison d'images n'y est qu'un **signal indicatif, jamais bloquant**.
- **Sais quelles données vont où** avant de coder un écran : ce qu'il montre, ce qu'il écrit. Modèle manquant → crée-le d'abord.
