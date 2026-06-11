import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

describe("toProxy atomic nodes", () => {
  describe("zodUnion", () => {
    it("validates entire union subtree on access", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });
      const proxy = toProxy(schema, { value: "hello" });
      expect(proxy.value).toBe("hello");
    });

    it("throws ProxyZodError for invalid union", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });
      const proxy = toProxy(schema, { value: true });
      expect(() => proxy.value).toThrow(ProxyZodError);
    });
  });

  describe("zodDiscriminatedUnion", () => {
    it("validates discriminated union on access", () => {
      const schema = z.object({
        event: z.discriminatedUnion("type", [
          z.object({ type: z.literal("click"), x: z.number() }),
          z.object({ type: z.literal("scroll"), offset: z.number() }),
        ]),
      });
      const proxy = toProxy(schema, {
        event: { type: "click", x: 10 },
      });
      expect(proxy.event).toEqual({ type: "click", x: 10 });
    });

    it("throws for invalid discriminated union", () => {
      const schema = z.object({
        event: z.discriminatedUnion("type", [
          z.object({ type: z.literal("click"), x: z.number() }),
        ]),
      });
      const proxy = toProxy(schema, {
        event: { type: "unknown" },
      });
      expect(() => proxy.event).toThrow(ProxyZodError);
    });
  });

  describe("zodEffects (transform)", () => {
    it("applies transform on access", () => {
      const schema = z.object({
        value: z.string().transform((s) => s.toUpperCase()),
      });
      const proxy = toProxy(schema, { value: "hello" });
      expect(proxy.value).toBe("HELLO");
    });

    it("throws ProxyZodError for invalid input to transform", () => {
      const schema = z.object({
        value: z.string().transform((s) => s.toUpperCase()),
      });
      const proxy = toProxy(schema, { value: 123 });
      expect(() => proxy.value).toThrow(ProxyZodError);
    });
  });

  describe("zodEffects (refine)", () => {
    it("validates refine on access", () => {
      const schema = z.object({
        email: z.string().refine((s) => s.includes("@"), "Must be email"),
      });
      const proxy = toProxy(schema, { email: "a@b.com" });
      expect(proxy.email).toBe("a@b.com");
    });

    it("throws ProxyZodError for failing refine", () => {
      const schema = z.object({
        email: z.string().refine((s) => s.includes("@"), "Must be email"),
      });
      const proxy = toProxy(schema, { email: "not-an-email" });
      expect(() => proxy.email).toThrow(ProxyZodError);
    });
  });

  describe("zodRecord", () => {
    it("validates record on access", () => {
      const schema = z.object({
        meta: z.record(z.string(), z.number()),
      });
      const proxy = toProxy(schema, { meta: { a: 1, b: 2 } });
      expect(proxy.meta).toEqual({ a: 1, b: 2 });
    });

    it("throws ProxyZodError for invalid record values", () => {
      const schema = z.object({
        meta: z.record(z.string(), z.number()),
      });
      const proxy = toProxy(schema, { meta: { a: "not-number" } });
      expect(() => proxy.meta).toThrow(ProxyZodError);
    });
  });

  describe("zodIntersection", () => {
    it("validates intersection on access", () => {
      const schema = z.object({
        data: z.intersection(
          z.object({ a: z.string() }),
          z.object({ b: z.number() }),
        ),
      });
      const proxy = toProxy(schema, { data: { a: "x", b: 1 } });
      expect(proxy.data).toEqual({ a: "x", b: 1 });
    });

    it("throws ProxyZodError for invalid intersection", () => {
      const schema = z.object({
        data: z.intersection(
          z.object({ a: z.string() }),
          z.object({ b: z.number() }),
        ),
      });
      const proxy = toProxy(schema, { data: { a: "x", b: "bad" } });
      expect(() => proxy.data).toThrow(ProxyZodError);
    });
  });
});
