import { TO_PROXY_BRAND } from "./symbols.js";

export function isToProxy(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  return TO_PROXY_BRAND in value;
}
