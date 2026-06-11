import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  getRaw,
  isToProxy,
  materialize,
  ProxyZodError,
  toProxy,
} from "../src/index.js";

describe("type tests", () => {
  it("toProxy returns ReadonlyDeep<z.infer<T>>", () => {
    const schema = z.object({
      name: z.string(),
      nested: z.object({ value: z.number() }),
    });
    const result = toProxy(schema, { name: "test", nested: { value: 1 } });
    expectTypeOf(result.name).toBeString();
    expectTypeOf(result.nested.value).toBeNumber();
  });

  it("toProxy result is readonly (nested)", () => {
    const schema = z.object({
      items: z.array(z.object({ x: z.number() })),
    });
    const result = toProxy(schema, { items: [{ x: 1 }] });
    expectTypeOf(result.items).toBeObject();

    type Result = typeof result;
    type ItemsProp = Result["items"];
    expectTypeOf<ItemsProp>().toEqualTypeOf<
      ReadonlyArray<Readonly<{ x: number }>>
    >();
  });

  it("proxyZodError.isProxyZodError narrows type", () => {
    const err: unknown = new Error("test");
    if (ProxyZodError.isProxyZodError(err)) {
      expectTypeOf(err).toEqualTypeOf<ProxyZodError>();
      expectTypeOf(err.path).toEqualTypeOf<Array<string | number>>();
    }
  });

  it("getRaw returns unknown", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expectTypeOf(getRaw(proxy)).toBeUnknown();
  });

  it("materialize returns unknown", () => {
    const schema = z.object({ x: z.number() });
    const proxy = toProxy(schema, { x: 1 });
    expectTypeOf(materialize(proxy)).toBeUnknown();
  });

  it("isToProxy returns boolean", () => {
    expectTypeOf(isToProxy({})).toBeBoolean();
  });

  it("handles optional fields", () => {
    const schema = z.object({ name: z.string().optional() });
    const result = toProxy(schema, {});
    expectTypeOf(result.name).toEqualTypeOf<string | undefined>();
  });

  it("handles nullable fields", () => {
    const schema = z.object({ name: z.string().nullable() });
    const result = toProxy(schema, { name: null });
    expectTypeOf(result.name).toEqualTypeOf<string | null>();
  });

  it("handles array schema", () => {
    const schema = z.array(z.number());
    const result = toProxy(schema, [1, 2, 3]);
    expectTypeOf(result).toEqualTypeOf<ReadonlyArray<number>>();
  });
});
