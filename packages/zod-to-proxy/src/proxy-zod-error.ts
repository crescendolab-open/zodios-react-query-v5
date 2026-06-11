import type { ZodError, ZodIssue } from "zod";

const BRAND = Symbol.for("ProxyZodError");

function formatPath(path: Array<string | number>): string {
  return path
    .map((segment) =>
      typeof segment === "number" ? `[${segment}]` : `.${segment}`,
    )
    .join("")
    .replace(/^\./, "");
}

export class ProxyZodError extends Error {
  override name = "ProxyZodError";
  path: Array<string | number>;
  zodError: ZodError;
  override cause: ZodError;

  constructor(path: Array<string | number>, zodError: ZodError) {
    super(`Validation failed at path: ${formatPath(path)}`);
    this.path = path;
    this.zodError = zodError;
    this.cause = zodError;
  }

  flatIssues(): Array<ZodIssue> {
    return this.zodError.issues;
  }

  static isProxyZodError(e: unknown): e is ProxyZodError {
    return (
      e instanceof ProxyZodError ||
      (e != null &&
        typeof e === "object" &&
        BRAND in (e as Record<symbol, unknown>))
    );
  }

  get [BRAND]() {
    return true;
  }
}
