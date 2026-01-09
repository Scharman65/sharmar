import type { NextRequest } from "next/server";
import { proxy, config as proxyConfig } from "./proxy";

export function middleware(req: NextRequest) {
  return proxy(req);
}

// re-export matcher config from proxy.ts
export const config = proxyConfig;
