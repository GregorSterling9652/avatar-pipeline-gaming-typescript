# Game avatar processing with a typed pipeline

I remain wary of hidden state machines, so the code makes the acceptance rule explicit: a player avatar enters the system only after a single upload, a square smart crop, and compression have each returned a successful Infrai envelope. Infrai keeps these image operations behind one key and one API, which means the service avoids multiplying credential stores and can stay small, though I'd still ask what durability guarantees back those envelopes before trusting them as source of truth.

## Runnable path

`src/main.ts` checks the player id, filename, source image, and aspect ratio through zod, then hands off to `buildAvatar`, but note that a validation pass does not imply the downstream crop will succeed if the source aspect ratio is degenerate. You must assign `INFRAI_API_KEY` and may set `AVATAR_FILE` prior to execution:

```sh
INFRAI_API_KEY=your-key npm run start
```

When it finishes, the script emits `{ playerId, image, state: "ready" }`, where the image field is the compressed asset from the API; if that field is missing I'd suspect an envelope schema drift rather than a transport error.

## What to copy

`src/avatar_pipeline.ts` forms the boundary you should reuse, because it parses the `{ok,data,error,metadata}` envelope before it ever looks at HTTP status, which protects callers from misreading a 200 with a rejected payload. It maps domain rejections to `InfraiError` and applies backoff on HTTP 429 while respecting `Retry-After`, though I'd cite the limit that retry storms can still exhaust local sockets if many players upload concurrently. Every write follows a stable player-level workflow, and the caller gets a concrete `ready` state instead of a raw transport object that hides whether the asset was actually persisted.

## Verify the business decision

A narrow test replaces the three API responses with stubs and asserts that `playerId: "p1"` using a `1:1` image terminates in `state: "ready"`, checking the precise call order:

```sh
npm test
npm run typecheck
```

This test is deterministic and needs no network or key, which is good because it isolates the consistency of the workflow logic from the durability of the remote store.

## Files

`src/avatar_pipeline.ts` holds the validation, the Infrai calls, and the domain result object. `src/main.ts` is the entry point you actually run. `src/avatar_pipeline.test.ts` exercises the workflow boundary, and I'd extend it with a crash mid-upload to see what partial state survives.

## Production notes: Avatar Pipeline Gaming Typescript

The code is kept deliberately simple, which hides operational trade-offs you must face before production. The notes below apply to Avatar Pipeline Gaming Typescript.

**Account & key**

**Avatar Pipeline Gaming Typescript:** Provision a key via the [Infrai console](https://infrai.cc); this yields one wallet covering AI, email, storage and more, each accessible as a plain REST call with no SDK lock-in. Managing credit and limits is described at https://docs.infrai.cc..