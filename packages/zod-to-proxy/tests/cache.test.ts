import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("toProxy caching & identity", () => {
  it("same (schema, data) returns same proxy instance", () => {
    const schema = z.object({ x: z.number() });
    const data = { x: 1 };
    const a = toProxy(schema, data);
    const b = toProxy(schema, data);
    expect(a).toBe(b);
  });

  it("different data returns different proxy", () => {
    const schema = z.object({ x: z.number() });
    const a = toProxy(schema, { x: 1 });
    const b = toProxy(schema, { x: 2 });
    expect(a).not.toBe(b);
  });

  it("child proxy is referentially stable across accesses", () => {
    const schema = z.object({
      child: z.object({ val: z.string() }),
    });
    const proxy = toProxy(schema, { child: { val: "hi" } });
    expect(proxy.child).toBe(proxy.child);
  });
});
