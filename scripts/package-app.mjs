import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(root, process.argv[2] ?? "app/contoso-web.tar.gz");
const entries = [
  ".eslintrc.json",
  "LICENSE.md",
  "UPSTREAM.md",
  "package.json",
  "package-lock.json",
  "next.config.js",
  "postcss.config.js",
  "tailwind.config.ts",
  "tsconfig.json",
  "public",
  "src",
];

for (const entry of entries) {
  statSync(resolve(root, "app", "contoso-web", entry));
}
mkdirSync(dirname(destination), { recursive: true });

// An allowlist keeps local environment files, dependencies and builds out of S3.
const result = spawnSync(
  "tar",
  [
    "-czf",
    destination,
    "-C",
    resolve(root, "app"),
    ...entries.map((entry) => `contoso-web/${entry}`),
  ],
  { stdio: "inherit" }
);
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`Application packaging failed (tar exit ${result.status}).`);
}
console.log(`Application archive: ${destination}`);
