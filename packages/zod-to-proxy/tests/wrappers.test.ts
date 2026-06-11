import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

describe("toProxy wrapper semantics", () => {
  describe("zodOptional", () => {
    it("returns undefined for missing optional field", () => {
      const schema = z.object({ name: z.string().optional() });
      const proxy = toProxy(schema, {});
      expect(proxy.name).toBeUndefined();
    });

    it("returns value for present optional field", () => {
      const schema = z.object({ name: z.string().optional() });
      const proxy = toProxy(schema, { name: "Alice" });
      expect(proxy.name).toBe("Alice");
    });

    it("throws for null on optional (not nullable)", () => {
      const schema = z.object({ name: z.string().optional() });
      const proxy = toProxy(schema, { name: null });
      expect(() => proxy.name).toThrow(ProxyZodError);
    });
  });

  describe("zodNullable", () => {
    it("returns null for null nullable field", () => {
      const schema = z.object({ name: z.string().nullable() });
      const proxy = toProxy(schema, { name: null });
      expect(proxy.name).toBeNull();
    });

    it("returns value for present nullable field", () => {
      const schema = z.object({ name: z.string().nullable() });
      const proxy = toProxy(schema, { name: "Alice" });
      expect(proxy.name).toBe("Alice");
    });

    it("throws for undefined on nullable (not optional)", () => {
      const schema = z.object({ name: z.string().nullable() });
      const proxy = toProxy(schema, {});
      expect(() => proxy.name).toThrow(ProxyZodError);
    });
  });

  describe("zodDefault", () => {
    it("substitutes default for undefined", () => {
      const schema = z.object({ count: z.number().default(0) });
      const proxy = toProxy(schema, {});
      expect(proxy.count).toBe(0);
    });

    it("does not substitute default for explicit value", () => {
      const schema = z.object({ count: z.number().default(0) });
      const proxy = toProxy(schema, { count: 5 });
      expect(proxy.count).toBe(5);
    });

    it("throws for null on default (not nullable)", () => {
      const schema = z.object({ count: z.number().default(0) });
      const proxy = toProxy(schema, { count: null });
      expect(() => proxy.count).toThrow(ProxyZodError);
    });
  });

  describe("zodReadonly", () => {
    it("unwraps readonly and resolves inner schema", () => {
      const schema = z.object({
        items: z.array(z.string()).readonly(),
      });
      const proxy = toProxy(schema, { items: ["a", "b"] });
      expect(proxy.items[0]).toBe("a");
    });
  });

  describe("nested wrappers", () => {
    it("optional + nullable: null is valid", () => {
      const schema = z.object({ x: z.string().optional().nullable() });
      const proxy = toProxy(schema, { x: null });
      expect(proxy.x).toBeNull();
    });

    it("optional + nullable: undefined is valid", () => {
      const schema = z.object({ x: z.string().optional().nullable() });
      const proxy = toProxy(schema, {});
      expect(proxy.x).toBeUndefined();
    });

    it("nullable + optional: null is valid", () => {
      const schema = z.object({ x: z.string().nullable().optional() });
      const proxy = toProxy(schema, { x: null });
      expect(proxy.x).toBeNull();
    });

    it("nullable + optional: undefined is valid", () => {
      const schema = z.object({ x: z.string().nullable().optional() });
      const proxy = toProxy(schema, {});
      expect(proxy.x).toBeUndefined();
    });
  });
});
