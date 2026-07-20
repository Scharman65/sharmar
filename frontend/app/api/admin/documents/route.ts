import { NextRequest } from "next/server";
import { handleAdminCrudList } from "@/lib/adminCrudRoute";

export function GET(req: NextRequest) {
  return handleAdminCrudList(req, "document");
}

export function POST(req: NextRequest) {
  return handleAdminCrudList(req, "document");
}
