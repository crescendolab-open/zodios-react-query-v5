import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ProxyZodError, toProxy } from "../src/index.js";

// -- DateValue: class instantiated via z.transform --

class DateValue {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, "0")}-${String(this.day).padStart(2, "0")}`;
  }
}

const DateStringSchema = z
  .string()
  .date()
  .transform((value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new DateValue(year!, month!, day!);
  });

// -- tolerantEnum: wraps an enum so unknown values produce a fallback
//    instead of throwing --

const unexpectedSymbol = Symbol("unexpected");

function tolerantEnum<T extends string>(schema: z.ZodType<T>) {
  return z.string().transform((raw) => {
    const result = schema.safeParse(raw);
    if (result.success) {
      return { expected: true as const, value: result.data };
    }
    return {
      expected: false as const,
      value: unexpectedSymbol,
      raw,
    };
  });
}

// -- test schemas --

const MetricSchema = z.object({
  date: DateStringSchema,
  value: z.number().int(),
  label: z.string().nullable(),
});

const ContactSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  birthday: z.string().transform((s) => {
    if (!s || s === "9999-12-31") return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return new DateValue(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }),
  role: tolerantEnum(z.enum(["admin", "editor", "viewer"])),
});

const RoutingRuleSchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("direct"), agentId: z.number().int() }),
  z.object({ strategy: z.literal("round-robin") }),
  z.object({ strategy: z.literal("group"), groupId: z.number().int() }),
]);

const AttachmentSchema = z.union([
  z.object({
    filename: z.string(),
    sizeBytes: z.number().int(),
  }),
  z.object({
    durationMs: z.number(),
  }),
]);

const NoteSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  author: z.enum(["human", "system", "bot"]),
  attachment: AttachmentSchema.nullable().catch(null),
  createdAt: z.string(),
});

const OrderStatusSchema = z.enum(["paid", "pending", "refunded"]);

// -- tests --

describe("real-world patterns", () => {
  describe("class-instantiating transform", () => {
    it("transforms date string into class instance on access", () => {
      const schema = z.object({ metric: MetricSchema });
      const proxy = toProxy(schema, {
        metric: { date: "2026-06-12", value: 42, label: "daily" },
      });
      const date = proxy.metric.date;
      expect(date).toBeInstanceOf(DateValue);
      expect(date.toString()).toBe("2026-06-12");
      expect(date.year).toBe(2026);
    });

    it("throws ProxyZodError for invalid date string", () => {
      const schema = z.object({ metric: MetricSchema });
      const proxy = toProxy(schema, {
        metric: { date: "not-a-date", value: 1, label: null },
      });
      expect(proxy.metric.value).toBe(1);
      expect(() => proxy.metric.date).toThrow(ProxyZodError);
    });

    it("does not validate date transform when only label is accessed", () => {
      const schema = z.object({ metric: MetricSchema });
      const proxy = toProxy(schema, {
        metric: { date: "bad", value: 1, label: "test" },
      });
      expect(proxy.metric.label).toBe("test");
    });
  });

  describe("nullable date transform with sentinel", () => {
    it("transforms valid date into class instance", () => {
      const proxy = toProxy(ContactSchema, {
        id: 1,
        name: "Alice",
        email: "a@b.com",
        birthday: "1990-05-15",
        role: "admin",
      });
      const birthday = proxy.birthday;
      expect(birthday).toBeInstanceOf(DateValue);
      expect(birthday!.toString()).toBe("1990-05-15");
    });

    it("returns null for sentinel value 9999-12-31", () => {
      const proxy = toProxy(ContactSchema, {
        id: 1,
        name: "Bob",
        email: "b@c.com",
        birthday: "9999-12-31",
        role: "admin",
      });
      expect(proxy.birthday).toBeNull();
    });

    it("returns null for invalid date string", () => {
      const proxy = toProxy(ContactSchema, {
        id: 1,
        name: "Eve",
        email: "e@f.com",
        birthday: "not-a-date",
        role: "admin",
      });
      expect(proxy.birthday).toBeNull();
    });
  });

  describe("tolerant enum (unknown values don't throw)", () => {
    it("returns expected: true for known value", () => {
      const proxy = toProxy(ContactSchema, {
        id: 1,
        name: "Alice",
        email: "a@b.com",
        birthday: "1990-01-01",
        role: "admin",
      });
      expect(proxy.role).toEqual({ expected: true, value: "admin" });
    });

    it("returns expected: false with raw for unknown value", () => {
      const proxy = toProxy(ContactSchema, {
        id: 1,
        name: "Alice",
        email: "a@b.com",
        birthday: "1990-01-01",
        role: "superadmin",
      });
      const role = proxy.role;
      expect(role.expected).toBe(false);
      expect("raw" in role && role.raw).toBe("superadmin");
      expect("value" in role && role.value).toBe(unexpectedSymbol);
    });

    it("does not evaluate enum when only name is read", () => {
      const proxy = toProxy(ContactSchema, {
        id: 1,
        name: "Alice",
        email: "a@b.com",
        birthday: "1990-01-01",
        role: "superadmin",
      });
      expect(proxy.name).toBe("Alice");
    });
  });

  describe("tolerant enum with order status", () => {
    const OrderSchema = z.object({
      orderId: z.string(),
      status: tolerantEnum(OrderStatusSchema),
      total: z.number(),
    });

    it("handles known status", () => {
      const proxy = toProxy(OrderSchema, {
        orderId: "ORD-001",
        status: "paid",
        total: 100,
      });
      expect(proxy.status).toEqual({ expected: true, value: "paid" });
    });

    it("handles unknown status from newer API version", () => {
      const proxy = toProxy(OrderSchema, {
        orderId: "ORD-002",
        status: "partially_refunded",
        total: 50,
      });
      expect(proxy.status.expected).toBe(false);
      expect(proxy.total).toBe(50);
    });
  });

  describe("discriminated union", () => {
    const ConfigSchema = z.object({
      name: z.string(),
      routing: RoutingRuleSchema,
    });

    it("resolves direct variant", () => {
      const proxy = toProxy(ConfigSchema, {
        name: "VIP config",
        routing: { strategy: "direct", agentId: 42 },
      });
      expect(proxy.routing).toEqual({ strategy: "direct", agentId: 42 });
    });

    it("resolves round-robin variant", () => {
      const proxy = toProxy(ConfigSchema, {
        name: "Default",
        routing: { strategy: "round-robin" },
      });
      expect(proxy.routing).toEqual({ strategy: "round-robin" });
    });

    it("throws for unknown discriminator value", () => {
      const proxy = toProxy(ConfigSchema, {
        name: "Bad config",
        routing: { strategy: "random" },
      });
      expect(proxy.name).toBe("Bad config");
      expect(() => proxy.routing).toThrow(ProxyZodError);
    });
  });

  describe("union with catch fallback", () => {
    it("resolves file attachment variant", () => {
      const proxy = toProxy(NoteSchema, {
        id: 1,
        body: "see attachment",
        author: "human",
        attachment: { filename: "doc.pdf", sizeBytes: 1024 },
        createdAt: "2026-06-12T00:00:00Z",
      });
      expect(proxy.attachment).toEqual({
        filename: "doc.pdf",
        sizeBytes: 1024,
      });
    });

    it("resolves audio attachment variant", () => {
      const proxy = toProxy(NoteSchema, {
        id: 2,
        body: "voice note",
        author: "human",
        attachment: { durationMs: 3200 },
        createdAt: "2026-06-12T00:00:00Z",
      });
      expect(proxy.attachment).toEqual({ durationMs: 3200 });
    });

    it("falls back to null for unrecognized attachment shape", () => {
      const proxy = toProxy(NoteSchema, {
        id: 3,
        body: "sticker",
        author: "bot",
        attachment: { stickerId: "abc", packId: "xyz" },
        createdAt: "2026-06-12T00:00:00Z",
      });
      expect(proxy.attachment).toBeNull();
    });

    it("unrecognized attachment does not affect other fields", () => {
      const proxy = toProxy(NoteSchema, {
        id: 4,
        body: "hello",
        author: "human",
        attachment: { broken: true },
        createdAt: "2026-06-12T00:00:00Z",
      });
      expect(proxy.body).toBe("hello");
      expect(proxy.author).toBe("human");
      expect(proxy.attachment).toBeNull();
    });
  });

  describe("array of notes (list endpoint)", () => {
    const NotesSchema = z.array(NoteSchema);

    it("broken attachment in one item does not affect others", () => {
      const proxy = toProxy(NotesSchema, [
        {
          id: 1,
          body: "hi",
          author: "human",
          attachment: null,
          createdAt: "2026-06-12T00:00:00Z",
        },
        {
          id: 2,
          body: "file",
          author: "system",
          attachment: { broken: "shape" },
          createdAt: "2026-06-12T00:00:00Z",
        },
      ]);
      expect(proxy[0].body).toBe("hi");
      expect(proxy[1].body).toBe("file");
      expect(proxy[1].attachment).toBeNull();
    });
  });

  describe("metrics array with class transform", () => {
    const DashboardSchema = z.object({
      metrics: z.array(MetricSchema),
    });

    it("lazily transforms each date independently", () => {
      const proxy = toProxy(DashboardSchema, {
        metrics: [
          { date: "2026-06-10", value: 100, label: null },
          { date: "bad-date", value: 200, label: null },
          { date: "2026-06-12", value: 300, label: "today" },
        ],
      });
      expect(proxy.metrics[0].date.toString()).toBe("2026-06-10");
      expect(proxy.metrics[2].date.toString()).toBe("2026-06-12");
      expect(proxy.metrics[2].label).toBe("today");
      expect(() => proxy.metrics[1].date).toThrow(ProxyZodError);
      expect(proxy.metrics[1].value).toBe(200);
    });
  });
});
