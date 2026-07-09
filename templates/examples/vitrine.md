# Exemple de référence — section « Témoignages » (Astro + Keystatic + shadcn)

> Patron à imiter avec `/new-feature`. Montre : collection CMS → content collection → page statique + îlot unique.

## CMS — `keystatic.config.ts`
```ts
import { config, fields, collection } from '@keystatic/core';
export default config({
  storage: { kind: 'local' },
  collections: {
    temoignages: collection({
      label: 'Témoignages', slugField: 'auteur', path: 'src/content/temoignages/*',
      schema: { auteur: fields.slug({ name: { label: 'Auteur' } }), citation: fields.text({ label: 'Citation', multiline: true }) },
    }),
  },
});
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

Points clés : contenu éditable sans code (Keystatic), page statique par défaut, interactivité isolée dans UN îlot, composants shadcn jamais modifiés à la main.
