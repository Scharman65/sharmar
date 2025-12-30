import json
import os
import sys
from pathlib import Path
from getpass import getpass
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = os.environ.get("STRAPI_ADMIN_URL", "http://127.0.0.1:1337").rstrip("/")
ENV_PATH = Path("frontend/.env.local")

def http_json(method: str, url: str, body: dict | None = None, headers: dict | None = None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = Request(url, data=data, headers=h, method=method)
    with urlopen(req, timeout=30) as r:
        return r.status, json.loads(r.read().decode("utf-8"))

def try_login(email: str, password: str):
    urls = [
        f"{BASE}/admin/login",
        f"{BASE}/admin/auth/local",
    ]
    last_err = None
    for u in urls:
        try:
            code, j = http_json("POST", u, {"email": email, "password": password})
            token = None
            if isinstance(j, dict):
                token = j.get("data", {}).get("token") if isinstance(j.get("data"), dict) else None
                token = token or j.get("token") or (j.get("data", {}).get("jwt") if isinstance(j.get("data"), dict) else None)
                token = token or j.get("jwt")
            if code in (200, 201) and token:
                return token
        except HTTPError as e:
            last_err = e
            continue
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Login failed. Last error: {last_err}")

def create_api_token(admin_jwt: str):
    urls = [
        f"{BASE}/admin/api-tokens",
        f"{BASE}/admin/api-tokens/",
    ]
    payload = {
        "name": "frontend-dev",
        "description": "auto-generated for Next.js dev",
        "type": "read-only",
    }
    last_err = None
    for u in urls:
        try:
            code, j = http_json("POST", u, payload, {"Authorization": f"Bearer {admin_jwt}"})
            token = None
            if isinstance(j, dict):
                token = j.get("data", {}).get("accessKey") if isinstance(j.get("data"), dict) else None
                token = token or j.get("accessKey")
            if code in (200, 201) and token:
                return token
        except HTTPError as e:
            last_err = e
            continue
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Create API token failed. Last error: {last_err}")

def upsert_env(key: str, value: str):
    s = ENV_PATH.read_text("utf-8") if ENV_PATH.exists() else ""
    lines = s.splitlines(True)
    out = []
    found = False
    for line in lines:
        if line.startswith(key + "="):
            out.append(f"{key}={value}\n")
            found = True
        else:
            out.append(line)
    if not found:
        if s and not s.endswith("\n"):
            out.append("\n")
        out.append(f"{key}={value}\n")
    ENV_PATH.write_text("".join(out), "utf-8")

def main():
    if not Path("frontend").exists():
        print("Run from project root (~/Projects/sharmar).", file=sys.stderr)
        sys.exit(1)

    email = os.environ.get("STRAPI_ADMIN_EMAIL") or input("Admin email: ").strip()
    password = os.environ.get("STRAPI_ADMIN_PASS") or getpass("Admin password: ")

    admin_jwt = try_login(email, password)
    api_token = create_api_token(admin_jwt)

    upsert_env("STRAPI_URL", "http://127.0.0.1:1337")
    upsert_env("STRAPI_TOKEN", api_token)

    print("OK: STRAPI_TOKEN written to frontend/.env.local")
    print("STRAPI_TOKEN_len=", len(api_token))

if __name__ == "__main__":
    main()
