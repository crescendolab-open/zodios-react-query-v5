import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toProxy } from "../src/index.js";

describe("toProxy prototype & special keys", () => {
  it("toString returns [object Object] via prototype passthrough", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expect(proxy.toString()).toBe("[object Object]");
  });

  it("valueOf returns the proxy itself", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expect(proxy.valueOf()).toBe(proxy);
  });

  it("constructor is not confused with Object.prototype.constructor", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expect("constructor" in proxy).toBe(false);
  });

  it("does not include constructor in Object.keys", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expect(Object.keys(proxy)).toEqual(["x"]);
  });

  it("schema with constructor field works correctly", () => {
    const schema = z.object({ constructor: z.string() });
    const proxy = toProxy(schema, { constructor: "MyClass" });
    expect(proxy.constructor).toBe("MyClass");
    expect("constructor" in proxy).toBe(true);
  });

  it("toJSON returns raw data for JSON.stringify", () => {
    const schema = z.object({ name: z.string(), bad: z.number() });
    const proxy = toProxy(schema, { name: "Alice", bad: "not-a-number" });
    expect(JSON.stringify(proxy)).toBe(
      JSON.stringify({ name: "Alice", bad: "not-a-number" }),
    );
  });

  it("symbol.toPrimitive is passed through", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expect(Symbol.toPrimitive in proxy).toBe(false);
  });
});
