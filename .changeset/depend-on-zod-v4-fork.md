---
"@crescendolab/zodios-react-query-v5": minor
---

Depend on `@crescendolab/zodios-core-zod-v4` by its published name instead of `@zodios/core`. The peer dependency and the imports in the type declarations now use `@crescendolab/zodios-core-zod-v4`, so it no longer needs to be installed under the `@zodios/core` alias.

**Breaking:** install `@crescendolab/zodios-core-zod-v4` directly. Projects that use the upstream `@zodios/core` should stay on 0.0.x.
