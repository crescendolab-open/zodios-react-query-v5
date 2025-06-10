import type { z } from "zod";
import type { userSchema, usersResponseSchema } from "./models";
import { faker } from "@faker-js/faker";
import { isNil } from "es-toolkit";

import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import urlJoin from "url-join";
import { apiUrl } from "./constants";
import { positiveIntegerSchema } from "./models";

const initialUserCount = 3;

const users: Array<z.infer<typeof userSchema>> = [];

function addUser() {
  const id = users.length + 1;
  const name = faker.person.fullName();
  users.push({ id, name });
  return { id, name };
}

Array.from({ length: initialUserCount }).forEach(() => addUser());

const worker = setupWorker(
  http.post(urlJoin(apiUrl, "/users"), () => {
    addUser();
    return HttpResponse.text();
  }),
  http.get(urlJoin(apiUrl, "/users"), ({ request }) => {
    const url = new URL(request.url);
    const page = (() => {
      const pageParam = url.searchParams.get("page");
      const parsed = positiveIntegerSchema.safeParse(Number(pageParam));
      if (parsed.success) {
        return parsed.data;
      }
      return 1;
    })();
    const limit = (() => {
      const limitParam = url.searchParams.get("limit");
      const parsed = positiveIntegerSchema.safeParse(Number(limitParam));
      if (parsed.success) {
        return parsed.data;
      }
      return 10;
    })();
    const userCount = users.length;
    const maxPage = Math.max(1, Math.ceil(userCount / limit));
    const nextPage = page >= maxPage ? null : page + 1;
    const length = Math.min(limit, userCount - (page - 1) * limit);

    return HttpResponse.json(
      {
        ...(isNil(nextPage) ? {} : { nextPage }),
        users: users.slice((page - 1) * limit, (page - 1) * limit + length),
      } satisfies z.infer<typeof usersResponseSchema>,
      {
        status: 202,
        statusText: "Mocked status",
      },
    );
  }),
);

worker.start();

async function setupMsw() {
  await worker.start();
}

export { setupMsw };
