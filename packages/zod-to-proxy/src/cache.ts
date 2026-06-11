import type { ZodTypeAny } from "zod";

const registry = new WeakMap<ZodTypeAny, WeakMap<object, object>>();

export function getCached(schema: ZodTypeAny, raw: object): object | undefined {
  return registry.get(schema)?.get(raw);
}

export function setCached(
  schema: ZodTypeAny,
  raw: object,
  proxy: object,
): void {
  let inner = registry.get(schema);
  if (!inner) {
    inner = new WeakMap();
    registry.set(schema, inner);
  }
  inner.set(raw, proxy);
}
