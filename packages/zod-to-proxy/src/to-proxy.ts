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
  ZodUnknown,
} from "zod";

import { getCached, setCached } from "./cache.js";
import { classify, unwrap } from "./classify.js";
import { ProxyZodError } from "./proxy-zod-error.js";
import { RAW_DATA, SCHEMA, TO_PROXY_BRAND } from "./symbols.js";
import {
  warnAtomicRoot,
  warnFrozenDegradation,
  warnThenInShape,
} from "./warnings.js";

function createObjectProxy(
  schema: ZodObject<Record<string, ZodTypeAny>>,
  raw: Record<string, unknown>,
  path: Array<string | number>,
): object {
  const childCache = new Map<string | symbol, unknown>();
  const shape = schema.shape as Record<string, ZodTypeAny>;

  if (Object.hasOwn(shape, "then")) {
    warnThenInShape(schema);
  }

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

    ownKeys(target) {
      const keys = new Set<string | symbol>(Reflect.ownKeys(shape));
      for (const k of Reflect.ownKeys(target)) {
        const desc = Object.getOwnPropertyDescriptor(target, k);
        if (desc && !desc.configurable) keys.add(k);
      }
      return [...keys];
    },

    has(target, key) {
      if (key === TO_PROXY_BRAND) return true;
      if (typeof key === "symbol") return Reflect.has(target, key);
      if (Object.hasOwn(shape, key)) return true;
      const desc = Object.getOwnPropertyDescriptor(target, key);
      if (desc && !desc.configurable) return true;
      return false;
    },

    getOwnPropertyDescriptor(target, key) {
      const targetDesc = Object.getOwnPropertyDescriptor(target, key);
      if (targetDesc && !targetDesc.configurable) return targetDesc;
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

const ARRAY_INDEX_RE = /^(?:0|[1-9]\d*)$/;

function isArrayIndex(key: string): boolean {
  return ARRAY_INDEX_RE.test(key);
}

function createIndexedProxy(
  schema: ZodTypeAny,
  raw: Array<unknown>,
  path: Array<string | number>,
  getItemSchema: (index: number) => ZodTypeAny,
): object {
  const childCache = new Map<number, unknown>();

  function resolveIndex(index: number): unknown {
    if (childCache.has(index)) return childCache.get(index);
    const childRaw = raw[index];
    const childPath = [...path, index];
    const resolved = resolveNode(getItemSchema(index), childRaw, childPath);
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

      if (isArrayIndex(key)) {
        const index = Number(key);
        if (index < raw.length) return resolveIndex(index);
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

    ownKeys(target) {
      const keys = new Set<string>();
      for (let i = 0; i < raw.length; i++) {
        keys.add(String(i));
      }
      keys.add("length");
      for (const k of Reflect.ownKeys(target)) {
        if (typeof k === "symbol") continue;
        const desc = Object.getOwnPropertyDescriptor(target, k);
        if (desc && !desc.configurable) keys.add(k);
      }
      return [...keys];
    },

    has(target, key) {
      if (key === TO_PROXY_BRAND) return true;
      if (typeof key === "symbol") return Reflect.has(target, key);
      if (key === "length") return true;
      if (isArrayIndex(key) && Number(key) < raw.length) return true;
      const desc = Object.getOwnPropertyDescriptor(target, key);
      if (desc && !desc.configurable) return true;
      return false;
    },

    getOwnPropertyDescriptor(target, key) {
      if (key === "length") {
        return Object.getOwnPropertyDescriptor(target, "length");
      }
      const targetDesc = Object.getOwnPropertyDescriptor(target, key);
      if (targetDesc && !targetDesc.configurable) return targetDesc;
      if (typeof key === "string" && isArrayIndex(key)) {
        const index = Number(key);
        if (index < raw.length) {
          return {
            configurable: true,
            enumerable: true,
            writable: false,
            value: resolveIndex(index),
          };
        }
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
    } catch (err) {
      if (err instanceof ProxyZodError || err instanceof ZodError) {
        return schema._def.catchValue({
          error:
            err instanceof ProxyZodError ? err.zodError : (err as ZodError),
          input: raw,
        });
      }
      throw err;
    }
  }

  const unwrapped = unwrap(schema);
  if (unwrapped) {
    return resolveNode(unwrapped, raw, path);
  }

  const kind = classify(schema);

  if (kind === "leaf" || kind === "atomic") {
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

  if (!Object.isExtensible(raw)) {
    warnFrozenDegradation(schema);
    try {
      return schema.parse(raw);
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
    const itemSchema = schema._def.type;
    proxy = createIndexedProxy(
      schema,
      raw as Array<unknown>,
      path,
      () => itemSchema,
    );
  } else if (schema instanceof ZodTuple) {
    const items = schema._def.items as Array<ZodTypeAny>;
    const restSchema = schema._def.rest as ZodTypeAny | null;
    proxy = createIndexedProxy(
      schema,
      raw as Array<unknown>,
      path,
      (index) => items[index] ?? restSchema ?? ZodUnknown.create(),
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

  const effectiveKind = classify(effectiveSchema);

  if (!Object.isExtensible(data)) {
    warnFrozenDegradation(schema);
    return schema.parse(data) as ReadonlyDeep<z.infer<T>>;
  }

  if (effectiveKind === "atomic") {
    warnAtomicRoot(schema);
  }

  if (effectiveKind !== "decomposable") {
    try {
      return schema.parse(data) as ReadonlyDeep<z.infer<T>>;
    } catch (err) {
      throw new ProxyZodError([], err as ZodError);
    }
  }

  return wrapDecomposable(effectiveSchema, data as object, []) as ReadonlyDeep<
    z.infer<T>
  >;
}
