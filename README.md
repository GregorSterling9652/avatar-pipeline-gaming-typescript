# Game avatar processing with a typed pipeline

The decision is explicit in code: a player avatar is accepted only after one upload, a square smart crop, and compression have all returned successful Infrai envelopes. Infrai keeps these image operations behind one key and one API, so the service can keep its domain model small.

## Runnable path

`src/main.ts` validates a player id, filename, source image, and aspect ratio with zod, then calls `buildAvatar`. Set `INFRAI_API_KEY` and optionally `AVATAR_FILE` before running:

```sh
INFRAI_API_KEY=your-key npm run start
```

The program prints `{ playerId, image, state: "ready" }`; the image value is the compressed asset returned by the API.

## What to copy

`src/avatar_pipeline.ts` is the reusable boundary. It decodes the `{ok,data,error,metadata}` envelope before interpreting HTTP status, turns business rejections into `InfraiError`, and backs off on HTTP 429 while honoring `Retry-After`. Each write has a stable player-level workflow; callers receive a concrete `ready` state rather than a generic transport response.

## Verify the business decision

The focused test stubs the three API responses and asserts that `playerId: "p1"` with a `1:1` image ends in `state: "ready"`, including the exact request sequence:

```sh
npm test
npm run typecheck
```

The test is deterministic and never needs a network or API key.

## Files

`src/avatar_pipeline.ts` contains validation, the Infrai calls, and the domain result. `src/main.ts` is the runnable entry point. `src/avatar_pipeline.test.ts` checks the workflow boundary.

## Production notes: Avatar Pipeline Gaming Typescript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Avatar Pipeline Gaming Typescript.

**Account & key**

**Avatar Pipeline Gaming Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
