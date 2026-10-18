import type { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/http/errors";
import { getLogger, redact, roundMs, shorten, type Log } from "@/lib/log/logger";
import { createRequestContext, currentLog, runWithRequestContext } from "@/lib/log/request-context";
import { resolveRequestId } from "@/lib/log/request-id";

export type RouteHandler<P> = (request: NextRequest, context: { params: Promise<P> }) => Response | Promise<Response>;

export interface RouteOptions {
  // The route pattern for the log, for example "/api/dishes/[id]". Defaults to the request path.
  route?: string;
  logger?: Log;
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isJson(headers: Headers): boolean {
  return headers.get("content-type")?.includes("application/json") ?? false;
}

async function readJsonBody(message: Request | Response): Promise<unknown> {
  if (!isJson(message.headers)) return undefined;
  try {
    return await message.clone().json();
  } catch {
    return undefined;
  }
}

async function responseBytes(response: Response): Promise<number> {
  const length = Number(response.headers.get("content-length"));
  if (length) return length;
  if (!response.body || !isJson(response.headers)) return 0;
  return (await response.clone().arrayBuffer()).byteLength;
}

export function route<P = Record<string, string>>(handler: RouteHandler<P>, options: RouteOptions = {}) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    const requestContext = createRequestContext(requestId, options.logger ?? getLogger());

    return runWithRequestContext(requestContext, async () => {
      const started = performance.now();
      const log = currentLog();
      const path = new URL(request.url).pathname;

      log.info(
        {
          method: request.method,
          path,
          route: options.route ?? path,
          ip: clientIp(request),
          bytes: Number(request.headers.get("content-length")) || 0,
        },
        "incoming request",
      );
      if (log.isLevelEnabled("debug")) {
        const body = await readJsonBody(request);
        if (body !== undefined) log.debug({ body: shorten(redact(body)) }, "request body");
      }

      let response: Response;
      let errorCode: string | undefined;
      try {
        response = await handler(request, context);
      } catch (error) {
        const { status, body } = toErrorResponse(error);
        if (status === 500) currentLog().error({ err: error }, "unexpected error");
        if (status < 500) errorCode = body.error.code;
        response = Response.json(body, { status });
      }
      try {
        response.headers.set("x-request-id", requestId);
      } catch {
        response = new Response(response.body, response);
        response.headers.set("x-request-id", requestId);
      }

      const done = currentLog();
      if (done.isLevelEnabled("debug")) {
        const body = await readJsonBody(response);
        if (body !== undefined) done.debug({ body: shorten(redact(body)) }, "response body");
      }
      const completedLog: Record<string, unknown> = {
        status: response.status,
        bytes: await responseBytes(response),
        durationMs: roundMs(performance.now() - started),
      };
      if (errorCode) completedLog.errorCode = errorCode;
      done.info(completedLog, "request completed");
      return response;
    });
  };
}
