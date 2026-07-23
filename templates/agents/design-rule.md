## Règle design (avant TOUTE édition UI/UX)

Avant de créer ou modifier une interface, **charge d'abord le contexte design** — sinon tu codes une UI hors-charte :

1. Charge les **4 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`.
2. Lis **`docs/design.md`** (design system du projet : couleurs, typo, espacements, états).
3. Édite en respectant ce contexte. Screenshot **avant/après** pour vérifier le rendu.

Pour des **sections/pages** vite faites : pioche des **blocs pré-faits shadcnblocks** via le CLI shadcn — `npx shadcn add @shadcnblocks/<bloc>` (gratuits **sans clé** ; `SHADCNBLOCKS_API_KEY` pour le pro) — puis adapte-les à `docs/design.md`. Ce n'est **pas** un skill à charger.
4. **Plancher accessibilité** : contraste lisible, focus clavier visible, `alt` sur les images, cibles tap assez grandes (≈44px).

**Pas de `docs/design.md` ?** Ne code pas à l'aveugle. Génère-en un **express** avec les 4 skills design (un pattern connu + couleurs/typo/espacements de base) — ou, en shadcn/Tailwind, fais régler le thème par l'utilisateur sur **[tweakcn.com](https://tweakcn.com)** (gratuit, sans compte) et intègre son export CSS. Fais **valider**, puis édite. Version complète : `/new-project` (Phase 5).

Cette règle s'applique aussi pendant `/new-feature`, pas seulement via `/edit-design`.
