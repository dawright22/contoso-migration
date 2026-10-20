import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("the generated archive matches the Linux bootstrap extraction contract", () => {
  const listing = spawnSync("tar", ["-tzf", "app/contoso-web.tar.gz"], { encoding: "utf8" });
  if (listing.error) throw listing.error;
  assert.equal(listing.status, 0, listing.stderr);
  const entries = listing.stdout.trim().split(/\r?\n/);
  for (const entry of entries) {
    assert.ok(entry.startsWith("contoso-web/"), entry);
    assert.doesNotMatch(entry, /(^|\/)(node_modules|\.next|\.git|\.env[^/]*|tests)(\/|$)/);
    assert.doesNotMatch(entry, /(^|\/)\.\.(\/|$)/);
  }
  const extracted = mkdtempSync(join(tmpdir(), "contoso-package-test-"));
  try {
    const extraction = spawnSync(
      "tar", ["-xzf", "app/contoso-web.tar.gz", "-C", extracted, "--strip-components=1"],
      { encoding: "utf8" }
    );
    if (extraction.error) throw extraction.error;
    assert.equal(extraction.status, 0, extraction.stderr);
    for (const file of [
      "package.json", "package-lock.json", "LICENSE.md", "next.config.js",
      "src/app/page.tsx", "src/app/layout.tsx",
      "src/app/products/[slug]/page.tsx",
      "src/app/api/chat/[[...path]]/route.ts",
      "public/products.json", "public/categories.json",
    ]) {
      assert.ok(entries.includes(`contoso-web/${file}`), `Archive is missing ${file}`);
      assert.deepEqual(
        readFileSync(join(extracted, file)),
        readFileSync(`app/contoso-web/${file}`),
        `Stale ${file}`
      );
    }
  } finally {
    rmSync(extracted, { recursive: true, force: true });
  }
  const products = JSON.parse(readFileSync("app/contoso-web/public/products.json", "utf8"));
  for (const product of products) {
    assert.ok(entries.includes(`contoso-web/public/${product.manual.replace(/^\/+/, "")}`), product.manual);
    for (const image of product.images) {
      assert.ok(entries.includes(`contoso-web/public${image}`), image);
    }
  }
});
