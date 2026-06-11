import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("toProxy read-only enforcement", () => {
  it("setting a property throws TypeError", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 }) as Record<string, unknown>;
    expect(() => {
      proxy.x = 2;
    }).toThrow(TypeError);
  });

  it("deleting a property throws TypeError", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 }) as Record<string, unknown>;
    expect(() => {
      delete proxy.x;
    }).toThrow(TypeError);
  });

  it("defineProperty throws TypeError", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expect(() => {
      Object.defineProperty(proxy, "y", { value: 2 });
    }).toThrow(TypeError);
  });

  it("array proxy rejects set", () => {
    const schema = z.array(z.number());
    const proxy = toProxy(schema, [1, 2, 3]) as Array<unknown>;
    expect(() => {
      proxy[0] = 99;
    }).toThrow(TypeError);
  });
});
