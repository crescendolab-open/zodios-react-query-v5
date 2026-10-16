---
"@crescendolab/zodios-react-query-v5": patch
---

Rename the peer dependency from `@zodios/core` to `@crescendolab/zodios-core-zod-v4`. The type declarations now import `@crescendolab/zodios-core-zod-v4` by its published name, so it no longer needs to be installed under the `@zodios/core` alias.

**Breaking:** install `@crescendolab/zodios-core-zod-v4` directly and update `@zodios/core` imports. Projects that use the upstream `@zodios/core` should stay on 0.0.6. A caret range such as `^0.0.6` does not match 0.0.7, so no consumer upgrades automatically.
