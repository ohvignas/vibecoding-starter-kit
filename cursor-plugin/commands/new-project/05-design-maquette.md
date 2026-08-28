# 05 — Design et maquette

> Étape 05/08 de `/new-project` — le pivot du projet. **Mode de travail et tags** : `00-mode-et-cadre.md`. Sommaire : `../new-project.md`.

## Maquette + Design → `maquette/` + `docs/design.md` (gate)

La **maquette est le pivot** : on fixe le design **avant** de coder, on **itère** jusqu'à validation, puis la roadmap en découle (étape `06-roadmap.md`). Ne code rien ici.

**Demande d'abord à l'utilisateur son cas** (pour les écrans) — aucune réponse ne bloque :

- **(a)** « J'ai déjà une maquette sur **Stitch** »
- **(b)** « J'ai une maquette **ailleurs** » (Figma, images, HTML)
- **(c)** « Je **n'ai pas** de maquette »

L'ordre du travail dépend du cas : si une maquette existe déjà (a/b), on en **dérive** le design ; s'il n'y en a pas (c), on fixe le **design d'abord**, puis on dessine.

### ⛔ AVANT de générer une maquette dans un outil externe — donne-lui les contraintes de sortie

Claude Design, Stitch, Lovable, v0… chacun a **ses habitudes** : `style=""` en dur, images en `background-image`, du JavaScript, des `<div>` partout. Un export fait à leur façon coûte des heures de reprise à l'intégration — et l'utilisateur ne le découvre qu'après avoir validé sa maquette.

**Si l'utilisateur s'apprête à générer sa maquette dans un outil, donne-lui d'abord ce bloc à coller dans son prompt** (adapte la 1ʳᵉ ligne à la stack : `Astro 7 + Tailwind v4` en vitrine, `React + Tailwind v4` en saas/desktop) :

```
Contraintes de sortie — le HTML sera intégré dans Astro 7 + Tailwind v4 :

1. Tailwind v4 uniquement. AUCUN attribut style="". Si aucune classe
   ne correspond, utilise une valeur arbitraire : p-[26px], bg-[#E8008A].
2. Charge Tailwind par CDN dans le <head> pour l'aperçu — je le retire
   à l'intégration.
3. Les couleurs et polices de la charte : des variables CSS dans un seul
   bloc <style> en tête. Rien de dupliqué ailleurs.
4. Chaque section enveloppée : <section data-section="hero">, un nom par
   section. C'est ce qui me donne les points de découpe en composants.
5. Images : <img> avec width et height explicites, alt rempli, chemins
   sous assets/. Jamais de background-image en CSS pour une image de
   contenu.
6. Polices : <link> Google Fonts si possible. Sinon nomme-les.
7. HTML sémantique : un seul <h1>, <main>, <nav>, <footer>, titres dans
   l'ordre h1 → h2 → h3 sans saut.
8. Pas de JavaScript. Les composants interactifs figés dans leur état
   initial, avec un commentaire décrivant le comportement attendu.
```

**Ce que chaque contrainte t'achète, à l'intégration :** le `data-section` donne les **points de découpe en composants** sans relire le HTML · les `width`/`height` explicites évitent le décalage de mise en page au chargement · l'ordre des titres et le `<h1>` unique, c'est le SEO qui est déjà gagné · le CDN Tailwind dans le `<head>` fait que la maquette **s'affiche seule** dans `maquette/index.html`, sans build · et « pas de JavaScript » évite de reprendre un comportement que tu vas de toute façon réécrire.

⚠️ **La maquette n'est pas le produit.** Ce HTML sert de **référence visuelle** et de découpe — tu réécris les composants dans la stack, tu ne colles pas l'export dans `src/`.

### Cas (a) / (b) — une maquette existe → on en dérive le design
1. Récupère la maquette dans `maquette/` :
   - **(a) Stitch** : connecte le MCP (voir `docs/A-FAIRE.md`), `list_projects` → `list_screens` → pour chaque écran validé `get_screen` (`htmlCode`) → écris-le dans `maquette/<ecran>.html`.
   - **(b) Ailleurs** : demande à l'utilisateur de **déposer ses exports/captures dans `maquette/`** (un fichier par écran) ; ça te sert de référence visuelle.
   - ⛔ **Dans les deux cas, si la maquette n'est pas encore générée**, donne d'abord les **contraintes de sortie** ci-dessus : c'est le seul moment où elles coûtent zéro.
2. **Dérive `docs/design.md`** de la maquette validée (les deux volets « Le design system » ci-dessous).
3. Génère la galerie **`maquette/index.html`** : une page qui liste chaque écran dans une `<iframe>` (titre + aperçu), pour tout valider d'un coup d'œil.

> Beaucoup d'écrans ? **délègue un sous-agent par écran** pour les importer/normaliser sur `docs/design.md` (mêmes skills : `AGENTS.md → « Règle design »`).

### Cas (c) — pas de maquette → **design d'abord, maquette ensuite** (étape par étape)

**Étape 1 — `docs/design.md` D'ABORD (préférences shadcn → questions → skills).**
Charge les **4 skills design** (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) + le skill **`design-md`**.

- **Stack web (saas / desktop / vitrine) — commence par récupérer les préférences visuelles :** demande à l'utilisateur d'**ouvrir le compositeur de thème shadcn** en partant de ce preset de départ → **[ui.shadcn.com/create?preset=b27GcrRo](https://ui.shadcn.com/create?preset=b27GcrRo)**, de régler **en visuel** couleurs / rayons / typo, puis de te **renvoyer son code de preset** (l'URL `?preset=<code>`). Ces préférences = **base de `docs/design.md`** (palette/typo/rayons) ; **note le preset pour l'étape `07-scaffold.md`** (le scaffold l'appliquera). Pour affiner encore : **[tweakcn.com](https://tweakcn.com)** (export variables CSS).
- **Mobile** : jamais shadcn (c'est du DOM web) → NativeWind + patterns RN.

Puis **affine par un vrai aller-retour, une question à la fois** (mode pas à pas) — ce que le preset ne dit pas : ambiance/personnalité de la marque, références qui plaisent, public visé, densité, clair/sombre. Appuie-toi sur les parcours **UJ-*** du PRD. Écris le tout dans **`docs/design.md`** (volets A/B ci-dessous). **→ fais VALIDER `docs/design.md` avant de dessiner.**

**Étape 2 — la maquette ENSUITE : un sous-agent par page (en parallèle), en shadcn/ui.**
`docs/design.md` validé → dessine, **une page = un sous-agent** :
1. Liste les **écrans porteurs** (des parcours **UJ-*** du PRD) : entrée canonique, écran héros du flux le plus complexe, un overlay, la vue liste/dashboard.
2. **Délègue chaque écran à un sous-agent, en parallèle.** Chaque sous-agent, **à chaque fois** :
   - **charge les skills design** → voir **`AGENTS.md` → section « Règle design »** (la liste de référence : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`) ;
   - lit **`docs/design.md`** (preset + tokens) — **même source pour tous = maquette cohérente** ;
   - produit **sa page** calquée shadcn/ui (composants type shadcn, tokens du preset, Tailwind CDN) → écrit `maquette/parts/<ecran>.html` ;
   - pour aller vite : **repère** les blocs shadcnblocks qui collent (`hero`, `pricing`, `features`…) et recopie leur structure en HTML/Tailwind CDN. On ne les **installe pas** ici : le registry n'est câblé qu'à l'étape `07-scaffold.md`, sur un projet scaffoldé — la maquette, elle, n'est qu'un dossier de pages ;
   - **auto-vérifie avant de rendre sa part** : ouvre-la dans le navigateur + screenshot, corrige si c'est cassé ;
   - puis compare à l'écran maquette de référence, à l'œil ou avec **PixelRAG** s'il est installé : cette comparaison d'images **alerte, elle ne tranche pas** (voir « Règle de vérification »).
3. **Assemble** les parts en **UN SEUL fichier `maquette/index.html`** — chaque écran = une **section pleine largeur, titrée, empilée**. Fais une **passe de cohérence** (mêmes boutons/espacements/typo partout), puis un seul fichier à ouvrir pour tout voir.
- **Stitch connecté** : à la place, un `generate_screen_from_text` par écran (skill `stitch::generate-design`) en passant le design → importe dans `maquette/`.
- **Mobile** : sous-agents calqués **NativeWind / patterns RN** (pas shadcn).

> Rappel : la maquette **EST** le design final (le scaffold de l'étape `07-scaffold.md` la transforme en **vrais composants shadcn**, même preset), pas un wireframe gris.

**Itère jusqu'à validation** : montre, applique les retours, recommence. Vrai aller-retour, pas un one-shot.

### Le design system → `docs/design.md` (deux volets)
Avec les 4 skills design, fixe (cas c) ou extrais de la maquette (cas a/b) DEUX volets :

**A. DESIGN.md — l'identité visuelle** *(format google-labs design.md)*
- *Frontmatter tokens* (machine) : `colors` (nom→hex), `typography` (fontFamily/size/weight/lineHeight), `rounded`, `spacing`, `components` (composant→tokens).
- *Marque & style* · *Couleurs* (rôle) · *Typographie* (rôles, échelle) · *Layout & espacements* (grille, breakpoints) · *Élévation* (ombres) · *Formes* (rayons) · *Composants* (specs par composant) · *À faire / à éviter*.
- shadcn/Tailwind : réfère les tokens par nom plutôt que de tout redéfinir. Affine sur **[tweakcn.com](https://tweakcn.com)** → colle dans `globals.css` + les *tokens* de `docs/design.md`. Le scaffold appliquera ce preset à l'étape **`07-scaffold.md`** (la commande exacte y est écrite — ne la recopie pas ici, elle a cinq drapeaux obligatoires).

**B. EXPERIENCE.md — le comportement**
- *Fondation* (form-factor, système d'UI) · *Architecture de l'information* · *Voix & ton* (microcopy) · *Patterns de composants* + *d'état* (chargement/vide/erreur/succès) · *Primitives d'interaction* · *Plancher d'accessibilité* · *Flux clés* (parcours avec protagoniste nommé + climax).

→ **validation utilisateur** (la maquette **et** le `design.md`) avant l'étape `06-roadmap.md`.
