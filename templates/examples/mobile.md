# Exemple de référence — feature « Tâches » (Expo + Convex)

> Même backend Convex que le SaaS (`convex/schema.ts` + `convex/tasks.ts`, voir `docs/examples` du SaaS).

## Écran — `app/index.tsx`
```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
const tasks = useQuery(api.tasks.list) ?? [];
const add = useMutation(api.tasks.add);
// <FlatList data={tasks} renderItem={({item}) => <Text>{item.text}</Text>} />
```
Points clés : `EXPO_PUBLIC_CONVEX_URL`, `<ConvexProvider>` dans `app/_layout.tsx`, hooks réactifs.
