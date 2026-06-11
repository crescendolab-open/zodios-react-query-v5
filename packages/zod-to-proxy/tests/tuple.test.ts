import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

describe("toProxy ZodTuple behavior", () => {
  it("validates each element against its position schema", () => {
    const schema = z.tuple([z.string(), z.number(), z.boolean()]);
    const proxy = toProxy(schema, ["hello", 42, true]);
    expect(proxy[0]).toBe("hello");
    expect(proxy[1]).toBe(42);
    expect(proxy[2]).toBe(true);
  });

  it("throws ProxyZodError for wrong type at position", () => {
    const schema = z.tuple([z.string(), z.number()]);
    const proxy = toProxy(schema, ["hello", "not-a-number"]);
    expect(proxy[0]).toBe("hello");
    expect(() => proxy[1]).toThrow(ProxyZodError);
  });

  it("reports correct path with numeric index", () => {
    const schema = z.tuple([z.string(), z.number()]);
    const proxy = toProxy(schema, ["hello", "bad"]);
    try {
      void proxy[1];
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).path).toEqual([1]);
    }
  });

  it("returns correct length", () => {
    const schema = z.tuple([z.string(), z.number()]);
    const proxy = toProxy(schema, ["hello", 42]);
    expect(proxy.length).toBe(2);
  });

  it("supports nested objects in tuple elements", () => {
    const schema = z.tuple([
      z.object({ name: z.string() }),
      z.object({ value: z.number() }),
    ]);
    const proxy = toProxy(schema, [{ name: "Alice" }, { value: 42 }]);
    expect(proxy[0].name).toBe("Alice");
    expect(proxy[1].value).toBe(42);
  });

  it("supports rest elements", () => {
    const schema = z.tuple([z.string()]).rest(z.number());
    const proxy = toProxy(schema, ["hello", 1, 2, 3]);
    expect(proxy[0]).toBe("hello");
    expect(proxy[1]).toBe(1);
    expect(proxy[2]).toBe(2);
    expect(proxy[3]).toBe(3);
  });

  it("throws for invalid rest element", () => {
    const schema = z.tuple([z.string()]).rest(z.number());
    const proxy = toProxy(schema, ["hello", "bad"]);
    expect(proxy[0]).toBe("hello");
    expect(() => proxy[1]).toThrow(ProxyZodError);
  });
});
