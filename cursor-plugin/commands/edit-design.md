# /edit-design — Éditer l'UI avec tout le contexte design (runbook IA)

Argument : `$ARGUMENTS` = ce qu'il faut changer dans l'UI.
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande à l'utilisateur ce qu'il faut changer** avant de commencer.

**AVANT de toucher au moindre fichier d'interface**, charge le contexte design (sinon tu codes hors-charte) :

1. Charge les **4 skills design** : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `brand-guidelines`. Besoin d'une section entière ? Pioche un **bloc pré-fait** : `npx shadcn add @shadcnblocks/<bloc>` (gratuit sans clé ; `SHADCNBLOCKS_API_KEY` pour le pro), puis adapte-le à `docs/design.md`.
2. Lis **`docs/design.md`** (design system du projet : couleurs, typo, espacements, états, composants).
   - **Pas de `docs/design.md` ?** Ne code pas à l'aveugle : génère-en un **express** avec les 5 skills (pattern connu + couleurs/typo/espacements de base) — ou, en shadcn/Tailwind, fais régler le thème sur **[tweakcn.com](https://tweakcn.com)** (gratuit, sans compte) et intègre son export CSS. Fais **valider**, écris-le dans `docs/design.md`, puis continue. (Version complète : `/new-project` Phase 5.)
   - **Refaire le thème entier** (stack web) : nouveau preset sur [ui.shadcn.com/create](https://ui.shadcn.com/create) → ré-applique les variables CSS du preset dans `globals.css` (ne touche pas aux fichiers de composants).
3. Prends un **screenshot** de l'état actuel de la page concernée (référence avant/après).

Puis seulement :

4. Édite l'UI demandée en **respectant le design system + la marque** (composants shadcn existants, tokens, espacements).
5. **Re-screenshot** et compare : le rendu respecte-t-il `docs/design.md` ? Sinon, corrige avant de conclure.

Rappel : la règle design permanente est déjà dans l'`AGENTS.md` du projet (issue de `templates/agents/design-rule.md`) — elle s'applique aussi hors de cette commande.
