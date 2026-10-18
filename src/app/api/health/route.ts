import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { route } from "@/lib/http/route";
import { currentLog } from "@/lib/log/request-context";

export const GET = route(
  async () => {
    try {
      await getDb().execute(sql`select 1`);
    } catch (error) {
      currentLog().error({ err: error }, "health check: db error");
      return Response.json({ status: "error", db: "error" }, { status: 503 });
    }
    return Response.json({ status: "ok", db: "ok" });
  },
  { route: "/api/health" },
);
