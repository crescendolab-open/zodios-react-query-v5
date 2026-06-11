import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("toProxy enumeration traps", () => {
  it("object.keys returns schema shape keys only", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const proxy = toProxy(schema, { a: "x", b: 1, extra: true });
    expect(Object.keys(proxy)).toEqual(["a", "b"]);
  });

  it("'key in proxy' returns true for shape keys", () => {
    const schema = z.object({ a: z.string() });
    const proxy = toProxy(schema, { a: "x" });
    expect("a" in proxy).toBe(true);
  });

  it("'key in proxy' returns false for non-shape keys", () => {
    const schema = z.object({ a: z.string() });
    const proxy = toProxy(schema, { a: "x", b: 1 });
    expect("b" in proxy).toBe(false);
  });

  it("spread operator produces only shape keys", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const proxy = toProxy(schema, { a: "x", b: 1, extra: true });
    const spread = { ...proxy };
    expect(Object.keys(spread)).toEqual(["a", "b"]);
  });

  it("for...in iterates only shape keys", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const proxy = toProxy(schema, { a: "x", b: 1, extra: true });
    const keys: Array<string> = [];
    for (const key in proxy) {
      keys.push(key);
    }
    expect(keys).toEqual(["a", "b"]);
  });

  describe("array enumeration", () => {
    it("object.keys returns indices as strings", () => {
      const schema = z.array(z.string());
      const proxy = toProxy(schema, ["a", "b", "c"]);
      expect(Object.keys(proxy)).toEqual(["0", "1", "2"]);
    });

    it("spread produces array elements", () => {
      const schema = z.array(z.number());
      const proxy = toProxy(schema, [1, 2, 3]);
      const spread = [...proxy];
      expect(spread).toEqual([1, 2, 3]);
    });
  });
});
