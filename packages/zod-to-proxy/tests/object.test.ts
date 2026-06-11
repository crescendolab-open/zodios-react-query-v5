import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

describe("toProxy object lazy access", () => {
  it("returns valid field value on access", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const proxy = toProxy(schema, { name: "Alice", age: 30 });
    expect(proxy.name).toBe("Alice");
    expect(proxy.age).toBe(30);
  });

  it("throws ProxyZodError when accessing invalid field", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const proxy = toProxy(schema, { name: "Alice", age: "not-a-number" });

    expect(proxy.name).toBe("Alice");
    expect(() => proxy.age).toThrow(ProxyZodError);
  });

  it("proxyZodError contains correct path for top-level field", () => {
    const schema = z.object({ age: z.number() });
    const proxy = toProxy(schema, { age: "bad" });

    try {
      void proxy.age;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(ProxyZodError.isProxyZodError(err)).toBe(true);
      expect((err as ProxyZodError).path).toEqual(["age"]);
    }
  });

  it("returns undefined for non-shape own keys (strips extra fields)", () => {
    const schema = z.object({ name: z.string() });
    const proxy = toProxy(schema, { name: "Alice", extra: "stuff" });
    expect((proxy as Record<string, unknown>).extra).toBeUndefined();
  });

  it("lazily resolves nested objects", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({ city: z.string() }),
      }),
    });
    const proxy = toProxy(schema, {
      user: { name: "Alice", address: { city: "Taipei" } },
    });
    expect(proxy.user.name).toBe("Alice");
    expect(proxy.user.address.city).toBe("Taipei");
  });

  it("throws ProxyZodError with nested path for deep invalid field", () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          age: z.number(),
        }),
      }),
    });
    const proxy = toProxy(schema, {
      user: { profile: { age: "bad" } },
    });

    try {
      void proxy.user.profile.age;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(ProxyZodError.isProxyZodError(err)).toBe(true);
      expect((err as ProxyZodError).path).toEqual(["user", "profile", "age"]);
    }
  });

  it("does not throw when invalid sibling is never accessed", () => {
    const schema = z.object({
      good: z.string(),
      bad: z.number(),
    });
    const proxy = toProxy(schema, { good: "ok", bad: "not-a-number" });
    expect(proxy.good).toBe("ok");
  });

  it("caches resolved child values (same reference on repeated access)", () => {
    const schema = z.object({
      nested: z.object({ x: z.number() }),
    });
    const proxy = toProxy(schema, { nested: { x: 1 } });
    const first = proxy.nested;
    const second = proxy.nested;
    expect(first).toBe(second);
  });
});
