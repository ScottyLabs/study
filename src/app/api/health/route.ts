import { env } from "~/env";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
