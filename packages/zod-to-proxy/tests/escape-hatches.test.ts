import { describe, expect, it } from "vitest";
import { z } from "zod";

import { getRaw, isToProxy, materialize, toProxy } from "../src/index.js";

describe("escape hatches", () => {
  describe("getRaw", () => {
    it("returns raw data from a proxy", () => {
      const data = { name: "Alice", age: 30 };
      const schema = z.object({ name: z.string(), age: z.number() });
      const proxy = toProxy(schema, data);
      expect(getRaw(proxy)).toBe(data);
    });

    it("returns input as-is for non-proxy values", () => {
      expect(getRaw("hello")).toBe("hello");
      expect(getRaw(42)).toBe(42);
      expect(getRaw(null)).toBe(null);
      expect(getRaw(undefined)).toBe(undefined);
    });

    it("returns raw from nested child proxy", () => {
      const childData = { x: 1 };
      const data = { child: childData };
      const schema = z.object({ child: z.object({ x: z.number() }) });
      const proxy = toProxy(schema, data);
      expect(getRaw(proxy.child)).toBe(childData);
    });
  });

  describe("materialize", () => {
    it("fully validates and returns parsed data from proxy", () => {
      const schema = z.object({ name: z.string(), count: z.number() });
      const proxy = toProxy(schema, { name: "Alice", count: 5 });
      const result = materialize(proxy);
      expect(result).toEqual({ name: "Alice", count: 5 });
    });

    it("throws ZodError for invalid data", () => {
      const schema = z.object({ name: z.string(), count: z.number() });
      const proxy = toProxy(schema, { name: "Alice", count: "bad" });
      expect(() => materialize(proxy)).toThrow();
    });

    it("returns input as-is for non-proxy values", () => {
      expect(materialize("hello")).toBe("hello");
      expect(materialize(42)).toBe(42);
      expect(materialize(null)).toBe(null);
    });
  });

  describe("isToProxy", () => {
    it("returns true for a proxy", () => {
      const schema = z.object({ x: z.number() });
      const proxy = toProxy(schema, { x: 1 });
      expect(isToProxy(proxy)).toBe(true);
    });

    it("returns false for plain objects", () => {
      expect(isToProxy({ x: 1 })).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isToProxy("hello")).toBe(false);
      expect(isToProxy(42)).toBe(false);
      expect(isToProxy(null)).toBe(false);
      expect(isToProxy(undefined)).toBe(false);
    });

    it("returns true for array proxy", () => {
      const schema = z.array(z.number());
      const proxy = toProxy(schema, [1, 2]);
      expect(isToProxy(proxy)).toBe(true);
    });
  });
});
