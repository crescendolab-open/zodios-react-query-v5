import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("toProxy root behavior", () => {
  it("returns a proxy for object schema with valid data", () => {
    const schema = z.object({ name: z.string() });
    const result = toProxy(schema, { name: "Alice" });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("returns a proxy for object schema with partially invalid data", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = toProxy(schema, { name: "Alice", age: "not-a-number" });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("throws TypeError for null input", () => {
    const schema = z.object({ name: z.string() });
    expect(() => toProxy(schema, null)).toThrow(TypeError);
  });

  it("throws TypeError for undefined input", () => {
    const schema = z.object({ name: z.string() });
    expect(() => toProxy(schema, undefined)).toThrow(TypeError);
  });

  it("throws TypeError for primitive string input", () => {
    const schema = z.object({ name: z.string() });
    expect(() => toProxy(schema, "hello")).toThrow(TypeError);
  });

  it("throws TypeError for primitive number input", () => {
    const schema = z.object({ name: z.string() });
    expect(() => toProxy(schema, 42)).toThrow(TypeError);
  });

  it("throws TypeError for primitive boolean input", () => {
    const schema = z.object({ name: z.string() });
    expect(() => toProxy(schema, true)).toThrow(TypeError);
  });

  it("accepts array input with array schema", () => {
    const schema = z.array(z.string());
    const result = toProxy(schema, ["a", "b"]);
    expect(result).toBeDefined();
  });

  it("does not eagerly validate — invalid fields do not throw on creation", () => {
    const schema = z.object({
      valid: z.string(),
      invalid: z.number(),
      nested: z.object({ deep: z.boolean() }),
    });
    expect(() =>
      toProxy(schema, {
        valid: "ok",
        invalid: "not-a-number",
        nested: { deep: "not-a-boolean" },
      }),
    ).not.toThrow();
  });
});
