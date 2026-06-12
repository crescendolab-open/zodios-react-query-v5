import type { ZodTypeAny } from "zod";

const warned = new WeakSet<ZodTypeAny>();

function isProduction(): boolean {
  try {
    // eslint-disable-next-line node/prefer-global/process -- runtime check for browser environments without node:process
    return (
      typeof process !== "undefined" &&
      process.env?.["NODE_ENV"] === "production"
    ); // eslint-disable-line dot-notation
  } catch {
    return false;
  }
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
