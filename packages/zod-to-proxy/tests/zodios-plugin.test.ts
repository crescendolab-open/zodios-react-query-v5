import type {
  AnyZodiosRequestOptions,
  ZodiosEndpointDefinitions,
} from "@zodios/core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { isToProxy, ProxyZodError } from "../src/index.js";
import { resilientPlugin } from "../src/zodios-plugin.js";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
});

const api: ZodiosEndpointDefinitions = [
  {
    method: "get",
    path: "/users/:id",
    response: UserSchema,
    alias: "getUser",
    description: "Get user by ID",
    parameters: [],
    errors: [],
  },
];

function makeConfig(
  overrides: Partial<AnyZodiosRequestOptions> = {},
): AnyZodiosRequestOptions {
  return {
    method: "get",
    url: "/users/:id",
    ...overrides,
  } as AnyZodiosRequestOptions;
}

function makeResponse(
  data: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return { data, headers } as Parameters<
    NonNullable<ReturnType<typeof resilientPlugin>["response"]>
  >[2];
}

describe("resilientPlugin", () => {
  describe("plugin metadata", () => {
    it("uses 'zod-validation' name to replace built-in", () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      expect(plugin.name).toBe("zod-validation");
    });

    it("has a response hook", () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      expect(plugin.response).toBeTypeOf("function");
    });

    it("delegates request hook from original zodValidationPlugin", () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      expect(plugin.request).toBeTypeOf("function");
    });
  });

  describe("response: valid data", () => {
    it("returns parsed data when validation succeeds", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse({ id: 1, name: "Alice", email: "a@b.com" });

      const result = await plugin.response!(api, makeConfig(), response);

      expect(result.data).toEqual({ id: 1, name: "Alice", email: "a@b.com" });
      expect(onError).not.toHaveBeenCalled();
      expect(isToProxy(result.data)).toBe(false);
    });

    it("strips extra fields on successful parse", async () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      const response = makeResponse({
        id: 1,
        name: "Alice",
        email: "a@b.com",
        extraField: "ignored",
      });

      const result = await plugin.response!(api, makeConfig(), response);

      expect(result.data).toEqual({ id: 1, name: "Alice", email: "a@b.com" });
      expect(
        (result.data as Record<string, unknown>).extraField,
      ).toBeUndefined();
    });
  });

  describe("response: invalid data → toProxy fallback", () => {
    it("calls onError and returns toProxy wrapper on validation failure", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const rawData = { id: 1, name: 42, email: "a@b.com" };
      const response = makeResponse(rawData);

      const result = await plugin.response!(api, makeConfig(), response);

      expect(onError).toHaveBeenCalledOnce();
      expect(isToProxy(result.data)).toBe(true);
    });

    it("passes ZodError to onError with correct context", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const rawData = { id: "not-a-number", name: "Alice", email: "a@b.com" };
      const response = makeResponse(rawData);

      await plugin.response!(api, makeConfig(), response);

      const [error, context] = onError.mock.calls[0]!;
      expect(error).toBeInstanceOf(z.ZodError);
      expect(error.issues[0].code).toBe("invalid_type");
      expect(context).toEqual({
        method: "get",
        path: "/users/:id",
        data: rawData,
      });
    });

    it("toProxy fallback still serves valid fields", async () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      const response = makeResponse({ id: 1, name: 42, email: "a@b.com" });

      const result = await plugin.response!(api, makeConfig(), response);
      const data = result.data as z.infer<typeof UserSchema>;

      expect(data.id).toBe(1);
      expect(data.email).toBe("a@b.com");
    });

    it("toProxy fallback throws ProxyZodError on broken field access", async () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      const response = makeResponse({ id: 1, name: 42, email: "a@b.com" });

      const result = await plugin.response!(api, makeConfig(), response);
      const data = result.data as z.infer<typeof UserSchema>;

      expect(() => data.name).toThrow(ProxyZodError);
    });
  });

  describe("response: null/primitive data fallback", () => {
    it("does not crash when response.data is null", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse(null);

      const result = await plugin.response!(api, makeConfig(), response);

      expect(onError).toHaveBeenCalledOnce();
      expect(result.data).toBeNull();
    });

    it("does not crash when response.data is a primitive", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse("just a string");

      const result = await plugin.response!(api, makeConfig(), response);

      expect(onError).toHaveBeenCalledOnce();
      expect(result.data).toBe("just a string");
    });
  });

  describe("response: non-json content-type passthrough", () => {
    it("passes through text/plain responses without validation", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse("raw text", {
        "content-type": "text/plain",
      });

      const result = await plugin.response!(api, makeConfig(), response);

      expect(result.data).toBe("raw text");
      expect(onError).not.toHaveBeenCalled();
    });

    it("passes through responses with no content-type header", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse("something", {});

      const result = await plugin.response!(api, makeConfig(), response);

      expect(result.data).toBe("something");
      expect(onError).not.toHaveBeenCalled();
    });

    it("validates application/vnd.api+json responses", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse(
        { id: 1, name: "Alice", email: "a@b.com" },
        { "content-type": "application/vnd.api+json" },
      );

      const result = await plugin.response!(api, makeConfig(), response);

      expect(result.data).toEqual({ id: 1, name: "Alice", email: "a@b.com" });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("response: unknown endpoint passthrough", () => {
    it("passes through response when endpoint is not found in api", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const config = makeConfig({ method: "post", url: "/unknown" });
      const response = makeResponse({ anything: true });

      const result = await plugin.response!(api, config, response);

      expect(result.data).toEqual({ anything: true });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("response: transform schemas", () => {
    const TransformApi: ZodiosEndpointDefinitions = [
      {
        method: "get",
        path: "/date",
        response: z.object({
          createdAt: z.string().transform((s) => new Date(s)),
        }),
        alias: "getDate",
        description: "Get date",
        parameters: [],
        errors: [],
      },
    ];

    it("applies transforms on successful parse", async () => {
      const plugin = resilientPlugin({ onError: vi.fn() });
      const response = makeResponse({ createdAt: "2026-06-12T00:00:00Z" });
      const config = makeConfig({ method: "get", url: "/date" });

      const result = await plugin.response!(TransformApi, config, response);

      expect(result.data).toEqual({
        createdAt: new Date("2026-06-12T00:00:00Z"),
      });
    });

    it("falls back to toProxy when transform input is invalid", async () => {
      const onError = vi.fn();
      const plugin = resilientPlugin({ onError });
      const response = makeResponse({ createdAt: 12345 });
      const config = makeConfig({ method: "get", url: "/date" });

      const result = await plugin.response!(TransformApi, config, response);

      expect(onError).toHaveBeenCalledOnce();
      expect(isToProxy(result.data)).toBe(true);
    });
  });

  describe("multiple endpoints", () => {
    const multiApi: ZodiosEndpointDefinitions = [
      {
        method: "get",
        path: "/users/:id",
        response: UserSchema,
        alias: "getUser",
        description: "Get user",
        parameters: [],
        errors: [],
      },
      {
        method: "get",
        path: "/posts/:id",
        response: z.object({
          id: z.number(),
          title: z.string(),
          body: z.string(),
        }),
        alias: "getPost",
        description: "Get post",
        parameters: [],
        errors: [],
      },
    ];

    it("matches the correct endpoint schema", async () => {
      const plugin = resilientPlugin({ onError: vi.fn() });

      const userResponse = makeResponse({
        id: 1,
        name: "Alice",
        email: "a@b.com",
      });
      const userResult = await plugin.response!(
        multiApi,
        makeConfig({ method: "get", url: "/users/:id" }),
        userResponse,
      );
      expect(userResult.data).toEqual({
        id: 1,
        name: "Alice",
        email: "a@b.com",
      });

      const postResponse = makeResponse({
        id: 1,
        title: "Hello",
        body: "World",
      });
      const postResult = await plugin.response!(
        multiApi,
        makeConfig({ method: "get", url: "/posts/:id" }),
        postResponse,
      );
      expect(postResult.data).toEqual({ id: 1, title: "Hello", body: "World" });
    });
  });
});
