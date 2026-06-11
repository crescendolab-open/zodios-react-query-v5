import { RAW_DATA } from "./symbols.js";

export function getRaw(proxy: unknown): unknown {
  if (proxy === null || proxy === undefined || typeof proxy !== "object") {
    return proxy;
  }
  const raw = (proxy as Record<symbol, unknown>)[RAW_DATA];
  return raw !== undefined ? raw : proxy;
}
