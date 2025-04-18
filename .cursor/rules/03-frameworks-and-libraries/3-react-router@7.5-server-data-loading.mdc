---
description: APPLY React Router data loading rules WHEN loading data in frontend
globs: apps/frontend/app/routes/**/*.tsx
alwaysApply: false
---

Mandatory Rules for React Router Data Loading:
- search for generated types in frontend ".react-router/types/app/routes"
- use Route.LoaderArgs
- use Route.ComponentProps

```typescript
// filename: routes/groups.tsx
import type { Route } from 'apps/frontend/.react-router/types/app/routes/+types/groups';

export async function loader({ params }: Route.LoaderArgs) {
  const group = ...
  return group;
}

export default function Groups({
  loaderData,
}: Route.ComponentProps) {
  const { name, description } = loaderData;
  return (
    <div>
      <h1>{name}</h1>
      <p>{description}</p>
    </div>
  );
}
```
