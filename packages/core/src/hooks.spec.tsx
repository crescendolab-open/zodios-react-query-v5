import type { ZodiosInstance } from "@zodios/core";
import type { AddressInfo } from "node:net";
import type { ZodiosHooksInstance } from "./hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor as _waitFor, renderHook } from "@testing-library/react";
import { makeApi, Zodios, ZodiosError } from "@zodios/core";
import cors from "cors";
import { get } from "es-toolkit/compat";
import express from "express";
import React from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import z from "zod";
import { ZodiosHooks } from "./hooks";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const waitFor: typeof _waitFor = async (...args) => {
  await sleep(15);
  const ret = await _waitFor(...args);
  await sleep(15);
  return ret;
};

const api = makeApi([
  {
    method: "get",
    path: "/users",
    alias: "getUsers",
    description: "Get all users",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().positive().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().positive().optional(),
      },
    ],
    response: z.object({
      page: z.number(),
      count: z.number(),
      nextPage: z.number().optional(),
      users: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      ),
    }),
  },
  {
    method: "post",
    path: "/users/search",
    alias: "searchUsers",
    description: "Search users",
    immutable: true,
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({
          name: z.string(),
          page: z.number().positive().optional(),
          limit: z.number().positive().optional(),
        }),
      },
    ],
    response: z.object({
      page: z.number(),
      count: z.number(),
      nextPage: z.number().optional(),
      users: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      ),
    }),
  },
  {
    method: "get",
    path: "/users/:id",
    alias: "getUser",
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
  {
    method: "get",
    path: "/users/:id/address/:address",
    alias: "getUserAddress",
    response: z.object({
      id: z.number(),
      address: z.string(),
    }),
  },
  {
    method: "post",
    path: "/users",
    alias: "createUser",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({
          name: z.string(),
        }),
      },
    ],
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
  {
    method: "put",
    path: "/users",
    alias: "updateUser",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ],
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
  {
    method: "patch",
    path: "/users",
    alias: "patchUser",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ],
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
  {
    method: "delete",
    path: "/users/:id",
    alias: "deleteUser",
    response: z.object({
      id: z.number(),
    }),
  },
  {
    method: "get",
    path: "/users/:id/error",
    alias: "getUserError",
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
  {
    method: "get",
    path: "/users/:id/cancel",
    alias: "getUserCancel",
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("zodios hooks", () => {
  let apiClient: ZodiosInstance<typeof api>;
  let apiHooks: ZodiosHooksInstance<typeof api>;

  describe("keys", () => {
    beforeAll(() => {
      apiClient = new Zodios(api);
      apiHooks = new ZodiosHooks("test", apiClient);
    });
    it("should get back endpoint key", () => {
      const key = apiHooks.getKeyByPath("get", "/users/:id", {
        params: { id: 1 },
      });
      expect(key).toEqual([
        { api: "test", path: "/users/:id" },
        { params: { id: 1 } },
      ]);
    });

    it("should be serialisable", () => {
      const key = apiHooks.getKeyByPath("get", "/users/:id", {
        params: { id: 1 },
      });
      expect(
        JSON.stringify(key, (_k, v) => (v === undefined ? null : v)),
      ).toEqual('[{"api":"test","path":"/users/:id"},{"params":{"id":1}}]');
    });

    it("should throw on invalid endpoint", () => {
      expect(() =>
        // @ts-expect-error -- Invalid endpoint.
        apiHooks.getKeyByPath("get", "/users/:id/bad", {
          params: { id: 1 },
        }),
      ).toThrow("No endpoint found for path 'get /users/:id/bad'");
    });

    it("should get back endpoint invalidation key", () => {
      const key = apiHooks.getKeyByPath("get", "/users/:id");
      expect(key).toEqual([{ api: "test", path: "/users/:id" }]);
    });

    it("should throw on invalid invalidation endpoint", () => {
      expect(() =>
        // @ts-expect-error -- Invalid endpoint.
        apiHooks.getKeyByPath("get", "/users/:id/bad"),
      ).toThrow("No endpoint found for path 'get /users/:id/bad'");
    });

    it("should get back alias key", () => {
      const key = apiHooks.getKeyByAlias("getUser", {
        params: { id: 1 },
      });
      expect(key).toEqual([
        { api: "test", path: "/users/:id" },
        { params: { id: 1 } },
      ]);
    });

    it("should throw on invalid alias", () => {
      expect(() =>
        // @ts-expect-error -- Invalid alias.
        apiHooks.getKeyByAlias("getTest", {
          params: { id: 1 },
        }),
      ).toThrow("No endpoint found for alias 'getTest'");
    });

    it("should get back alias invalidation key", () => {
      const key = apiHooks.getKeyByAlias("getUser");
      expect(key).toEqual([{ api: "test", path: "/users/:id" }]);
    });

    it("should throw on invalid invalidation alias", () => {
      expect(() =>
        // @ts-expect-error -- Invalid alias.
        apiHooks.getKeyByAlias("getTest"),
      ).toThrow("No endpoint found for alias 'getTest'");
    });
  });
  describe("hooks no abort", () => {
    let app: express.Express;
    let server: ReturnType<typeof app.listen>;
    let port: number;

    beforeAll(async () => {
      app = express();
      app.use(express.json());
      app.use(cors());
      const userDB = Array.from({ length: 23 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));
      app.get("/users", (req, res) => {
        const query = req.query;
        const page = Number(get(query, "page") ?? 1);
        const limit = Number(get(query, "limit") ?? 10);
        const start = (page - 1) * limit;
        const end = start + limit;
        const nextPage = end < userDB.length ? page + 1 : undefined;
        const users = userDB.slice(start, end);

        res.json({
          page,
          count: users.length,
          nextPage,
          users,
        });
      });
      app.post("/users/search", (req, res) => {
        const { name } = req.body;
        const users = userDB.filter((user) => user.name.includes(name));
        const page = req.body.page ?? 1;
        const limit = req.body.limit ?? 10;
        const start = (page - 1) * limit;
        const end = start + limit;
        const nextPage = end < users.length ? page + 1 : undefined;
        const result = users.slice(start, end);
        res.json({
          page,
          count: result.length,
          nextPage,
          users: result,
        });
      });
      app.get("/error502", (_req, res) => {
        res.status(502).json({ error: { message: "bad gateway" } });
      });
      app.get("/users/:id", (req, res) => {
        res.status(200).json({ id: Number(req.params.id), name: "test" });
      });
      app.get("/users/:id/address/:address", (req, res) => {
        res
          .status(200)
          .json({ id: Number(req.params.id), address: req.params.address });
      });
      app.post("/users", (req, res) => {
        res.status(200).json({ id: 3, name: req.body.name });
      });
      app.put("/users", (req, res) => {
        res.status(200).json({ id: req.body.id, name: req.body.name });
      });
      app.patch("/users", (req, res) => {
        res.status(200).json({ id: req.body.id, name: req.body.name });
      });
      app.delete("/users/:id", (req, res) => {
        res.status(200).json({ id: Number(req.params.id) });
      });
      app.get("/users/:id/error", (req, res) => {
        res.status(200).json({ id: Number(req.params.id), names: "test" });
      });
      app.get("/users/:id/cancel", async (req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res.status(200).json({ id: Number(req.params.id), name: "test" });
      });
      server = app.listen(0);
      port = (server.address() as AddressInfo).port;

      apiClient = new Zodios(`http://localhost:${port}`, api);

      apiHooks = new ZodiosHooks("test", apiClient);
    });

    afterAll(() => {
      server.close();
      queryClient.clear();
    });

    it("should get id", async () => {
      const { result } = renderHook(
        () => apiHooks.useGet("/users/:id", { params: { id: 1 } }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        id: 1,
        name: "test",
      });
      expect(result.current.invalidate).toBeDefined();
    });

    it("should have validation error", async () => {
      const { result } = renderHook(
        () => apiHooks.useGet("/users/:id/error", { params: { id: 1 } }),
        { wrapper },
      );
      await waitFor(() => result.current.isError);
      expect(result.current.error).toBeInstanceOf(ZodiosError);
    });

    it("should get id with alias", async () => {
      const { result } = renderHook(
        () => apiHooks.useGetUser({ params: { id: 1 } }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        id: 1,
        name: "test",
      });
      expect(result.current.invalidate).toBeDefined();
    });

    it("should get id and address", async () => {
      const { result } = renderHook(
        () =>
          apiHooks.useGet("/users/:id/address/:address", {
            params: { id: 1, address: "test" },
          }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        id: 1,
        address: "test",
      });
      expect(result.current.invalidate).toBeDefined();
      expect(result.current.key).toEqual([
        {
          api: "test",
          path: "/users/:id/address/:address",
        },
        {
          params: { id: 1, address: "test" },
        },
      ]);
    });

    it("should create user", async () => {
      const { result } = renderHook(
        () => {
          const [userCreated, setUserCreated] = React.useState<{
            id: number;
            name: string;
          }>();
          const apiMutations = apiHooks.usePost("/users", undefined, {
            onSuccess: (data) => {
              setUserCreated(data);
            },
          });
          return { apiMutations, userCreated };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate({ name: "test" });
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userCreated).toEqual({ id: 3, name: "test" });
    });

    it("should search immutable users", async () => {
      const { result } = renderHook(
        () =>
          apiHooks.useImmutableQuery("/users/search", {
            name: "User 21",
          }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        page: 1,
        count: 1,
        users: [
          {
            id: 21,
            name: "User 21",
          },
        ],
      });
      expect(result.current.invalidate).toBeDefined();
      expect(result.current.key).toEqual([
        { api: "test", path: "/users/search" },
        {},
        { name: "User 21" },
      ]);
    });

    it("should search immutable users by alias", async () => {
      const { result } = renderHook(
        () => apiHooks.useSearchUsers({ name: "User 22" }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        page: 1,
        count: 1,
        users: [
          {
            id: 22,
            name: "User 22",
          },
        ],
      });
      expect(result.current.invalidate).toBeDefined();
      expect(result.current.key).toBeDefined();
    });

    it("should update user", async () => {
      const { result } = renderHook(
        () => {
          const [userUpdated, setUserUpdated] = React.useState<{
            id: number;
            name: string;
          }>();
          const apiMutations = apiHooks.usePut("/users", undefined, {
            onSuccess: (data) => {
              setUserUpdated(data);
            },
          });
          return { apiMutations, userUpdated };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate({ id: 1, name: "test" });
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userUpdated).toEqual({ id: 1, name: "test" });
    });

    it("should patch user", async () => {
      const { result } = renderHook(
        () => {
          const [userPatched, setUserPatched] = React.useState<{
            id: number;
            name: string;
          }>();
          const apiMutations = apiHooks.usePatch("/users", undefined, {
            onSuccess: (data) => {
              setUserPatched(data);
            },
          });
          return { apiMutations, userPatched };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate({ id: 2, name: "test" });
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userPatched).toEqual({ id: 2, name: "test" });
    });

    it("should delete user", async () => {
      const { result } = renderHook(
        () => {
          const [userDeleted, setUserDeleted] = React.useState<{
            id: number;
          }>();
          const apiMutations = apiHooks.useDelete(
            "/users/:id",
            { params: { id: 3 } },
            {
              onSuccess: (data) => {
                setUserDeleted(data);
              },
            },
          );
          return { apiMutations, userDeleted };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate(undefined);
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userDeleted).toEqual({ id: 3 });
    });

    it("should delete user with alias", async () => {
      const { result } = renderHook(
        () => {
          const [userDeleted, setUserDeleted] = React.useState<{
            id: number;
          }>();
          const apiMutations = apiHooks.useDeleteUser(
            { params: { id: 3 } },
            {
              onSuccess: (data) => {
                setUserDeleted(data);
              },
            },
          );
          return { apiMutations, userDeleted };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate(undefined);
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userDeleted).toEqual({ id: 3 });
    });

    it("should cancel request with signal", async () => {
      const { result } = renderHook(
        () => {
          const controller = new AbortController();
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            signal: controller.signal,
            timeout: 1000,
          });
          return { apiCancel, controller };
        },
        { wrapper },
      );
      result.current.controller.abort();
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual("canceled");
    });

    it("should cancel request early with signal", async () => {
      const { result } = renderHook(
        () => {
          const controller = new AbortController();
          controller.abort();
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            signal: controller.signal,
          });
          return { apiCancel };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual("canceled");
    });

    it("should cancel request with timeout and signal", async () => {
      const { result } = renderHook(
        () => {
          const controller = new AbortController();
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            signal: controller.signal,
            timeout: 1,
          });
          return { apiCancel };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual(
        "timeout of 1ms exceeded",
      );
    });

    it("should cancel request with timeout", async () => {
      const { result } = renderHook(
        () => {
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            timeout: 1,
          });
          return { apiCancel };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual(
        "timeout of 1ms exceeded",
      );
    });

    it("should infinite load users", async () => {
      const { result } = renderHook(
        () => {
          const apiInfinite = apiHooks.useInfiniteQuery(
            "/users",
            {
              queries: { limit: 10 },
            },
            {
              getPageParamList: () => ["page"],
              initialPageParam: { queries: { page: 1 } },
              getNextPageParam: (lastPage, _pages) => {
                return lastPage.nextPage
                  ? {
                      queries: {
                        page: lastPage.nextPage,
                      },
                    }
                  : undefined;
              },
            },
          );
          return { apiInfinite };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiInfinite.isSuccess);
      expect(result.current.apiInfinite.data?.pages).toEqual([
        {
          users: [
            {
              id: 1,
              name: "User 1",
            },
            {
              id: 2,
              name: "User 2",
            },
            {
              id: 3,
              name: "User 3",
            },
            {
              id: 4,
              name: "User 4",
            },
            {
              id: 5,
              name: "User 5",
            },
            {
              id: 6,
              name: "User 6",
            },
            {
              id: 7,
              name: "User 7",
            },
            {
              id: 8,
              name: "User 8",
            },
            {
              id: 9,
              name: "User 9",
            },
            {
              id: 10,
              name: "User 10",
            },
          ],
          page: 1,
          count: 10,
          nextPage: 2,
        },
      ]);

      let i = 1;
      do {
        result.current.apiInfinite.fetchNextPage();
        await waitFor(() => result.current.apiInfinite.isFetching);
        await waitFor(() => !result.current.apiInfinite.isFetching);
        expect(result.current.apiInfinite.data?.pages.length).toEqual(++i);
      } while (result.current.apiInfinite.hasNextPage);
      expect(i).toEqual(3);
    });

    it("should infinite search users", async () => {
      const { result } = renderHook(
        () => {
          const apiInfinite = apiHooks.useImmutableInfiniteQuery(
            "/users/search",
            {
              name: "User",
              limit: 10,
            },
            undefined,
            {
              getPageParamList: () => ["page"],
              initialPageParam: { body: { page: 1 } },
              getNextPageParam: (lastPage, _pages) => {
                return lastPage.nextPage
                  ? {
                      body: {
                        page: lastPage.nextPage,
                      },
                    }
                  : undefined;
              },
            },
          );
          return { apiInfinite };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiInfinite.isSuccess);
      expect(result.current.apiInfinite.data?.pages).toEqual([
        {
          users: [
            {
              id: 1,
              name: "User 1",
            },
            {
              id: 2,
              name: "User 2",
            },
            {
              id: 3,
              name: "User 3",
            },
            {
              id: 4,
              name: "User 4",
            },
            {
              id: 5,
              name: "User 5",
            },
            {
              id: 6,
              name: "User 6",
            },
            {
              id: 7,
              name: "User 7",
            },
            {
              id: 8,
              name: "User 8",
            },
            {
              id: 9,
              name: "User 9",
            },
            {
              id: 10,
              name: "User 10",
            },
          ],
          page: 1,
          count: 10,

          nextPage: 2,
        },
      ]);

      let i = 1;
      do {
        result.current.apiInfinite.fetchNextPage();
        await waitFor(() => result.current.apiInfinite.isFetching);
        await waitFor(() => !result.current.apiInfinite.isFetching);
        expect(result.current.apiInfinite.data?.pages.length).toEqual(++i);
        if (i < 3) {
          expect(result.current.apiInfinite.data?.pages[i - 1]).toEqual({
            users: Array.from({ length: 10 }, (_, ii) => ({
              id: (i - 1) * 10 + ii + 1,
              name: `User ${(i - 1) * 10 + ii + 1}`,
            })),
            page: i,
            count: 10,

            nextPage: i + 1,
          });
        }
      } while (result.current.apiInfinite.hasNextPage);
      expect(i).toEqual(3);
    });
  });
  describe("hooks with abort", () => {
    let app: express.Express;
    let server: ReturnType<typeof app.listen>;
    let port: number;

    beforeAll(async () => {
      app = express();
      app.use(express.json());
      app.use(cors());
      const userDB = Array.from({ length: 23 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));
      app.get("/users", (req, res) => {
        const query = req.query;
        const page = Number(get(query, "page") ?? 1);
        const limit = Number(get(query, "limit") ?? 10);
        const start = (page - 1) * limit;
        const end = start + limit;
        const nextPage = end < userDB.length ? page + 1 : undefined;
        const users = userDB.slice(start, end);

        res.json({
          page,
          count: users.length,
          nextPage,
          users,
        });
      });
      app.post("/users/search", (req, res) => {
        const { name } = req.body;
        const users = userDB.filter((user) => user.name.includes(name));
        const page = req.body.page ?? 1;
        const limit = req.body.limit ?? 10;
        const start = (page - 1) * limit;
        const end = start + limit;
        const nextPage = end < users.length ? page + 1 : undefined;
        const result = users.slice(start, end);
        res.json({
          page,
          count: result.length,
          nextPage,
          users: result,
        });
      });
      app.get("/error502", (_req, res) => {
        res.status(502).json({ error: { message: "bad gateway" } });
      });
      app.get("/users/:id", (req, res) => {
        res.status(200).json({ id: Number(req.params.id), name: "test" });
      });
      app.get("/users/:id/address/:address", (req, res) => {
        res
          .status(200)
          .json({ id: Number(req.params.id), address: req.params.address });
      });
      app.post("/users", (req, res) => {
        res.status(200).json({ id: 3, name: req.body.name });
      });
      app.put("/users", (req, res) => {
        res.status(200).json({ id: req.body.id, name: req.body.name });
      });
      app.patch("/users", (req, res) => {
        res.status(200).json({ id: req.body.id, name: req.body.name });
      });
      app.delete("/users/:id", (req, res) => {
        res.status(200).json({ id: Number(req.params.id) });
      });
      app.get("/users/:id/error", (req, res) => {
        res.status(200).json({ id: Number(req.params.id), names: "test" });
      });
      app.get("/users/:id/cancel", async (req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        res.status(200).json({ id: Number(req.params.id), name: "test" });
      });
      server = app.listen(0);
      port = (server.address() as AddressInfo).port;

      apiClient = new Zodios(`http://localhost:${port}`, api);

      apiHooks = new ZodiosHooks("test", apiClient, {
        shouldAbortOnUnmount: true,
      });
    });

    afterAll(() => {
      server.close();
    });

    it("should get id", async () => {
      const { result } = renderHook(
        () => apiHooks.useGet("/users/:id", { params: { id: 1 } }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        id: 1,
        name: "test",
      });
      expect(result.current.invalidate).toBeDefined();
    });

    it("should have validation error", async () => {
      const { result } = renderHook(
        () => apiHooks.useGet("/users/:id/error", { params: { id: 1 } }),
        { wrapper },
      );
      await waitFor(() => result.current.isError);
      expect(result.current.error).toBeInstanceOf(ZodiosError);
    });

    it("should get id with alias", async () => {
      const { result } = renderHook(
        () => apiHooks.useGetUser({ params: { id: 1 } }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        id: 1,
        name: "test",
      });
      expect(result.current.invalidate).toBeDefined();
    });

    it("should get id and address", async () => {
      const { result } = renderHook(
        () =>
          apiHooks.useGet("/users/:id/address/:address", {
            params: { id: 1, address: "test" },
          }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        id: 1,
        address: "test",
      });
    });

    it("should create user", async () => {
      const { result } = renderHook(
        () => {
          const [userCreated, setUserCreated] = React.useState<{
            id: number;
            name: string;
          }>();
          const apiMutations = apiHooks.usePost("/users", undefined, {
            onSuccess: (data) => {
              setUserCreated(data);
            },
          });
          return { apiMutations, userCreated };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate({ name: "test" });
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userCreated).toEqual({ id: 3, name: "test" });
    });

    it("should search immutable users", async () => {
      const { result } = renderHook(
        () =>
          apiHooks.useImmutableQuery("/users/search", {
            name: "User 21",
          }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        page: 1,
        count: 1,
        users: [
          {
            id: 21,
            name: "User 21",
          },
        ],
      });
      expect(result.current.invalidate).toBeDefined();
      expect(result.current.key).toBeDefined();
    });

    it("should search immutable users by alias", async () => {
      const { result } = renderHook(
        () => apiHooks.useSearchUsers({ name: "User 22" }),
        { wrapper },
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toEqual({
        page: 1,
        count: 1,
        users: [
          {
            id: 22,
            name: "User 22",
          },
        ],
      });
      expect(result.current.invalidate).toBeDefined();
      expect(result.current.key).toBeDefined();
    });

    it("should update user", async () => {
      const { result } = renderHook(
        () => {
          const [userUpdated, setUserUpdated] = React.useState<{
            id: number;
            name: string;
          }>();
          const apiMutations = apiHooks.usePut("/users", undefined, {
            onSuccess: (data) => {
              setUserUpdated(data);
            },
          });
          return { apiMutations, userUpdated };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate({ id: 1, name: "test" });
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userUpdated).toEqual({ id: 1, name: "test" });
    });

    it("should patch user", async () => {
      const { result } = renderHook(
        () => {
          const [userPatched, setUserPatched] = React.useState<{
            id: number;
            name: string;
          }>();
          const apiMutations = apiHooks.usePatch("/users", undefined, {
            onSuccess: (data) => {
              setUserPatched(data);
            },
          });
          return { apiMutations, userPatched };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate({ id: 2, name: "test" });
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userPatched).toEqual({ id: 2, name: "test" });
    });

    it("should delete user", async () => {
      const { result } = renderHook(
        () => {
          const [userDeleted, setUserDeleted] = React.useState<{
            id: number;
          }>();
          const apiMutations = apiHooks.useDelete(
            "/users/:id",
            { params: { id: 3 } },
            {
              onSuccess: (data) => {
                setUserDeleted(data);
              },
            },
          );
          return { apiMutations, userDeleted };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate(undefined);
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userDeleted).toEqual({ id: 3 });
    });

    it("should delete user with alias", async () => {
      const { result } = renderHook(
        () => {
          const [userDeleted, setUserDeleted] = React.useState<{
            id: number;
          }>();
          const apiMutations = apiHooks.useDeleteUser(
            { params: { id: 3 } },
            {
              onSuccess: (data) => {
                setUserDeleted(data);
              },
            },
          );
          return { apiMutations, userDeleted };
        },
        { wrapper },
      );
      result.current.apiMutations.mutate(undefined);
      await waitFor(() => result.current.apiMutations.isSuccess);
      expect(result.current.userDeleted).toEqual({ id: 3 });
    });

    it("should cancel request with signal", async () => {
      const { result } = renderHook(
        () => {
          const controller = new AbortController();
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            signal: controller.signal,
            timeout: 1000,
          });
          return { apiCancel, controller };
        },
        { wrapper },
      );
      result.current.controller.abort();
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual("canceled");
    });

    it("should cancel request early with signal", async () => {
      const { result } = renderHook(
        () => {
          const controller = new AbortController();
          controller.abort();
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            signal: controller.signal,
          });
          return { apiCancel };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual("canceled");
    });

    it("should cancel request with timeout and signal", async () => {
      const { result } = renderHook(
        () => {
          const controller = new AbortController();
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            signal: controller.signal,
            timeout: 1,
          });
          return { apiCancel };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual(
        "timeout of 1ms exceeded",
      );
    });

    it("should cancel request with timeout", async () => {
      const { result } = renderHook(
        () => {
          const apiCancel = apiHooks.useGet("/users/:id/cancel", {
            params: { id: 1 },
            timeout: 1,
          });
          return { apiCancel };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiCancel.isError);
      expect(result.current.apiCancel.error!.message).toEqual(
        "timeout of 1ms exceeded",
      );
    });

    it("should infinite load users", async () => {
      const { result } = renderHook(
        () => {
          const apiInfinite = apiHooks.useInfiniteQuery(
            "/users",
            {
              queries: { limit: 10 },
            },
            {
              getPageParamList: () => ["page"],
              initialPageParam: { queries: { page: 1 } },
              getNextPageParam: (lastPage, _pages) => {
                return lastPage.nextPage
                  ? {
                      queries: {
                        page: lastPage.nextPage,
                      },
                    }
                  : undefined;
              },
            },
          );
          return { apiInfinite };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiInfinite.isSuccess);
      expect(result.current.apiInfinite.data?.pages).toEqual([
        {
          users: [
            {
              id: 1,
              name: "User 1",
            },
            {
              id: 2,
              name: "User 2",
            },
            {
              id: 3,
              name: "User 3",
            },
            {
              id: 4,
              name: "User 4",
            },
            {
              id: 5,
              name: "User 5",
            },
            {
              id: 6,
              name: "User 6",
            },
            {
              id: 7,
              name: "User 7",
            },
            {
              id: 8,
              name: "User 8",
            },
            {
              id: 9,
              name: "User 9",
            },
            {
              id: 10,
              name: "User 10",
            },
          ],
          page: 1,
          count: 10,
          nextPage: 2,
        },
      ]);

      let i = 1;
      do {
        result.current.apiInfinite.fetchNextPage();
        await waitFor(() => result.current.apiInfinite.isFetching);
        await waitFor(() => !result.current.apiInfinite.isFetching);
        expect(result.current.apiInfinite.data?.pages.length).toEqual(++i);
      } while (result.current.apiInfinite.hasNextPage);
      expect(i).toEqual(3);
    });

    it("should infinite search users", async () => {
      const { result } = renderHook(
        () => {
          const apiInfinite = apiHooks.useImmutableInfiniteQuery(
            "/users/search",
            {
              name: "User",
              limit: 10,
            },
            undefined,
            {
              getPageParamList: () => ["page"],
              initialPageParam: { body: { page: 1 } },
              getNextPageParam: (lastPage, _pages) => {
                return lastPage.nextPage
                  ? {
                      body: {
                        page: lastPage.nextPage,
                      },
                    }
                  : undefined;
              },
            },
          );
          return { apiInfinite };
        },
        { wrapper },
      );
      await waitFor(() => result.current.apiInfinite.isSuccess);
      expect(result.current.apiInfinite.data?.pages).toEqual([
        {
          users: [
            {
              id: 1,
              name: "User 1",
            },
            {
              id: 2,
              name: "User 2",
            },
            {
              id: 3,
              name: "User 3",
            },
            {
              id: 4,
              name: "User 4",
            },
            {
              id: 5,
              name: "User 5",
            },
            {
              id: 6,
              name: "User 6",
            },
            {
              id: 7,
              name: "User 7",
            },
            {
              id: 8,
              name: "User 8",
            },
            {
              id: 9,
              name: "User 9",
            },
            {
              id: 10,
              name: "User 10",
            },
          ],
          page: 1,
          count: 10,

          nextPage: 2,
        },
      ]);

      let i = 1;
      do {
        result.current.apiInfinite.fetchNextPage();
        await waitFor(() => result.current.apiInfinite.isFetching);
        await waitFor(() => !result.current.apiInfinite.isFetching);
        expect(result.current.apiInfinite.data?.pages.length).toEqual(++i);
        if (i < 3) {
          expect(result.current.apiInfinite.data?.pages[i - 1]).toEqual({
            users: Array.from({ length: 10 }, (_, ii) => ({
              id: (i - 1) * 10 + ii + 1,
              name: `User ${(i - 1) * 10 + ii + 1}`,
            })),
            page: i,
            count: 10,

            nextPage: i + 1,
          });
        }
      } while (result.current.apiInfinite.hasNextPage);
      expect(i).toEqual(3);
    });
  });
});
