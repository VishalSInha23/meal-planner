import { AsyncLocalStorage } from "node:async_hooks";
import { getLogger, type Log } from "./logger.ts";

export interface RequestContext {
  requestId: string;
  userId?: string;
  log: Log;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(requestId: string, baseLog: Log = getLogger()): RequestContext {
  return { requestId, log: baseLog.child({ requestId }) };
}

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

// The request's logger, or the app logger outside a request.
export function currentLog(): Log {
  return storage.getStore()?.log ?? getLogger();
}

// Called by auth once the user is known: later lines of the request carry userId.
export function setLogUser(userId: string): void {
  const context = storage.getStore();
  if (!context) return;
  context.userId = userId;
  context.log = context.log.child({ userId });
}
