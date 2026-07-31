# Exemple de référence — section « Témoignages » (Astro 7 + Keystatic + shadcn)

> Patron à imiter avec `/new-feature`. Montre : collection CMS → content collection → page statique + îlot unique.

## CMS — `keystatic.config.ts`
```ts
import { config, fields, collection } from '@keystatic/core';
export default config({
  storage: { kind: 'local' },
  collections: {
    temoignages: collection({
      label: 'Témoignages', slugField: 'auteur', path: 'src/data/temoignages/*',
      schema: { auteur: fields.slug({ name: { label: 'Auteur' } }), citation: fields.text({ label: 'Citation', multiline: true }) },
    }),
  },
});
```

## Collection Astro — `src/content.config.ts` (OBLIGATOIRE)
Depuis Astro 6, un dossier ne crée plus de collection. Sans cette déclaration,
`getCollection('temoignages')` renvoie **une liste vide** — et le build **réussit quand même**
(`astro build` sort en 0, la page publie une section vide). Rien ne t'avertit : seul
`astro check` le dit (`The collection "temoignages" does not exist or is empty`). C'est pour ça
que le typecheck de la stack est `astro check` et pas `tsc`. Le `base` du `loader` vise le
**même dossier** que le `path` Keystatic.
```ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod'; // `z` depuis 'astro:content' est déprécié
import { glob } from 'astro/loaders';

const temoignages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/data/temoignages' }),
  schema: z.object({ auteur: z.string(), citation: z.string() }),
});

export const collections = { temoignages };
```

## Page — `src/pages/index.astro` (statique, zéro JS)
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

## Îlot interactif — `src/components/carousel-temoignages.tsx` (UN seul .tsx)
```tsx
// Tous les composants shadcn interactifs liés vivent ICI (le contexte React n'existe qu'à l'intérieur d'un îlot).
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
export default function CarouselTemoignages({ items }: { items: { auteur: string; citation: string }[] }) {
  return (<Carousel><CarouselContent>{items.map((t) => <CarouselItem key={t.auteur}>{t.citation}</CarouselItem>)}</CarouselContent></Carousel>);
}
```
Dans la page : `<CarouselTemoignages items={…} client:visible />`.

Points clés : contenu éditable sans code (Keystatic), **collection déclarée avec son `loader`**, page statique par défaut, interactivité isolée dans UN îlot, composants shadcn jamais modifiés à la main.
