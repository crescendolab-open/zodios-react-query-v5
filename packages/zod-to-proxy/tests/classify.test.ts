import { describe, expect, it } from "vitest";
import { z } from "zod";

import { classify } from "../src/classify.js";

describe("schema classification", () => {
  describe("decomposable", () => {
    it("classifies ZodObject as decomposable", () => {
      expect(classify(z.object({ x: z.number() }))).toBe("decomposable");
    });

    it("classifies ZodArray as decomposable", () => {
      expect(classify(z.array(z.string()))).toBe("decomposable");
    });

    it("classifies ZodTuple as decomposable", () => {
      expect(classify(z.tuple([z.string(), z.number()]))).toBe("decomposable");
    });

    it("classifies ZodOptional as decomposable", () => {
      expect(classify(z.string().optional())).toBe("decomposable");
    });

    it("classifies ZodNullable as decomposable", () => {
      expect(classify(z.string().nullable())).toBe("decomposable");
    });

    it("classifies ZodDefault as decomposable", () => {
      expect(classify(z.string().default("hi"))).toBe("decomposable");
    });

    it("classifies ZodReadonly as decomposable", () => {
      expect(classify(z.array(z.string()).readonly())).toBe("decomposable");
    });

    it("classifies ZodLazy as decomposable", () => {
      expect(classify(z.lazy(() => z.string()))).toBe("decomposable");
    });

    it("classifies ZodBranded as decomposable", () => {
      expect(classify(z.string().brand("UserId"))).toBe("decomposable");
    });

    it("classifies ZodCatch as decomposable", () => {
      expect(classify(z.string().catch("fallback"))).toBe("decomposable");
    });

    it("classifies ZodPipeline as decomposable", () => {
      expect(classify(z.string().pipe(z.coerce.number()))).toBe("decomposable");
    });
  });

  describe("atomic", () => {
    it("classifies ZodUnion as atomic", () => {
      expect(classify(z.union([z.string(), z.number()]))).toBe("atomic");
    });

    it("classifies ZodDiscriminatedUnion as atomic", () => {
      expect(
        classify(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("a") }),
            z.object({ type: z.literal("b") }),
          ]),
        ),
      ).toBe("atomic");
    });

    it("classifies ZodIntersection as atomic", () => {
      expect(
        classify(
          z.intersection(
            z.object({ a: z.string() }),
            z.object({ b: z.number() }),
          ),
        ),
      ).toBe("atomic");
    });

    it("classifies ZodEffects (refine) as atomic", () => {
      expect(classify(z.string().refine((s) => s.length > 0))).toBe("atomic");
    });

    it("classifies ZodEffects (transform) as atomic", () => {
      expect(classify(z.string().transform((s) => s.length))).toBe("atomic");
    });

    it("classifies ZodRecord as atomic", () => {
      expect(classify(z.record(z.string(), z.number()))).toBe("atomic");
    });
  });

  describe("leaf", () => {
    it("classifies ZodString as leaf", () => {
      expect(classify(z.string())).toBe("leaf");
    });

    it("classifies ZodNumber as leaf", () => {
      expect(classify(z.number())).toBe("leaf");
    });

    it("classifies ZodBoolean as leaf", () => {
      expect(classify(z.boolean())).toBe("leaf");
    });

    it("classifies ZodDate as leaf", () => {
      expect(classify(z.date())).toBe("leaf");
    });

    it("classifies ZodEnum as leaf", () => {
      expect(classify(z.enum(["a", "b"]))).toBe("leaf");
    });

    it("classifies ZodLiteral as leaf", () => {
      expect(classify(z.literal("hello"))).toBe("leaf");
    });

    it("classifies ZodUndefined as leaf", () => {
      expect(classify(z.undefined())).toBe("leaf");
    });

    it("classifies ZodNull as leaf", () => {
      expect(classify(z.null())).toBe("leaf");
    });

    it("classifies ZodAny as leaf", () => {
      expect(classify(z.any())).toBe("leaf");
    });

    it("classifies ZodUnknown as leaf", () => {
      expect(classify(z.unknown())).toBe("leaf");
    });

    it("classifies ZodNever as leaf", () => {
      expect(classify(z.never())).toBe("leaf");
    });

    it("classifies ZodBigInt as leaf", () => {
      expect(classify(z.bigint())).toBe("leaf");
    });

    it("classifies ZodNativeEnum as leaf", () => {
      enum Color {
        Red = "red",
        Blue = "blue",
      }
      expect(classify(z.nativeEnum(Color))).toBe("leaf");
    });
  });
});
