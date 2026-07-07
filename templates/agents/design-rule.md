## Règle design (avant TOUTE édition UI/UX)

Avant de créer ou modifier une interface, **charge d'abord le contexte design** — sinon tu codes une UI hors-charte :

1. Charge les **5 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`.
2. Lis **`docs/design.md`** (design system du projet : couleurs, typo, espacements, états).
3. Édite en respectant ce contexte. Screenshot **avant/après** pour vérifier le rendu.

**Pas de `docs/design.md` ?** Ne code pas à l'aveugle. Génère-en un **express** avec les 5 skills (un pattern connu + couleurs/typo/espacements de base) — ou, en shadcn/Tailwind, fais régler le thème par l'utilisateur sur **[tweakcn.com](https://tweakcn.com)** (gratuit, sans compte) et intègre son export CSS. Fais **valider**, puis édite. Version complète : `/new-project` (Phase 5).

Cette règle s'applique aussi pendant `/new-feature`, pas seulement via `/edit-design`.
