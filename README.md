 <h1 align="center">@crescendolab/zodios-react-query-v5</h1>
 <p align="center">
   <a href="https://github.com/ecyrbe/zodios-react">
     <img align="center" src="https://raw.githubusercontent.com/crescendolab-open/zodios-react-query-v5/main/docs/logo.svg" width="128px" alt="Zodios logo">
   </a>
 </p>
 
 <p align="center">
    React hooks for zodios backed by <a src="https://react-query.tanstack.com/" >react-query</a>
 </p>
 
 <p align="center">
   <a href="https://www.npmjs.com/package/@crescendolab/zodios-react-query-v5">
   <img src="https://img.shields.io/npm/v/@crescendolab/zodios-react-query-v5.svg" alt="langue typescript">
   </a>
   <a href="https://www.npmjs.com/package/@crescendolab/zodios-react-query-v5">
   <img alt="npm" src="https://img.shields.io/npm/dw/@crescendolab/zodios-react-query-v5">
   </a>
   <a href="https://github.com/crescendolab-open/zodios-react-query-v5/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/crescendolab-open/zodios-react-query-v5">   
   </a>
   <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/crescendolab-open/zodios-react-query-v5/CI">
 </p>

A [Crescendo Lab](https://cresclab.com/)–flavored fork of [ecyrbe/zodios-react](https://github.com/ecyrbe/zodios-react), updated to support React v19 and TanStack Query v5.

# Install

```bash
> pnpm i @crescendolab/zodios-react-query-v5
```

## Peer dependencies

The hooks are built on [`@crescendolab/zodios-core-zod-v4`](https://github.com/crescendolab-open/zodios-core-zod-v4),
a fork of `@zodios/core` that supports zod 4. Install it by its own name:

```bash
> pnpm i @crescendolab/zodios-core-zod-v4 zod @tanstack/react-query react
```

Both zod 3 (`^3.25.51`) and zod 4 (`^4.0.0`) satisfy the peer range. Define
schemas with `zod/v4`, which both release lines provide.

### Migrating from 0.0.6

0.0.6 and earlier took their types from `@zodios/core`. From 0.0.7, the hooks import
`@crescendolab/zodios-core-zod-v4` instead:

- If you installed the fork under the `@zodios/core` name
  (`"@zodios/core": "npm:@crescendolab/zodios-core-zod-v4@..."`), depend on
  `@crescendolab/zodios-core-zod-v4` directly and update your
  `@zodios/core` imports.
- If you use the upstream `@zodios/core` with zod 3 schemas, stay on 0.0.6.

# Usage

Zodios comes with a Query and Mutation hook helper.  
It's a thin wrapper around React-Query but with zodios auto completion.

Zodios query hook also returns an invalidation helper to allow you to reset react query cache easily

Check out [packages/examples](https://github.com/crescendolab-open/zodios-react-query-v5/tree/main/packages/examples) for
a example.

# License

Forked from [ecyrbe/zodios-react](https://github.com/ecyrbe/zodios-react) which is licensed under the [MIT License](https://github.com/ecyrbe/zodios-react/blob/main/LICENSE)

Copyright © 2025-preset Crescendo Lab Inc.

Licensed under the [Apache License, Version 2.0](https://github.com/crescendolab-open/zodios-react-query-v5/blob/main/LICENSE)
