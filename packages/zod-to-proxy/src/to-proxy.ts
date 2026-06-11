import type { ReadonlyDeep } from "type-fest";
import type { z, ZodTypeAny } from "zod";
import {
  ZodArray,
  ZodCatch,
  ZodDefault,
  ZodError,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodTuple,
} from "zod";

import { getCached, setCached } from "./cache.js";
import { classify, unwrap } from "./classify.js";
import { ProxyZodError } from "./proxy-zod-error.js";
import { RAW_DATA, SCHEMA, TO_PROXY_BRAND } from "./symbols.js";

function createObjectProxy(
  schema: ZodObject<Record<string, ZodTypeAny>>,
  raw: Record<string, unknown>,
  path: Array<string | number>,
): object {
  const childCache = new Map<string | symbol, unknown>();
  const shape = schema.shape as Record<string, ZodTypeAny>;

  function resolveKey(key: string): unknown {
    if (childCache.has(key)) return childCache.get(key);
    if (Object.hasOwn(shape, key)) {
      const childSchema = shape[key]!;
      const childRaw = raw[key];
      const childPath = [...path, key];
      const resolved = resolveNode(childSchema, childRaw, childPath);
      childCache.set(key, resolved);
      return resolved;
    }
    return undefined;
  }

  return new Proxy(raw, {
    get(target, key, receiver) {
      if (key === TO_PROXY_BRAND) return true;
      if (key === RAW_DATA) return raw;
      if (key === SCHEMA) return schema;
      if (key === "toJSON") return () => raw;

      if (typeof key === "symbol") return Reflect.get(target, key, receiver);

      if (Object.hasOwn(shape, key)) return resolveKey(key);
      if (Object.hasOwn(raw, key)) return undefined;

      return Reflect.get(target, key, receiver);
    },

    set() {
      throw new TypeError("toProxy objects are read-only");
    },

    deleteProperty() {
      throw new TypeError("toProxy objects are read-only");
    },

    defineProperty() {
      throw new TypeError("toProxy objects are read-only");
    },

    ownKeys() {
      return Reflect.ownKeys(shape);
    },

    has(_target, key) {
      if (typeof key === "symbol") return key === TO_PROXY_BRAND;
      return Object.hasOwn(shape, key);
    },

    getOwnPropertyDescriptor(_target, key) {
      if (typeof key === "symbol") return undefined;
      if (Object.hasOwn(shape, key)) {
        return {
          configurable: true,
          enumerable: true,
          writable: false,
          value: resolveKey(key as string),
        };
      }
      return undefined;
    },
  });
}

function createArrayProxy(
  schema: ZodArray<ZodTypeAny>,
  raw: Array<unknown>,
  path: Array<string | number>,
): object {
  const childCache = new Map<number, unknown>();
  const itemSchema = schema._def.type;

  function resolveIndex(index: number): unknown {
    if (childCache.has(index)) return childCache.get(index);
    const childRaw = raw[index];
    const childPath = [...path, index];
    const resolved = resolveNode(itemSchema, childRaw, childPath);
    childCache.set(index, resolved);
    return resolved;
  }

  return new Proxy(raw, {
    get(target, key, receiver) {
      if (key === TO_PROXY_BRAND) return true;
      if (key === RAW_DATA) return raw;
      if (key === SCHEMA) return schema;
      if (key === "toJSON") return () => raw;
      if (key === "length") return raw.length;

      if (typeof key === "symbol") return Reflect.get(target, key, receiver);

      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < raw.length) {
        return resolveIndex(index);
      }

      return Reflect.get(target, key, receiver);
    },

    set() {
      throw new TypeError("toProxy objects are read-only");
    },

    deleteProperty() {
      throw new TypeError("toProxy objects are read-only");
    },

    defineProperty() {
      throw new TypeError("toProxy objects are read-only");
    },

    ownKeys() {
      const keys: Array<string> = [];
      for (let i = 0; i < raw.length; i++) {
        keys.push(String(i));
      }
      keys.push("length");
      return keys;
    },

    has(_target, key) {
      if (key === TO_PROXY_BRAND) return true;
      if (typeof key === "symbol") return false;
      if (key === "length") return true;
      const index = Number(key);
      return Number.isInteger(index) && index >= 0 && index < raw.length;
    },

    getOwnPropertyDescriptor(target, key) {
      if (key === "length") {
        return Object.getOwnPropertyDescriptor(target, "length");
      }
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < raw.length) {
        return {
          configurable: true,
          enumerable: true,
          writable: false,
          value: resolveIndex(index),
        };
      }
      return undefined;
    },
  });
}

function resolveNode(
  schema: ZodTypeAny,
  raw: unknown,
  path: Array<string | number>,
): unknown {
  if (schema instanceof ZodOptional) {
    if (raw === undefined) return undefined;
    return resolveNode(schema.unwrap(), raw, path);
  }

  if (schema instanceof ZodNullable) {
    if (raw === null) return null;
    return resolveNode(schema.unwrap(), raw, path);
  }

  if (schema instanceof ZodDefault) {
    if (raw === undefined) {
      return resolveNode(
        schema._def.innerType as ZodTypeAny,
        schema._def.defaultValue(),
        path,
      );
    }
    return resolveNode(schema._def.innerType as ZodTypeAny, raw, path);
  }

  if (schema instanceof ZodCatch) {
    try {
      return resolveNode(schema._def.innerType as ZodTypeAny, raw, path);
    } catch {
      return schema._def.catchValue({
        error: new ZodError([]),
        input: raw,
      });
    }
  }

  const unwrapped = unwrap(schema);
  if (unwrapped) {
    return resolveNode(unwrapped, raw, path);
  }

  const kind = classify(schema);

  if (kind === "leaf") {
    try {
      return schema.parse(raw);
    } catch (err) {
      throw new ProxyZodError(path, err as import("zod").ZodError);
    }
  }

  if (kind === "atomic") {
    try {
      return schema.parse(raw);
    } catch (err) {
      throw new ProxyZodError(path, err as import("zod").ZodError);
    }
  }

  if (raw === null || raw === undefined) {
    try {
      schema.parse(raw);
      return raw;
    } catch (err) {
      throw new ProxyZodError(path, err as import("zod").ZodError);
    }
  }

  if (typeof raw !== "object") {
    try {
      schema.parse(raw);
      return raw;
    } catch (err) {
      throw new ProxyZodError(path, err as import("zod").ZodError);
    }
  }

  return wrapDecomposable(schema, raw as object, path);
}

function wrapDecomposable(
  schema: ZodTypeAny,
  raw: object,
  path: Array<string | number>,
): object {
  const cached = getCached(schema, raw);
  if (cached) return cached;

  let proxy: object;

  if (schema instanceof ZodObject) {
    proxy = createObjectProxy(
      schema as ZodObject<Record<string, ZodTypeAny>>,
      raw as Record<string, unknown>,
      path,
    );
  } else if (schema instanceof ZodArray) {
    proxy = createArrayProxy(schema, raw as Array<unknown>, path);
  } else if (schema instanceof ZodTuple) {
    proxy = createArrayProxy(
      // Treat tuple similarly to array for now — per-index schema handled later
      schema as unknown as ZodArray<ZodTypeAny>,
      raw as Array<unknown>,
      path,
    );
  } else {
    throw new TypeError(
      `Unexpected decomposable schema: ${schema.constructor.name}`,
    );
  }

  setCached(schema, raw, proxy);
  return proxy;
}

export function toProxy<T extends ZodTypeAny>(
  schema: T,
  data: unknown,
): ReadonlyDeep<z.infer<T>> {
  if (data === null || data === undefined) {
    throw new TypeError(
      `toProxy requires an object or array, received ${data === null ? "null" : "undefined"}`,
    );
  }

  if (typeof data !== "object") {
    throw new TypeError(
      `toProxy requires an object or array, received ${typeof data}`,
    );
  }

  let effectiveSchema: ZodTypeAny = schema;
  let inner = unwrap(effectiveSchema);
  while (inner) {
    effectiveSchema = inner;
    inner = unwrap(effectiveSchema);
  }

  if (!Object.isExtensible(data)) {
    return schema.parse(data) as ReadonlyDeep<z.infer<T>>;
  }

  return wrapDecomposable(effectiveSchema, data as object, []) as ReadonlyDeep<
    z.infer<T>
  >;
}
