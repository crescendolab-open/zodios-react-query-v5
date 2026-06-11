import type { ZodTypeAny } from "zod";

import process from "node:process";

const warned = new WeakSet<ZodTypeAny>();

function isProduction(): boolean {
  // eslint-disable-next-line dot-notation -- TS noPropertyAccessFromIndexSignature
  return process.env["NODE_ENV"] === "production";
}

function warnOnce(schema: ZodTypeAny, message: string): void {
  if (warned.has(schema)) return;
  warned.add(schema);
  console.warn(`[zod-to-proxy] ${message}`);
}

export function warnAtomicRoot(schema: ZodTypeAny): void {
  if (isProduction()) return;
  warnOnce(
    schema,
    "Root schema is atomic — the entire tree will be validated on first access, providing no laziness benefit.",
  );
}

export function warnThenInShape(schema: ZodTypeAny): void {
  if (isProduction()) return;
  warnOnce(
    schema,
    'Schema shape contains a "then" key. Promise.resolve(proxy) will trigger validation of this field due to thenable detection.',
  );
}

export function warnFrozenDegradation(schema: ZodTypeAny): void {
  if (isProduction()) return;
  warnOnce(
    schema,
    "Input data is frozen/sealed — falling back to eager full validation (atomic mode).",
  );
}
