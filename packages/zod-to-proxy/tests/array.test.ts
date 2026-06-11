import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

describe("toProxy array behavior", () => {
  it("accesses valid elements by index", () => {
    const schema = z.array(z.string());
    const proxy = toProxy(schema, ["a", "b", "c"]);
    expect(proxy[0]).toBe("a");
    expect(proxy[1]).toBe("b");
    expect(proxy[2]).toBe("c");
  });

  it("reports correct length", () => {
    const schema = z.array(z.number());
    const proxy = toProxy(schema, [1, 2, 3]);
    expect(proxy.length).toBe(3);
  });

  it("throws ProxyZodError for invalid element on access", () => {
    const schema = z.array(z.number());
    const proxy = toProxy(schema, [1, "bad", 3]);
    expect(proxy[0]).toBe(1);
    expect(() => proxy[1]).toThrow(ProxyZodError);
    expect(proxy[2]).toBe(3);
  });

  it("proxyZodError has correct numeric path for array elements", () => {
    const schema = z.array(z.number());
    const proxy = toProxy(schema, [1, "bad"]);
    try {
      void proxy[1];
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).path).toEqual([1]);
    }
  });

  it("supports nested arrays", () => {
    const schema = z.array(z.array(z.number()));
    const proxy = toProxy(schema, [
      [1, 2],
      [3, 4],
    ]);
    expect(proxy[0][0]).toBe(1);
    expect(proxy[1][1]).toBe(4);
  });

  it("nested array error has full path", () => {
    const schema = z.array(z.array(z.number()));
    const proxy = toProxy(schema, [[1], ["bad"]]);
    try {
      void proxy[1][0];
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).path).toEqual([1, 0]);
    }
  });

  it("supports iteration with for...of", () => {
    const schema = z.array(z.number());
    const proxy = toProxy(schema, [10, 20, 30]);
    const items: Array<number> = [];
    for (const item of proxy) {
      items.push(item);
    }
    expect(items).toEqual([10, 20, 30]);
  });

  it("supports Array.from", () => {
    const schema = z.array(z.string());
    const proxy = toProxy(schema, ["a", "b"]);
    expect(Array.from(proxy)).toEqual(["a", "b"]);
  });

  it("does not coerce empty string or whitespace to index 0", () => {
    const schema = z.array(z.string());
    const proxy = toProxy(schema, ["a", "b"]);
    expect((proxy as unknown as Record<string, unknown>)[""]).toBeUndefined();
    expect((proxy as unknown as Record<string, unknown>)["  "]).toBeUndefined();
    expect(
      (proxy as unknown as Record<string, unknown>)["1.0"],
    ).toBeUndefined();
  });

  it("objects nested in arrays are lazy", () => {
    const schema = z.array(z.object({ x: z.number(), y: z.string() }));
    const proxy = toProxy(schema, [
      { x: 1, y: "ok" },
      { x: "bad", y: "ok" },
    ]);
    expect(proxy[0].y).toBe("ok");
    expect(proxy[1].y).toBe("ok");
    expect(() => proxy[1].x).toThrow(ProxyZodError);
  });
});
