import type { ZodTypeAny } from "zod";

export type NodeKind = "decomposable" | "atomic" | "leaf";

interface ZodInternalDef {
  typeName: string;
  innerType?: ZodTypeAny;
}

function typeName(schema: ZodTypeAny): string {
  return (schema._def as ZodInternalDef).typeName;
}

const DECOMPOSABLE_TYPES = new Set([
  "ZodObject",
  "ZodArray",
  "ZodTuple",
  "ZodOptional",
  "ZodNullable",
  "ZodDefault",
  "ZodReadonly",
  "ZodLazy",
  "ZodBranded",
  "ZodCatch",
]);

const ATOMIC_TYPES = new Set([
  "ZodUnion",
  "ZodDiscriminatedUnion",
  "ZodIntersection",
  "ZodEffects",
  "ZodRecord",
  "ZodPipeline",
]);

export function classify(schema: ZodTypeAny): NodeKind {
  const name = typeName(schema);

  if (DECOMPOSABLE_TYPES.has(name)) return "decomposable";
  if (ATOMIC_TYPES.has(name)) return "atomic";

  return "leaf";
}

export function unwrap(schema: ZodTypeAny): ZodTypeAny | null {
  const name = typeName(schema);

  if (name === "ZodOptional" || name === "ZodNullable") {
    return (schema as unknown as { unwrap: () => ZodTypeAny }).unwrap();
  }
  if (name === "ZodDefault" || name === "ZodReadonly" || name === "ZodCatch") {
    return (schema._def as ZodInternalDef).innerType ?? null;
  }
  if (name === "ZodBranded") {
    return (schema as unknown as { unwrap: () => ZodTypeAny }).unwrap();
  }
  if (name === "ZodLazy") {
    return (schema as unknown as { schema: ZodTypeAny }).schema;
  }
  return null;
}
