# zod-to-proxy Design

Lazy-validation Proxy wrapper for Zod schemas: validates only the fields you access.

## Public API (v1)

```ts
import { toProxy, ProxyZodError, getRaw, materialize, isToProxy } from "@crescendolab/zod-to-proxy";

// Core: wrap raw data with a lazy-validating Proxy
toProxy<T extends z.ZodTypeAny>(schema: T, data: unknown): ReadonlyDeep<z.infer<T>>

// Custom error thrown on access-time validation failure
class ProxyZodError extends Error {
  path: (string | number)[];   // absolute access path from root
  zodError: ZodError;          // relative ZodError for the failing subtree
  cause: ZodError;             // same as zodError (standard Error.cause)
  flatIssues(): ZodIssue[];    // convenience: zodError.issues flattened
  static isProxyZodError(e: unknown): e is ProxyZodError;
  // Symbol.for("ProxyZodError") brand for cross-realm detection
}

// Escape hatches (lenient: non-proxy input returns input as-is)
getRaw(proxy: unknown): unknown;         // extract original raw data
materialize(proxy: unknown): unknown;    // full schema.parse() on the subtree
isToProxy(value: unknown): boolean;      // detect proxy-wrapped values
```

Return type uses `ReadonlyDeep` from `type-fest` (not hand-rolled — naive `keyof` on function types yields `never`, breaking `Date`/`Map`/`Set` methods).

## Schema Node Classification

### Decomposable (lazy)

Object access returns child proxies; children validate only when accessed.

| Zod Type | Behavior |
|----------|----------|
| `ZodObject` | `shape` keys → lazy child proxies |
| `ZodArray` | Index access → lazy child proxy per element |
| `ZodTuple` | Index access → lazy child proxy per item schema |
| `ZodOptional` | Unwrap `innerType`, propagate `undefined` |
| `ZodNullable` | Unwrap `innerType`, propagate `null` |
| `ZodDefault` | Unwrap `innerType`; substitute `defaultValue()` only for `undefined` (not `null`) |
| `ZodReadonly` | Unwrap `innerType` (already read-only via Proxy) |
| `ZodLazy` | Unwrap via `.schema` on first access |
| `ZodPipeline` | Use `._def.out` as the effective schema |
| `ZodBranded` | Unwrap `innerType` (brand is type-level only) |
| `ZodCatch` | Unwrap `innerType`; on validation failure return `catchValue()` instead of throwing |

### Atomic (eager on touch)

Touching any property triggers `schema.parse(rawSubtree)` on the entire subtree.
Untouched = not validated. This prevents partial observation of interdependent nodes.

| Zod Type | Why atomic |
|----------|-----------|
| `ZodUnion` / `ZodDiscriminatedUnion` | Discriminant field must pick the right branch before children are valid |
| `ZodIntersection` | Merged shape depends on validating both sides |
| `ZodEffects` (refine/transform/preprocess) | User code may reshape data; partial access could observe pre-transform state |
| `ZodRecord` | Keys are dynamic; shape is unknown until parse |

### Leaf (terminal)

Primitives, enums, literals, dates, etc. Returned as-is from raw data (validated by parent's lazy resolution).

## Get Trap: 3-Tier Resolution

For decomposable object/array nodes, property access follows this order:

```
1. Object.hasOwn(shape, key)  → resolve child schema, return lazy proxy
2. Object.hasOwn(raw, key)    → return undefined (strip unknown keys)
3. Reflect.get(target, key)   → prototype passthrough (toString, etc.)
```

### Special Cases

- **`toJSON`**: Must be explicitly handled in the get trap (returns raw data). It doesn't match any of the 3 tiers: not in shape, not an own key of raw (usually), not on `Object.prototype`. Without special-casing, `JSON.stringify` falls through to `ownKeys` + full get traversal, causing full eager validation — defeating the purpose.
- **`then`**: If `'then'` exists in the Zod shape, emit a dev-mode warning (thenable detection by Promise.resolve will trigger validation). Still lazy-resolve it.
- **`Symbol.toPrimitive` / `Symbol.iterator`**: Passthrough via tier 3.
- **`constructor`**: Must use `Object.hasOwn(shape, key)` (not `key in shape`) because `shape['constructor'] === Object` via prototype chain on zod 3.25.51.

## Enumeration Traps

| Trap | Behavior |
|------|----------|
| `ownKeys` | Returns `Reflect.ownKeys(shape)` for objects (schema-declared keys only) |
| `has` | `key in proxy` → `Object.hasOwn(shape, key)` |
| `getOwnPropertyDescriptor` | Synthetic descriptor for shape keys (enumerable, configurable, non-writable) |

For arrays: `ownKeys` returns `['0', '1', ..., 'length']` based on raw array length.

## Caching & Identity

Global `WeakMap<ZodTypeAny, WeakMap<object, Proxy>>` registry ensures:
- Same `(schema, rawObject)` pair → same proxy instance (referential stability)
- Structural sharing: subtrees with the same schema node + same raw object reuse the same proxy
- No memory leaks: WeakMap entries are GC'd when schema or raw data is collected

Child proxies are cached per-parent on first access (lazy).

## Read-Only Enforcement

All mutation traps (`set`, `deleteProperty`, `defineProperty`) → `throw TypeError`.
Return type is `ReadonlyDeep<z.infer<T>>` to enforce at the type level.

## Frozen Input Handling

If `!Object.isExtensible(raw)` (frozen/sealed), degrade to atomic mode: full `schema.parse(raw)` eagerly.
Rationale: Proxy invariant constraints on frozen objects make lazy behavior unreliable. Degrading is safer than throwing.

## Dev Warnings

All gated behind `process.env.NODE_ENV !== 'production'`, warn-once per schema via `WeakSet`:

1. **Atomic root**: `toProxy(z.union(...), data)` — entire tree validates on first access, no laziness benefit
2. **`then` in shape**: Risk of thenable detection triggering unexpected validation
3. **Frozen input degradation**: When falling back to atomic mode due to frozen data

## Error Design

```ts
class ProxyZodError extends Error {
  name = "ProxyZodError";
  path: (string | number)[];
  zodError: ZodError;
  cause: ZodError;

  constructor(path: (string | number)[], zodError: ZodError) {
    super(`Validation failed at path: ${formatPath(path)}`);
    this.path = path;
    this.zodError = zodError;
    this.cause = zodError;
  }

  flatIssues(): ZodIssue[] {
    return this.zodError.issues;
  }

  static isProxyZodError(e: unknown): e is ProxyZodError {
    return (
      e instanceof ProxyZodError ||
      (e != null && typeof e === "object" && Symbol.for("ProxyZodError") in e)
    );
  }

  get [Symbol.for("ProxyZodError")]() {
    return true;
  }
}
```

## React-Query Integration Architecture

### Problem

TanStack Query's structural sharing (`replaceEqualDeep`) deeply traverses cached data on every fetch. If the cache stores proxies, this triggers full validation — defeating laziness.

### Solution: raw-in-cache + select wrapping

```ts
// In zodios hooks / user code:
useQuery({
  queryKey: [...],
  queryFn: async () => {
    const response = await zodiosClient.get(...);
    return response; // raw data in cache
  },
  select: (raw) => toProxy(responseSchema, raw),
  // structuralSharing on raw data (fast, no Proxy)
  // toProxy called per-render but WeakMap cache ensures same proxy instance
});
```

This eliminates three high risks:
1. **Structural sharing**: operates on raw data, never touches proxies
2. **Persistence/SSR**: serializes raw data, no Proxy in snapshot
3. **Optimistic updates**: mutate raw data directly, no Proxy interaction

Render-time throws from accessing invalid fields are accepted as inherent to the design — this is the whole point.

## Non-Goals (v1)

- **Mutation / two-way binding**: Proxies are read-only
- **Async / streaming validation**: All validation is synchronous
- **Schema inference from data**: Always requires explicit schema
- **Partial parse / error recovery**: Access throws or succeeds, no middle ground (except `ZodCatch`)
- **Custom error formatting**: `ProxyZodError` is the only error type
- **Server-side rendering special handling**: Use raw data for SSR, wrap with `toProxy` on client

## Risk Registry

### Eliminated (architectural)

| Risk | Mitigation |
|------|-----------|
| Structural sharing defeats laziness | raw-in-cache architecture; `toProxy` in `select` only |
| Proxy in persistence/SSR | Raw data persisted; proxy is ephemeral |
| Optimistic update on proxy | Mutations use raw data |

### Mitigated

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Zod internal structure changes | High | Ecosystem pinning tests against specific zod versions |
| Wrapper combination explosion | Medium | TDD matrix for optional × nullable × default combos |
| `Object.prototype` pollution in shape lookup | Medium | `Object.hasOwn()` gating (verified on zod 3.25.51) |
| `toJSON` trap bypass | Medium | Explicit special-case in get trap |
| Frozen object Proxy invariants | Low | Degrade to atomic mode |

### Accepted (inherent)

| Risk | Why accepted |
|------|-------------|
| Render-time throws | Core design intent — invalid field access should throw |
| Dev overhead of understanding lazy semantics | Dev warnings + documentation |

## TDD Plan

16 test clusters in implementation order:

| # | Cluster | Focus |
|---|---------|-------|
| 1 | Root behavior | Primitive root throws, null/undefined root throws, object root returns proxy |
| 2 | Object lazy access | Shape key → valid value, shape key → invalid value throws ProxyZodError, non-shape own key → undefined |
| 3 | Wrapper semantics | optional(undefined), nullable(null), default substitution, nested wrappers, readonly unwrap |
| 4 | Atomic nodes | Union touch → full parse, transform touch → full parse, refine touch → full parse, record touch → full parse |
| 5 | Classification tightening | Verify each zod type maps to correct category (decomposable/atomic/leaf) |
| 6 | Dev warnings | Atomic root warns, `then`-in-shape warns, frozen degradation warns, production mode suppresses |
| 7 | Prototype & special keys | `toString`, `valueOf`, `constructor`, `Symbol.toPrimitive`, `Symbol.iterator` |
| 8 | Enumeration traps | `Object.keys()`, `for...in`, `'key' in proxy`, spread operator |
| 9 | Caching & identity | Same (schema, data) → same proxy, child proxy referential stability |
| 10 | Read-only | `proxy.x = 1` throws TypeError, `delete proxy.x` throws TypeError |
| 11 | Array behavior | Index access, `.length`, iteration, nested arrays, tuple semantics |
| 12 | Escape hatches | `getRaw`, `materialize`, `isToProxy` — normal + non-proxy input |
| 13 | Error details | `ProxyZodError.path` correctness (nested), `.zodError` relative, `.flatIssues()`, `.isProxyZodError()` cross-realm |
| 14 | Ecosystem pinning | Zod version lock test, schema internal structure assertions |
| 15 | Type tests | `expectTypeOf` for `ReadonlyDeep`, `ProxyZodError` guard narrowing |
| 16 | CI exhaustiveness | Integration test: real zodios response schema → selective access → no throw for valid paths |

## Package Structure

```
packages/zod-to-proxy/
├── src/
│   ├── index.ts           # public exports
│   ├── to-proxy.ts        # toProxy implementation
│   ├── proxy-zod-error.ts # ProxyZodError class
│   ├── classify.ts        # schema node classification
│   ├── traps.ts           # Proxy trap implementations
│   ├── cache.ts           # WeakMap registry
│   └── warnings.ts        # dev-mode warnings
├── tests/
│   ├── root.test.ts
│   ├── object.test.ts
│   ├── wrappers.test.ts
│   ├── atomic.test.ts
│   ├── classify.test.ts
│   ├── warnings.test.ts
│   ├── prototype.test.ts
│   ├── enumeration.test.ts
│   ├── cache.test.ts
│   ├── readonly.test.ts
│   ├── array.test.ts
│   ├── escape-hatches.test.ts
│   ├── error.test.ts
│   ├── ecosystem.test.ts
│   ├── types.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

## Dependencies

- `zod` (peer, `^3.25.51`)
- `type-fest` (dependency, for `ReadonlyDeep`)
- `vitest` (dev)
- `tsdown` (dev, build)
- `@changesets/cli` (dev, release)
