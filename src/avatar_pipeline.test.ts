import assert from "node:assert/strict";
import { buildAvatar } from "./avatar_pipeline.js";

const seen: Array<{ path: string; body: Record<string, unknown> }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url, init) => {
  const path = new URL(String(url)).pathname;
  seen.push({ path, body: JSON.parse(String(init?.body)) });
  const image = path.endsWith("upload") ? "raw" : path.endsWith("smart_crop") ? "cropped" : "optimized";
  return new Response(JSON.stringify({ ok: true, data: { image } }), { status: 200 });
}) as typeof fetch;

const result = await buildAvatar({ playerId: "p1", filename: "a.png", file: "blob", aspect: "1:1" }, "test-key");
assert.deepEqual(result, { playerId: "p1", image: "optimized", state: "ready" });
assert.deepEqual(seen.map(item => item.path), ["/v1/image/upload", "/v1/image/smart_crop", "/v1/image/compress"]);
assert.equal(seen[1].body.aspect, "1:1");
globalThis.fetch = originalFetch;
console.log("avatar decision test passed");
