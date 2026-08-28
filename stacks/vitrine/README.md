# Stack Site vitrine — Astro + TanStack Start + Convex + Better Auth

**Pour quoi ?** Un site qui **présente** (entreprise, portfolio, resto, assos) ou un **blog**, avec un **espace privé pour écrire le contenu** sans toucher au code. Le site public reste du HTML statique : c'est ce qui le rend rapide et trouvable.

Le projet porte **deux applications sous une seule racine** :

```
mon-projet/
├── site/         ← Astro : les pages publiques (ce que Google et les IA lisent)
├── dashboard/    ← TanStack Start : la saisie du contenu (privé, derrière une connexion)
└── package.json  ← la racine : elle pilote les deux (workspaces)
```

## Les briques
| Brique | Rôle | Pourquoi celle-là |
|---|---|---|
| **Astro 7** | `site/` — le site public | HTML statique par défaut → ultra rapide, imbattable en SEO. **Node ≥ 22.12 requis** |
| **TanStack Start** | `dashboard/` — l'espace de saisie | React full-stack, routes typées ; c'est le framework que Convex outille officiellement |
| **Convex** | la base de données + le backend | le contenu vit là, en TypeScript, sans serveur à gérer |
| **Better Auth** | la connexion au dashboard | comptes et sessions clé en main, via le composant officiel `@convex-dev/better-auth` |
| **shadcn/ui** | les composants (React en îlots) | beaux composants copiés dans TON code, thème par preset |
| **Tailwind v4** | le style | utilitaire, marche main dans la main avec shadcn |

## Le point à comprendre avant tout le reste : le site public lit Convex **au build**
Les pages publiques ne se connectent **jamais** à Convex depuis le navigateur. Elles lisent le contenu **pendant le build**, avec le client serveur `ConvexHttpClient`, dans le frontmatter d'une page `.astro` ou dans `getStaticPaths()`. Le HTML part du serveur **déjà rempli** : le crawler de Google, ChatGPT ou Perplexity trouve le texte tel quel.

Si une page publique lisait Convex depuis le navigateur, elle s'afficherait très bien pour un humain — et serait **vide pour tous les moteurs**. C'est une panne totale et silencieuse, et le SEO est la raison d'être de cette stack.

**Ce que ça coûte, et il faut le savoir avant de commencer :** publier un article dans le dashboard **n'atteint le site public que par une boucle de publication**, et il y en a deux — reconstruire tout le site, ou purger la seule page publiée. Ça se choisit **avant** d'écrire la première page ; le critère est dans `AGENTS.md`.

## Ce que cette stack optimise : SEO **et** GEO
- **SEO** (Google) : sitemap auto, robots.txt, meta/OG par page, JSON-LD, perfs au max.
- **GEO** (ChatGPT, Perplexity…) : `llms.txt` du site + données structurées → ton site peut être **cité par les IA**.

## Ordre de construction
0. **Vérifie ta version de Node** : `node --version` doit afficher **22.12 ou plus**. En dessous, Astro 7 s'arrête net avec `Please upgrade Node.js to a supported version: ">=22.12.0"`.
1. **`site/`** : `npx shadcn@latest init --template astro --base base --no-monorepo --preset <ton-code> --name site --yes` (crée l'app Astro + shadcn avec TON thème, dans `site/`) — le preset se choisit sur [ui.shadcn.com/create](https://ui.shadcn.com/create). Contrôle ensuite `cd site && npx astro --version` — **depuis la racine, la commande ne mesure rien** (`npx canceled due to missing packages`, ou la version du registre au lieu de la tienne). **Ce kit est écrit pour Astro 7**. Si tu vois un majeur plus récent, demande au MCP `astro-docs` ce qui a changé avant de suivre ces règles.
2. **`dashboard/`** : `npm create convex@latest dashboard -- -t tanstack-start` (crée l'app TanStack Start + Convex), puis **Better Auth dans `dashboard/` uniquement**, en suivant le [guide officiel TanStack Start](https://labs.convex.dev/better-auth/framework-guides/tanstack-start).
3. **Les quatre scripts — ils existent déjà, vérifie-les.** Les deux templates posent `typecheck` **et** `lint`, et installent **eslint** avec sa config : `astro check` + `eslint .` dans `site/`, `tsc --noEmit` + `eslint …` dans `dashboard/`. ⛔ Ne les remplace pas par un autre linter : aucun des deux templates n'installe biome, et `npm run lint` sortirait **127** (`command not found`). Les scripts de la racine appellent les deux applications **sans `--if-present`** : s'il en manque un, chaque écriture de fichier affiche « ⚠ problème détecté ».
   ⚠️ Une correction obligatoire dans `site/` : `src/components/ui/button.tsx`, écrit par `shadcn init`, viole la config eslint écrite par `shadcn init`. Ajoute `{ files: ["src/components/ui/**"], rules: { "react-refresh/only-export-components": "off" } }` à la fin de `site/eslint.config.js` — sinon `npm run lint` est rouge dès le premier jour.
4. **La racine, en dernier** : un `package.json` avec `workspaces: ["site", "dashboard"]` et les scripts `typecheck`/`lint`/`build` qui ratissent les deux. C'est lui qui fait exister les vérifications du kit : sans lui, elles retombent sur un repli qui n'entre dans aucun des deux dossiers et sort vert sans rien avoir vu.
5. **Le schéma Convex** : une table par type de contenu (pages, articles, témoignages…), avec les champs qui remplissent les balises SEO (slug, titre, description, date).
6. **Pages** depuis la maquette (accueil, offres, contact…), alimentées par la lecture au build. Le contenu qui ne bouge jamais (mentions légales) peut rester en content collections, déclarées dans `site/src/content.config.ts` avec leur `loader`.
7. **SEO/GEO** : sitemap + `site/public/robots.txt` + `<SEO />` + JSON-LD + `site/public/llms.txt`. ⚠️ **Ces fichiers vont dans `site/public/`, pas à la racine du projet** — posés à la racine, ils ne sont servis par personne et le SEO tombe sans un mot.
8. **Déploiement** : **Docker sur un VPS** — une image pour le site statique, une pour le dashboard, un reverse-proxy TLS devant. Convex tourne en cloud.

## Lancer
**Deux terminaux**, pas trois :
```bash
cd dashboard && npm run dev        # http://localhost:3000  — l'espace de saisie
cd site && npm run dev             # http://localhost:4321  — le site public
```
⚠️ Le `dev` du dashboard vaut `convex dev --start 'vite dev'` : il démarre **le backend Convex ET
le tableau de bord**. Lancer `npx convex dev` à côté ferait tourner **deux Convex** sur le même
déploiement — logs en double, et rien pour dire d'où ça vient.
Et après chaque publication : en **modèle 1**, la commande qui remet le site à jour est `npm run build --workspace site` ; en **modèle 2**, il n'y a rien à lancer — la publication purge la page concernée toute seule.

## FAQ débutant
- **C'est quoi un îlot ?** Ta page est du HTML pur ; un îlot = un composant React chargé UNIQUEMENT là où il faut de l'interactivité. C'est pour ça que c'est rapide. Un îlot du site public ne parle pas à Convex : il reçoit ses données en props.
- **Je veux changer les couleurs.** Refais un preset sur ui.shadcn.com/create ou règle les variables CSS sur tweakcn.com — jamais dans les fichiers de composants.
- **Le client peut éditer le contenu ?** Oui : il se connecte au dashboard, il écrit, il publie. Prévois la boucle de publication **avant** de lui montrer : soit tu reconstruis tout le site à chaque fois (`npm run build --workspace site`, puis la reconstruction de l'image sur le VPS), soit la publication purge la seule page concernée et rien n'est reconstruit. Sans l'une des deux, il écrira dans le vide sans comprendre pourquoi rien ne bouge.
- **Pourquoi deux applications et pas une ?** Parce qu'elles n'ont pas le même métier : le site public doit être **statique** pour être indexé, le dashboard doit être **vivant** pour être agréable à utiliser. Les mélanger, c'est perdre l'un ou l'autre.
- **Est-ce que ça reste gratuit ?** Non. Convex a un palier gratuit, mais le VPS se loue. C'était le prix à payer pour avoir un vrai espace de saisie.

## 👉 Prochaine étape

Ouvre **`stacks/vitrine/prompts-de-demarrage.md`** pour les prompts prêts à copier-coller à ton IA, étape par étape.
