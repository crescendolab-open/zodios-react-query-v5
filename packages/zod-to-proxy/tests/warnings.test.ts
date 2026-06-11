import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("dev warnings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns when root schema is atomic (union)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = z.union([
      z.object({ type: z.literal("a") }),
      z.object({ type: z.literal("b") }),
    ]);
    toProxy(schema, { type: "a" });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("atomic");
  });

  it("warns when root schema is atomic (transform)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = z
      .object({ x: z.number() })
      .transform((obj) => ({ ...obj, doubled: obj.x * 2 }));
    toProxy(schema, { x: 5 });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("atomic");
  });

  it('warns when shape contains "then" key', () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = z.object({
      then: z.string(),
      value: z.number(),
    });
    toProxy(schema, { then: "next", value: 1 });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("then");
  });

  it("warns when input data is frozen", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = z.object({ x: z.number() });
    const data = Object.freeze({ x: 1 });
    toProxy(schema, data);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("frozen");
  });

  it("warns only once per schema (deduplicated)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = z.object({ then: z.string() });
    toProxy(schema, { then: "a" });
    toProxy(schema, { then: "b" });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("suppresses warnings in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const schema = z.object({ then: z.string() });
      toProxy(schema, { then: "a" });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
