import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("toProxy ZodCatch behavior", () => {
  it("returns fallback value when inner validation fails", () => {
    const schema = z.object({
      count: z.number().catch(0),
    });
    const proxy = toProxy(schema, { count: "not-a-number" });
    expect(proxy.count).toBe(0);
  });

  it("returns valid value when inner validation passes", () => {
    const schema = z.object({
      count: z.number().catch(0),
    });
    const proxy = toProxy(schema, { count: 42 });
    expect(proxy.count).toBe(42);
  });

  it("returns fallback for undefined when inner schema is required", () => {
    const schema = z.object({
      name: z.string().catch("anonymous"),
    });
    const proxy = toProxy(schema, {});
    expect(proxy.name).toBe("anonymous");
  });

  it("returns fallback via function", () => {
    const schema = z.object({
      items: z.array(z.string()).catch(() => []),
    });
    const proxy = toProxy(schema, { items: "not-an-array" });
    expect(proxy.items).toEqual([]);
  });

  it("nested catch with object", () => {
    const schema = z.object({
      user: z
        .object({
          name: z.string(),
          age: z.number(),
        })
        .catch({ name: "unknown", age: 0 }),
    });
    const proxy = toProxy(schema, { user: "not-an-object" });
    expect(proxy.user).toEqual({ name: "unknown", age: 0 });
  });
});
