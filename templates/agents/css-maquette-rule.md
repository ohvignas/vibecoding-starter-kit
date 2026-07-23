## Règle CSS maquette → app (hygiène)

La maquette (`maquette/`) est une **référence visuelle**, pas du CSS à copier-coller en bloc dans l'app.

**Interdits**
- **Jamais** découper du CSS par **plages de lignes** (slices, concat partielle). Soit le **fichier entier**, soit des **règles complètes** (du sélecteur jusqu'au `}` fermant).
- **Jamais** coller un gros bloc maquette (ex. 800 lignes mêlant plusieurs domaines) dans un fichier. Extrais **uniquement les sélecteurs complets** du domaine concerné.

**Écrans React** : **shadcn/ui + Tailwind d'abord**. Le CSS maquette sert de **référence**, pas de dump brut.

**CSS custom** : dans un **petit fichier dédié** (ex. `src/styles/auth.css` propre), pas un collage mélangeant plusieurs domaines (CRM + auth…).

**Vérifier avant de continuer** (après toute modif de `src/styles/*`)
1. **Accolades équilibrées** : autant de `{` que de `}`.
2. **Le CSS compile** : lis / `curl` le fichier servi (ex. `app.css`) → c'est du **vrai CSS**, **pas** une page d'erreur HTML de Vite/Tailwind.
3. **Capture navigateur** : la couleur **primaire** de `docs/design.md` s'affiche (ex. bouton primaire `#FF7043`), **pas** un gris système → sinon le CSS n'est pas appliqué, corrige avant de continuer.
