# @crescendolab/zodios-react-query-v5

## 0.0.7

### Patch Changes

- b3f40b6: Rename the peer dependency from `@zodios/core` to `@crescendolab/zodios-core-zod-v4`. The type declarations now import `@crescendolab/zodios-core-zod-v4` by its published name, so it no longer needs to be installed under the `@zodios/core` alias.

  **Breaking:** install `@crescendolab/zodios-core-zod-v4` directly and update `@zodios/core` imports. Projects that use the upstream `@zodios/core` should stay on 0.0.6. A caret range such as `^0.0.6` does not match 0.0.7, so no consumer upgrades automatically.

## 0.0.6

### Patch Changes

- 2238a41: Accept zod 4 as a peer dependency (`^3.25.51 || ^4.0.0`). The published type declarations no longer import `zod` directly; they take zod types from `@zodios/core`, so they match the zod version of the installed Zodios client, including the zod 4 fork `@crescendolab/zodios-core-zod-v4`.

## 0.0.5

### Patch Changes

- 28df3c5: bundle

## 0.0.4

### Patch Changes

- 07979af: fix package.json files

## 0.0.3

### Patch Changes

- fix exports

## 0.0.2

### Patch Changes

- e0b4a41: fix repo url

## 0.0.1

### Patch Changes

- 030d28a: first build for react query v5
