import { NextRequest, NextResponse } from "next/server";
import { clearOwnerSessionCookie, setOwnerSessionCookie } from "./cookies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const response = NextResponse.json(
      { ok: true },
      { status: 200 }
    );

    setOwnerSessionCookie(response, token);

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { ok: true },
    { status: 200 }
  );

  clearOwnerSessionCookie(response);

  return response;
}
