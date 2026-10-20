import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";

let server;
let baseUrl;
let output = "";

before(async () => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve()))
  );
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    { env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" } }
  );
  server.stdout.on("data", (chunk) => { output += chunk; });
  server.stderr.on("data", (chunk) => { output += chunk; });
  server.on("error", (error) => { output += error.message; });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch (error) {
      // Connection refusal is expected until Next.js finishes starting.
      if (!(error instanceof TypeError) && error.name !== "TimeoutError") throw error;
    }
    await delay(250);
  }
  throw new Error(`Production server failed to become ready:\n${output}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
});

test("catalog, all product pages, manuals and referenced images are available", async () => {
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Contoso Outdoor Company/);
  assert.doesNotMatch(html, /\/api\/chat|type=grounded|type=visual/);

  const products = JSON.parse(await readFile("public/products.json", "utf8"));
  const categories = JSON.parse(await readFile("public/categories.json", "utf8"));
  const slugs = new Set(products.map((product) => product.slug));
  for (const category of categories) {
    for (const product of category.products) {
      assert.ok(slugs.has(product.slug), `Unknown catalog product: ${product.slug}`);
      assert.ok(html.includes(`/products/${product.slug}`));
    }
  }
  for (const product of products) {
    const response = await fetch(`${baseUrl}/products/${product.slug}`);
    assert.equal(response.status, 200, product.slug);
    assert.ok((await response.text()).includes(product.name), product.name);
    const manual = await fetch(new URL(product.manual, baseUrl));
    assert.equal(manual.status, 200, product.manual);
    for (const image of product.images) {
      const asset = await fetch(new URL(image, baseUrl));
      assert.equal(asset.status, 200, image);
      await asset.arrayBuffer();
    }
  }
  const optimized = await fetch(
    `${baseUrl}/_next/image?url=${encodeURIComponent(products[0].images[0])}&w=640&q=75`
  );
  assert.equal(optimized.status, 200);
  assert.match(optimized.headers.get("content-type"), /^image\//);
});

test("unknown products return 404 instead of crashing", async () => {
  const response = await fetch(`${baseUrl}/products/not-a-real-product`);
  assert.equal(response.status, 404);
});

test("chat is explicitly disabled for every mode without Azure configuration", async () => {
  for (const path of ["/api/chat", "/api/chat/grounded", "/api/chat/promptflow", "/api/chat/visual"]) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(response.status, 404, `${method} ${path}`);
      assert.deepEqual(await response.json(), { error: "Chat is disabled in this deployment." });
    }
  }
  const response = await fetch(`${baseUrl}/?type=visual`);
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /\/api\/chat|type=visual/);
});
