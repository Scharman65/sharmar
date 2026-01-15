import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString("utf8").trim();
}

const sha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  (process.env.GITHUB_SHA ?? "") ||
  (() => {
    try { return sh("git rev-parse HEAD"); } catch { return "unknown"; }
  })();

const short = sha === "unknown" ? "unknown" : sha.slice(0, 7);
const utc = new Date().toISOString();

const bodyRoot = [
  "sharmar-frontend",
  "env=root",
  `commit=${sha}`,
  `short=${short}`,
  `utc=${utc}`,
].join("\n") + "\n";

const langs = ["en", "ru", "me"];

function write(p, content) {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content, "utf8");
}

write(join("public", "version.txt"), bodyRoot);

for (const lang of langs) {
  const body = [
    "sharmar-frontend",
    `env=lang:${lang}`,
    `commit=${sha}`,
    `short=${short}`,
    `utc=${utc}`,
  ].join("\n") + "\n";

  write(join("public", lang, "version.txt"), body);
}

console.log("OK: generated public/*/version.txt", { short, utc });
