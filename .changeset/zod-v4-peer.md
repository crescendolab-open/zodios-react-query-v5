---
"@crescendolab/zodios-react-query-v5": minor
---

Accept zod 4 as a peer dependency (`^3.25.51 || ^4.0.0`). The published type declarations no longer import `zod` directly; they take zod types from `@zodios/core`, so they match the zod version of the installed Zodios client, including the zod 4 fork `@crescendolab/zodios-core-zod-v4`.
