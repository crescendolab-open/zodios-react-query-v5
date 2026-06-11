import type { ZodTypeAny } from "zod";

import { RAW_DATA, SCHEMA } from "./symbols.js";

export function materialize(proxy: unknown): unknown {
  if (proxy === null || proxy === undefined || typeof proxy !== "object") {
    return proxy;
  }
  const raw = (proxy as Record<symbol, unknown>)[RAW_DATA];
  const schema = (proxy as Record<symbol, unknown>)[SCHEMA] as
    | ZodTypeAny
    | undefined;
  if (raw !== undefined && schema) {
    return schema.parse(raw);
  }
  return proxy;
}
