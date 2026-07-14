import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  clearOwnerSessionCookie,
  setOwnerSessionCookie,
} from "./cookies";

import {
  asNumber,
  getServerToken,
  isRecord,
  jsonError,
  strapiFetchJson,
} from "@/lib/auth/ownerApi";

export async function POST(
  req: NextRequest
) {
  let body: Record<string, unknown>;

  try {
    const parsed = await req.json();

    body =
      typeof parsed === "object" &&
      parsed !== null
        ? parsed as Record<string, unknown>
        : {};
  } catch {
    return jsonError(
      "invalid_request",
      400
    );
  }

  const token =
    typeof body.token === "string"
      ? body.token.trim()
      : "";

  if (!token) {
    return jsonError(
      "missing_owner_token",
      400
    );
  }

  const me = await strapiFetchJson(
    "/api/users/me",
    { method: "GET" },
    token
  );

  if (!me.ok || !isRecord(me.json)) {
    return jsonError(
      "owner_session_invalid",
      401
    );
  }

  const userId = asNumber(me.json.id);

  if (!userId) {
    return jsonError(
      "owner_session_invalid",
      401
    );
  }

  const serverToken = getServerToken();

  if (!serverToken) {
    return jsonError(
      "owner_profile_unavailable",
      503
    );
  }

  const profileResponse =
    await strapiFetchJson(
      `/api/owner/profile-by-user?user_id=${userId}`,
      { method: "GET" },
      serverToken
    );

  const profile =
    isRecord(profileResponse.json) &&
    isRecord(profileResponse.json.profile)
      ? profileResponse.json.profile
      : null;

  if (!profileResponse.ok || !profile) {
    return jsonError(
      "owner_profile_unavailable",
      503
    );
  }

  const sessionVersion =
    asNumber(profile.session_version) ?? 0;

  /*
   * Token-only exchange cannot safely distinguish
   * an old JWT from a newly issued JWT when both
   * share the same second-level iat.
   *
   * After the account version has advanced,
   * the owner must sign in through owner-login.
   */
  if (sessionVersion > 0) {
    return jsonError(
      "owner_session_exchange_disabled",
      409
    );
  }

  const response = NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );

  setOwnerSessionCookie(
    response,
    token,
    sessionVersion
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );

  clearOwnerSessionCookie(response);

  return response;
}
