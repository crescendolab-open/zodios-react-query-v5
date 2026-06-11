import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

describe("proxyZodError details", () => {
  it("has correct name", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: "bad" });
    try {
      void proxy.x;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).name).toBe("ProxyZodError");
    }
  });

  it("path contains full nested access path", () => {
    const schema = z.object({
      a: z.object({
        b: z.object({
          c: z.number(),
        }),
      }),
    });
    const proxy = toProxy(schema, { a: { b: { c: "bad" } } });
    try {
      void proxy.a.b.c;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).path).toEqual(["a", "b", "c"]);
    }
  });

  it("path includes numeric indices for arrays", () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.number() })),
    });
    const proxy = toProxy(schema, {
      items: [{ value: 1 }, { value: "bad" }],
    });
    try {
      void proxy.items[1].value;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).path).toEqual(["items", 1, "value"]);
    }
  });

  it("zodError contains the zod validation error", () => {
    const schema = z.object({ age: z.number() });
    const proxy = toProxy(schema, { age: "bad" });
    try {
      void proxy.age;
      expect.unreachable("should have thrown");
    } catch (err) {
      const pze = err as ProxyZodError;
      expect(pze.zodError).toBeInstanceOf(z.ZodError);
      expect(pze.zodError.issues.length).toBeGreaterThan(0);
    }
  });

  it("cause is the same as zodError", () => {
    const schema = z.object({ age: z.number() });
    const proxy = toProxy(schema, { age: "bad" });
    try {
      void proxy.age;
      expect.unreachable("should have thrown");
    } catch (err) {
      const pze = err as ProxyZodError;
      expect(pze.cause).toBe(pze.zodError);
    }
  });

  it("flatIssues returns flattened issues", () => {
    const schema = z.object({ age: z.number() });
    const proxy = toProxy(schema, { age: "bad" });
    try {
      void proxy.age;
      expect.unreachable("should have thrown");
    } catch (err) {
      const pze = err as ProxyZodError;
      const issues = pze.flatIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.code).toBe("invalid_type");
    }
  });

  it("message includes path", () => {
    const schema = z.object({
      user: z.object({ name: z.number() }),
    });
    const proxy = toProxy(schema, { user: { name: "bad" } });
    try {
      void proxy.user.name;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ProxyZodError).message).toContain("user.name");
    }
  });

  describe("isProxyZodError", () => {
    it("returns true for ProxyZodError instances", () => {
      const schema = z.object({ x: z.number() });
      const proxy = toProxy(schema, { x: "bad" });
      try {
        void proxy.x;
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(ProxyZodError.isProxyZodError(err)).toBe(true);
      }
    });

    it("returns false for regular errors", () => {
      expect(ProxyZodError.isProxyZodError(new Error("nope"))).toBe(false);
    });

    it("returns false for non-error values", () => {
      expect(ProxyZodError.isProxyZodError(null)).toBe(false);
      expect(ProxyZodError.isProxyZodError("string")).toBe(false);
      expect(ProxyZodError.isProxyZodError(42)).toBe(false);
    });

    it("detects via Symbol.for brand (cross-realm simulation)", () => {
      const fake = {
        [Symbol.for("ProxyZodError")]: true,
      };
      expect(ProxyZodError.isProxyZodError(fake)).toBe(true);
    });
  });
});
