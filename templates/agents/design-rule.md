## Règle design (avant TOUTE édition UI/UX)

Avant de créer ou modifier une interface, **charge d'abord le contexte design** — sinon tu codes une UI hors-charte :

1. Les **4 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`.
2. **`docs/design.md`** (couleurs, typo, espacements, états) — édite en le respectant, puis vérifie le rendu (« Règle de vérification »).
3. **Plancher accessibilité** : contraste lisible, focus clavier visible, `alt` sur les images, cibles tap ≈44 px.

**Pas de `docs/design.md` ?** Ne code pas à l'aveugle : génère-en un **express** avec les 4 skills, ou fais régler le thème sur **[tweakcn.com](https://tweakcn.com)** (shadcn/Tailwind) et intègre l'export CSS ; fais **valider**, puis édite (version complète : `/new-project` Phase 5).

Aller vite sur une section : `npx shadcn add @shadcnblocks/<bloc>` (gratuits sans clé, `SHADCNBLOCKS_API_KEY` pour le pro), adaptés ensuite à `docs/design.md` — ce n'est **pas** un skill. Cette règle vaut aussi pendant `/new-feature`.
