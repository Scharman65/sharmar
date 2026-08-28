type LoginBody = Record<string, unknown>;

export type OwnerLoginCredentials =
  | {
      ok: true;
      identifier: string;
      password: string;
    }
  | {
      ok: false;
      identifier: string;
      code: "invalid_credentials";
      status: 400;
    };

function normalizeLoginIdentifier(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function readOwnerLoginIdentifier(body: LoginBody): string {
  const identifier = normalizeLoginIdentifier(body.identifier);
  return identifier || normalizeLoginIdentifier(body.email);
}

export function parseOwnerLoginCredentials(body: LoginBody): OwnerLoginCredentials {
  const identifier = readOwnerLoginIdentifier(body);
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return {
      ok: false,
      identifier,
      code: "invalid_credentials",
      status: 400,
    };
  }

  return { ok: true, identifier, password };
}
