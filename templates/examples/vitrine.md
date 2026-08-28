# Exemple de référence — section « Témoignages » (Astro 7 + Convex + shadcn)

> Patron à imiter avec `/new-feature`. Montre : table Convex → **lecture AU BUILD** → content collection → page statique + îlot unique.

⛔ Jamais `useQuery` ni `ConvexProvider` dans une page du site public : ces deux API ne s'exécutent que dans le navigateur, le HTML servi au crawler partirait **vide** et le JSON-LD n'aurait plus rien à décrire.
`useQuery` est réservé au `dashboard/`, qui n'est indexé par personne.

## Le contenu vit dans Convex — `dashboard/convex/temoignages.ts`
```ts
import { query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query('temoignages').order('desc').collect(),
});
```
La saisie se fait dans `dashboard/` (TanStack Start + Better Auth). Le site public ne fait que **lire**.

## Collection Astro — `site/src/content.config.ts` (OBLIGATOIRE)
Depuis Astro 6, un dossier ne crée plus de collection. Sans cette déclaration,
`getCollection('temoignages')` renvoie **une liste vide** — et le build **réussit quand même**
(`astro build` sort en 0, la page publie une section vide). Rien ne t'avertit : seul
`astro check` le dit (`The collection "temoignages" does not exist or is empty`). C'est pour ça
que le typecheck de la stack est `astro check` et pas `tsc`.

Le `loader` est **le seul endroit** qui parle à Convex : il tourne **pendant le build**, avec le
client serveur `ConvexHttpClient`. Le reste du site ne voit plus qu'une collection ordinaire.
```ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod'; // `z` depuis 'astro:content' est déprécié
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../dashboard/convex/_generated/api';

const temoignages = defineCollection({
  // Loader en ligne : une fonction async qui rend un tableau d'entrées avec leur `id`.
  loader: async () => {
    const convex = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const rows = await convex.query(api.temoignages.list, {});
    return rows.map((t) => ({ id: t.auteur, auteur: t.auteur, citation: t.citation }));
  },
  schema: z.object({ auteur: z.string(), citation: z.string() }),
});

export const collections = { temoignages };
```
⚠️ `PUBLIC_CONVEX_URL` doit être présente **au moment du build** de l'image du site (`build.args:`
dans le `compose.yaml`, pas `environment:`) — sinon le loader ne rend rien et le site part vide.

## Page — `site/src/pages/index.astro` (statique, zéro JS)
```astro
---
import { getCollection } from 'astro:content';
import { Card, CardContent } from '@/components/ui/card';
const temoignages = await getCollection('temoignages');
---
{temoignages.map((t) => (
  <Card><CardContent><p>« {t.data.citation} »</p><p class="text-muted-foreground">— {t.data.auteur}</p></CardContent></Card>
))}
```

## Îlot interactif — `site/src/components/carousel-temoignages.tsx` (UN seul .tsx)
```tsx
// Tous les composants shadcn interactifs liés vivent ICI (le contexte React n'existe qu'à l'intérieur d'un îlot).
// L'îlot ne parle pas à Convex : il reçoit ses données en props, déjà lues au build.
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
export default function CarouselTemoignages({ items }: { items: { auteur: string; citation: string }[] }) {
  return (<Carousel><CarouselContent>{items.map((t) => <CarouselItem key={t.auteur}>{t.citation}</CarouselItem>)}</CarouselContent></Carousel>);
}
```
Dans la page : `<CarouselTemoignages items={temoignages.map((t) => t.data)} client:visible />`.

## Après avoir publié un témoignage
Le contenu a changé dans Convex, **le site public n'a pas bougé** : il porte encore le HTML du
dernier build. Reconstruis-le — `npm run build --workspace site` — puis redéploie l'image du site.

Points clés : contenu saisi dans le `dashboard/`, **lu au build** par le `loader` de la collection, page statique par défaut, interactivité isolée dans UN îlot, composants shadcn jamais modifiés à la main.
