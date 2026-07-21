import { NextRequest } from "next/server";
import { handleAdminCrudList, handleAdminCrudUpload } from "@/lib/adminCrudRoute";

export function GET(req: NextRequest) {
  return handleAdminCrudList(req, "document");
}

export function POST(req: NextRequest) {
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    return handleAdminCrudUpload(req, "document");
  }
  return handleAdminCrudList(req, "document");
}
