import { route } from "@/lib/http/route";

export const GET = route(() => Response.json({ status: "ok" }), { route: "/api/health" });
