import { NextRequest } from "next/server";
import { handleAdminCrudItem, routeParams } from "@/lib/adminCrudRoute";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudItem(req, "media", params.id, "update");
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudItem(req, "media", params.id, "update");
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await routeParams(context.params);
  return handleAdminCrudItem(req, "media", params.id, "delete");
}
