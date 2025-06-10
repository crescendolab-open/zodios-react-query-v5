import type { SxProps } from "@mui/joy/styles/types";
import { ZodiosHooks } from "@crescendolab/zodios-react-query-v5";
import { Box, Button, Card, List, ListItem, Typography } from "@mui/joy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sxUtils } from "@utils/sx";
import { makeApi, Zodios } from "@zodios/core";
import { isNil, uniqBy } from "es-toolkit";
import { z } from "zod";

import { apiUrl } from "./constants";

import { Layout } from "./layout";
import { userSchema, usersResponseSchema } from "./models";

const styles = {
  box: {
    ...sxUtils.flexFill,
    alignItems: "center",
  },
  card: (theme) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  }),
} satisfies Record<PropertyKey, SxProps>;

const createUserSchema = z
  .object({
    name: z.string(),
  })
  .required();

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
    response: usersResponseSchema,
  },
  {
    method: "get",
    path: "/users/:id",
    description: "Get a user",
    alias: "getUser",
    response: userSchema,
  },
  {
    method: "post",
    path: "/users",
    alias: "createUser",
    description: "Create a user",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createUserSchema,
      },
    ],
    response: userSchema,
  },
]);
const baseUrl = apiUrl;

const zodios = new Zodios(baseUrl, api);
const zodiosHooks = new ZodiosHooks("jsonplaceholder", zodios);

const Users = () => {
  const usersInfiniteQuery = zodiosHooks.useInfiniteQuery(
    "/users",
    { queries: { limit: 10 } },
    {
      initialPageParam: { queries: { page: 1 } },
      getPageParamList: () => {
        return ["page"];
      },
      getNextPageParam: (currentPage) => {
        if (isNil(currentPage.nextPage)) {
          return undefined; // no more pages
        }
        return {
          queries: {
            page: currentPage.nextPage,
          },
        };
      },
    },
  );
  const createUserMutation = zodiosHooks.useCreateUser(undefined, {
    onSuccess: () => usersInfiniteQuery.invalidate(),
  });

  const nextPage =
    usersInfiniteQuery.data?.pages[usersInfiniteQuery.data.pages.length - 1]
      ?.nextPage;

  return (
    <Layout>
      <Box sx={styles.box}>
        <Card sx={styles.card}>
          <Typography level="h1">Users</Typography>
          <Button
            onClick={() => createUserMutation.mutate({ name: "john doe" })}
            disabled={createUserMutation.isPending}
          >
            add user
          </Button>
          {usersInfiniteQuery.isLoading && <div>Loading...</div>}
          {usersInfiniteQuery.error && (
            <div>Error: {usersInfiniteQuery.error.message}</div>
          )}
          {usersInfiniteQuery.data && (
            <>
              <List marker="disc">
                {uniqBy(
                  usersInfiniteQuery.data.pages.flatMap((page) => page.users),
                  (user) => user.id,
                ).map((user) => (
                  <ListItem key={user.id}>
                    {user.id}: {user.name}
                  </ListItem>
                ))}
              </List>
              <Button
                disabled={
                  !usersInfiniteQuery.hasNextPage ||
                  usersInfiniteQuery.isFetching
                }
                onClick={async () => {
                  usersInfiniteQuery.fetchNextPage();
                }}
              >
                {!usersInfiniteQuery.hasNextPage ? "no more pages" : "more"}
                {isNil(nextPage) ? "" : ` (next: ${nextPage})`}
              </Button>
            </>
          )}
        </Card>
      </Box>
    </Layout>
  );
};

// on another file
const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>
  );
};
