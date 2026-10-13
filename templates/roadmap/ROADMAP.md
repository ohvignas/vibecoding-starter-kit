# Roadmap — <projet>

> Généré depuis le PRD (features), le design et les domaines sélectionnés. **Ne rien oublier** : parcours toutes les dimensions ci-dessous.
> `/build` lit ce fichier à chaque tour et coche le jalon fini. Chaque jalon = une **tranche verticale** avec un **résultat visible**.

## Dimensions à couvrir
0. **Fondations** (env IA installé + scaffold + 1er boot) · 1. **Modèle de données** · 2. **Auth** · 3. **Chaque feature du PRD** · 4. **Domaines sélectionnés** (paiement, email, storage… voir `docs/DOMAINS.md`) · 5. **Passe UI/design** · 6. **États** (chargement / vide / erreur) · 7. **Tests** · 8. **Passe sécu** · 9. **Déploiement** · 10. **Docs** · 11. **Audit stack** (jouer les skills officiels d'audit : Convex + Better Auth)

> **Best practices d'abord.** Les jalons **Modèle de données**, **Auth** et **passe sécu** reprennent les règles des skills officiels de la stack (Convex : `convex-design`, `convex-authz`, `convex-crons` ; Better Auth : `better-auth-best-practices`, `better-auth-security-best-practices`). La roadmap **finit par un jalon « Audit stack »** qui joue `convex-reviewer`, `convex-authz`, `convex-optimize`, `convex-launch-readiness` sur le code livré.

## Jalons

- [ ] ## 0. Fondations — le projet démarre
  - Dépend de : —
  - Livre : environnement IA installé (`docs/A-FAIRE.md` joué) + scaffold de la stack + app qui démarre
  - Données / câblage réel : le scaffold branche le **vrai** backend de la stack (base/API/auth), pas de faux serveur ni de données bidon — l'app démarre connectée pour de vrai.
  - ✅ Ce que tu vois : l'app démarre (page / écran / fenêtre « hello ») — voir `docs/RUN.md`
  - Plan : docs/superpowers/plans/00-fondations.md

- [ ] ## 1. <titre de la première tranche>
  - Dépend de : 0
  - Livre : <ce que la tranche apporte>
  - Données / câblage réel : <quelles vraies données, d'où (table/API/auth), câblées au backend — ZÉRO mock>
  - ✅ Ce que tu vois : <résultat OBSERVABLE : un bouton/action qui MARCHE avec de vraies données>
  - Plan : docs/superpowers/plans/01-<slug>.md

<!-- Ajoute un jalon par tranche jusqu'à couvrir toutes les dimensions — chaque jalon câble de VRAIES données (zéro mock). -->

- [ ] ## N. Audit stack — vérifié par les skills officiels (dernier jalon)
  - Dépend de : tous les jalons précédents
  - Livre : ce que les skills d'audit (`convex-reviewer`, `convex-authz`, `convex-optimize`, `convex-launch-readiness`, `better-auth-security-best-practices`) ont trouvé, corrigé — sur le code **réellement livré**, pas sur le plan
  - Données / câblage réel : l'audit lit le vrai `convex/schema.ts`, les vraies fonctions et les vraies règles d'accès ; chaque `MANQUE` corrigé avec sa preuve
  - ✅ Ce que tu vois : les audits passent et chaque correction est vérifiée en live
  - Plan : docs/superpowers/plans/NN-audit-stack.md
