# Exemple de référence — feature « Tâches » (Convex + TanStack Start)

> Patron à imiter avec `/new-feature`. Montre le scoping par utilisateur + query réactive + mutation.

## Schéma — `convex/schema.ts`
```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  tasks: defineTable({ text: v.string(), done: v.boolean(), userId: v.string() }).index("by_user", ["userId"]),
});
```

## Backend — `convex/tasks.ts`
```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({ args: {}, handler: async (ctx) => {
  const id = (await ctx.auth.getUserIdentity())?.subject; if (!id) return [];
  return ctx.db.query("tasks").withIndex("by_user", q => q.eq("userId", id)).collect();
}});
export const add = mutation({ args: { text: v.string() }, handler: async (ctx, { text }) => {
  const id = (await ctx.auth.getUserIdentity())?.subject; if (!id) throw new Error("non connecté");
  await ctx.db.insert("tasks", { text, done: false, userId: id });
}});
```

## Front — dans une route TanStack Start
```tsx
const tasks = useQuery(api.tasks.list) ?? [];
const add = useMutation(api.tasks.add);
// <form onSubmit={e => { e.preventDefault(); add({ text }); }}> … {tasks.map(t => <li key={t._id}>{t.text}</li>)}
```
Points clés : scoping par `userId` (on ne voit jamais les tâches d'un autre), query réactive, la mutation vérifie l'auth.
