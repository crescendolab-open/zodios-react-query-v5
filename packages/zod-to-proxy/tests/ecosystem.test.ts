import { describe, expect, it } from "vitest";
import { z, ZodObject } from "zod";

describe("ecosystem pinning", () => {
  it("zodObject has a shape property with own keys", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    expect(schema).toBeInstanceOf(ZodObject);
    const shape = (schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape;
    expect(Object.hasOwn(shape, "name")).toBe(true);
    expect(Object.hasOwn(shape, "age")).toBe(true);
    expect(Object.hasOwn(shape, "constructor")).toBe(false);
  });

  it("zodArray._def.type holds item schema", () => {
    const schema = z.array(z.string());
    expect(schema._def.type).toBeInstanceOf(z.ZodString);
  });

  it("zodOptional.unwrap returns inner schema", () => {
    const inner = z.string();
    const schema = inner.optional();
    expect(schema.unwrap()).toBe(inner);
  });

  it("zodNullable.unwrap returns inner schema", () => {
    const inner = z.string();
    const schema = inner.nullable();
    expect(schema.unwrap()).toBe(inner);
  });

  it("zodDefault._def.innerType holds inner schema", () => {
    const schema = z.string().default("hello");
    expect(schema._def.innerType).toBeInstanceOf(z.ZodString);
  });

  it("zodDefault._def.defaultValue is a function", () => {
    const schema = z.number().default(42);
    expect(typeof schema._def.defaultValue).toBe("function");
    expect(schema._def.defaultValue()).toBe(42);
  });

  it("zodEffects wraps transform/refine schemas", () => {
    const schema = z.string().transform((s) => s.length);
    expect(schema).toBeInstanceOf(z.ZodEffects);
  });

  it("zodPipeline._def.out holds output schema", () => {
    const schema = z.string().pipe(z.coerce.number());
    expect(schema._def.out).toBeInstanceOf(z.ZodNumber);
  });
});
