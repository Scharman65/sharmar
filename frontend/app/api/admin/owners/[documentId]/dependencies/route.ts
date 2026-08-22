import { NextRequest } from "next/server";
import { handleAdminCrudDependencies, routeParams } from "@/lib/adminCrudRoute";

export async function GET(req: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudDependencies(req, "owner", params.documentId);
}
