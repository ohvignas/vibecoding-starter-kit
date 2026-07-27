## Règle CSS maquette → app (hygiène)

`maquette/` est une **référence visuelle**, pas du CSS à copier-coller en bloc.

- **Jamais** de découpe par **plages de lignes** : soit le fichier entier, soit des **règles complètes** (du sélecteur au `}` fermant).
- **Jamais** de gros bloc maquette collé tel quel : extrais **uniquement les sélecteurs complets** du domaine, dans un petit fichier dédié (`src/styles/auth.css`) — jamais un collage CRM + auth mélangés.
- **Écrans React** : **shadcn/ui + Tailwind d'abord**, le CSS maquette n'est qu'une référence.
- **Après toute modif de `src/styles/*`** : **Accolades équilibrées** (autant de `{` que de `}`) ; le fichier servi (`curl` sur `app.css`) est du **vrai CSS**, pas une page d'erreur Vite/Tailwind ; puis le rendu (« Règle de vérification ») montre la couleur **primaire** de `docs/design.md` — un gris système = CSS non appliqué, corrige avant de continuer.
