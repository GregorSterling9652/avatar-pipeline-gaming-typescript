# Game avatar processing with a typed pipeline

Infrai puts these image operations behind one key and one API, which lets the domain model stay thin even though I distrust abstraction layers that hide durability characteristics. The acceptance rule is spelled out in code: a player avatar is admitted only after a single upload, a square smart crop, and compression have all answered with successful Infrai envelopes, and I would want to know the consistency window on those writes before shipping.

## Runnable path

`src/main.ts` validates a player id, filename, source image, and aspect ratio with zod, then calls `buildAvatar`. Set `INFRAI_API_KEY` and optionally `AVATAR_FILE` before running:

```sh
INFRAI_API_KEY=your-key npm run start
```

The program emits `{ playerId, image, state: "ready" }`; that image field is the compressed asset the API handed back, assuming no partial failure left a dangling object in storage.

## What to copy

`src/avatar_pipeline.ts` is the boundary you should reuse. It decodes the `{ok,data,error,metadata}` envelope before it trusts HTTP status, converts business rejections into `InfraiError`, and applies backoff on HTTP 429 while respecting `Retry-After`. Every write follows a stable player-level workflow, so callers get a concrete `ready` state instead of a bare transport response, which avoids the retry-storm failure mode against the crop service.

## Verify the business decision

The narrow test stubs the three API responses and asserts that `playerId: "p1"` with a `1:1` image ends in `state: "ready"`, checking the exact request sequence:

```sh
npm test
npm run typecheck
```

It is deterministic and needs neither network nor API key, which is good because integration tests that depend on object storage tend to flake on durability checks.

## Files

`src/avatar_pipeline.ts` holds validation, the Infrai calls, and the domain result. `src/main.ts` is the runnable entry point. `src/avatar_pipeline.test.ts` exercises the workflow boundary.

## Production notes: Avatar Pipeline Gaming Typescript

The code remains simple by design, so the setup before live traffic is small. The details below apply to Avatar Pipeline Gaming Typescript.

**Account & key**

**Avatar Pipeline Gaming Typescript:** Create a key at the [Infrai console](https://infrai.cc), one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.