import type {
  AnyZodiosRequestOptions,
  ZodiosEndpointDefinition,
  ZodiosEndpointDefinitions,
  ZodiosPlugin,
} from "@zodios/core";
import type { ZodError, ZodTypeAny } from "zod";
import { zodValidationPlugin } from "@zodios/core";

import { toProxy } from "./to-proxy.js";

export interface ResilientPluginOptions {
  onError: (
    error: ZodError,
    context: {
      method: string;
      path: string;
      data: unknown;
    },
  ) => void;
}

function findEndpoint(
  api: ZodiosEndpointDefinitions,
  config: AnyZodiosRequestOptions,
): ZodiosEndpointDefinition | undefined {
  return api.find(
    (e: ZodiosEndpointDefinition) =>
      e.method === config.method && e.path === config.url,
  );
}

function isJsonContentType(
  headers: Record<string, string> | undefined,
): boolean {
  const ct = headers?.["content-type"];
  if (!ct) return false;
  return (
    ct.includes("application/json") || ct.includes("application/vnd.api+json")
  );
}

export function resilientPlugin(options: ResilientPluginOptions): ZodiosPlugin {
  const { onError } = options;

  const original = zodValidationPlugin({
    validate: true,
    transform: true,
    sendDefaults: false,
  });

  return {
    name: "zod-validation",

    ...(original.request ? { request: original.request } : {}),

    response: async (api, config, response) => {
      const endpoint = findEndpoint(
        api as ZodiosEndpointDefinitions,
        config as AnyZodiosRequestOptions,
      );
      if (!endpoint) return response;

      if (
        !isJsonContentType(
          response.headers as Record<string, string> | undefined,
        )
      ) {
        return response;
      }

      const result = await endpoint.response.safeParseAsync(response.data);

      if (result.success) {
        response.data = result.data;
        return response;
      }

      onError(result.error, {
        method: endpoint.method,
        path: endpoint.path,
        data: response.data,
      });

      if (response.data != null && typeof response.data === "object") {
        response.data = toProxy(endpoint.response as ZodTypeAny, response.data);
      }

      return response;
    },
  };
}
