import { NextRequest } from "next/server";
import { handleAdminCrudList, handleAdminCrudUpload } from "@/lib/adminCrudRoute";

export function GET(req: NextRequest) {
  return handleAdminCrudList(req, "media");
}

export function POST(req: NextRequest) {
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    return handleAdminCrudUpload(req, "media");
  }
  return handleAdminCrudList(req, "media");
}
