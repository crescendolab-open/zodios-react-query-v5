import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  getRaw,
  isToProxy,
  materialize,
  ProxyZodError,
  toProxy,
} from "../src/index.js";

describe("integration: real-world zodios-like response", () => {
  const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      zipcode: z.string(),
      geo: z.object({
        lat: z.string(),
        lng: z.string(),
      }),
    }),
    company: z.object({
      name: z.string(),
      catchPhrase: z.string(),
    }),
    website: z.string(),
  });

  const rawUser = {
    id: 1,
    name: "Alice Wang",
    email: "alice@example.com",
    address: {
      street: "123 Main St",
      city: "Taipei",
      zipcode: "10601",
      geo: {
        lat: "25.0330",
        lng: "121.5654",
      },
    },
    company: {
      name: "Acme Corp",
      catchPhrase: "Building the future",
    },
    website: "example.com",
    extraFieldFromApi: "should be ignored",
  };

  it("creates proxy without throwing despite extra field", () => {
    expect(() => toProxy(UserSchema, rawUser)).not.toThrow();
  });

  it("accesses valid top-level fields", () => {
    const user = toProxy(UserSchema, rawUser);
    expect(user.id).toBe(1);
    expect(user.name).toBe("Alice Wang");
    expect(user.email).toBe("alice@example.com");
  });

  it("accesses valid nested fields lazily", () => {
    const user = toProxy(UserSchema, rawUser);
    expect(user.address.city).toBe("Taipei");
    expect(user.address.geo.lat).toBe("25.0330");
    expect(user.company.name).toBe("Acme Corp");
  });

  it("strips extra fields not in schema", () => {
    const user = toProxy(UserSchema, rawUser);
    expect(
      (user as unknown as Record<string, unknown>).extraFieldFromApi,
    ).toBeUndefined();
    expect(Object.keys(user)).not.toContain("extraFieldFromApi");
  });

  it("serializes to raw JSON without triggering validation", () => {
    const user = toProxy(UserSchema, rawUser);
    const json = JSON.parse(JSON.stringify(user));
    expect(json.name).toBe("Alice Wang");
    expect(json.extraFieldFromApi).toBe("should be ignored");
  });

  it("getRaw returns original data", () => {
    const user = toProxy(UserSchema, rawUser);
    expect(getRaw(user)).toBe(rawUser);
  });

  it("isToProxy identifies proxy", () => {
    const user = toProxy(UserSchema, rawUser);
    expect(isToProxy(user)).toBe(true);
    expect(isToProxy(rawUser)).toBe(false);
  });

  it("materialize runs full validation", () => {
    const user = toProxy(UserSchema, rawUser);
    const result = materialize(user) as z.infer<typeof UserSchema>;
    expect(result.name).toBe("Alice Wang");
    expect(result.address.city).toBe("Taipei");
  });

  describe("with partially broken response", () => {
    const brokenRawUser = {
      ...rawUser,
      address: {
        ...rawUser.address,
        geo: {
          lat: 123,
          lng: null,
        },
      },
    };

    it("accesses valid paths without errors", () => {
      const user = toProxy(UserSchema, brokenRawUser);
      expect(user.name).toBe("Alice Wang");
      expect(user.address.city).toBe("Taipei");
      expect(user.company.catchPhrase).toBe("Building the future");
    });

    it("throws ProxyZodError only when broken path is accessed", () => {
      const user = toProxy(UserSchema, brokenRawUser);
      expect(() => user.address.geo.lat).toThrow(ProxyZodError);

      try {
        void user.address.geo.lat;
      } catch (err) {
        const pze = err as ProxyZodError;
        expect(pze.path).toEqual(["address", "geo", "lat"]);
        expect(pze.zodError.issues[0]!.code).toBe("invalid_type");
      }
    });

    it("sibling of broken path is still accessible", () => {
      const user = toProxy(UserSchema, brokenRawUser);
      expect(user.address.street).toBe("123 Main St");
    });
  });

  describe("list endpoint", () => {
    const UsersSchema = z.array(UserSchema);

    it("wraps array of users lazily", () => {
      const users = toProxy(UsersSchema, [rawUser, rawUser]);
      expect(users.length).toBe(2);
      expect(users[0].name).toBe("Alice Wang");
      expect(users[1].address.city).toBe("Taipei");
    });

    it("broken item does not affect other items", () => {
      const brokenUser = { ...rawUser, name: 42 };
      const users = toProxy(UsersSchema, [rawUser, brokenUser]);
      expect(users[0].name).toBe("Alice Wang");
      expect(() => users[1].name).toThrow(ProxyZodError);
    });
  });
});
