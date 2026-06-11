import type { ZodTypeAny } from "zod";
import {
  ZodArray,
  ZodBranded,
  ZodCatch,
  ZodDefault,
  ZodDiscriminatedUnion,
  ZodEffects,
  ZodIntersection,
  ZodLazy,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodPipeline,
  ZodReadonly,
  ZodRecord,
  ZodTuple,
  ZodUnion,
} from "zod";

export type NodeKind = "decomposable" | "atomic" | "leaf";

export function classify(schema: ZodTypeAny): NodeKind {
  if (
    schema instanceof ZodObject ||
    schema instanceof ZodArray ||
    schema instanceof ZodTuple
  ) {
    return "decomposable";
  }

  if (
    schema instanceof ZodOptional ||
    schema instanceof ZodNullable ||
    schema instanceof ZodDefault ||
    schema instanceof ZodReadonly ||
    schema instanceof ZodLazy ||
    schema instanceof ZodBranded ||
    schema instanceof ZodCatch ||
    schema instanceof ZodPipeline
  ) {
    return "decomposable";
  }

  if (
    schema instanceof ZodUnion ||
    schema instanceof ZodDiscriminatedUnion ||
    schema instanceof ZodIntersection ||
    schema instanceof ZodEffects ||
    schema instanceof ZodRecord
  ) {
    return "atomic";
  }

  return "leaf";
}

export function unwrap(schema: ZodTypeAny): ZodTypeAny | null {
  if (schema instanceof ZodOptional) return schema.unwrap();
  if (schema instanceof ZodNullable) return schema.unwrap();
  if (schema instanceof ZodDefault) return schema._def.innerType as ZodTypeAny;
  if (schema instanceof ZodReadonly) return schema._def.innerType as ZodTypeAny;
  if (schema instanceof ZodBranded) return schema.unwrap();
  if (schema instanceof ZodCatch) return schema._def.innerType as ZodTypeAny;
  if (schema instanceof ZodLazy) return (schema as ZodLazy<ZodTypeAny>).schema;
  if (schema instanceof ZodPipeline) return schema._def.out as ZodTypeAny;
  return null;
}
