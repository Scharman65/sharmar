import { NextRequest } from "next/server";
import { handleAdminCrudItem, routeParams } from "@/lib/adminCrudRoute";

export async function GET(req: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudItem(req, "owner", params.documentId, "update");
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudItem(req, "owner", params.documentId, "update");
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudItem(req, "owner", params.documentId, "delete");
}
