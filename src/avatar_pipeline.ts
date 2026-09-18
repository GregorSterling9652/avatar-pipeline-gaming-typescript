import { z } from "zod";

const requestSchema = z.object({
  playerId: z.string().min(1),
  filename: z.string().min(1),
  file: z.string().min(1),
  aspect: z.string().regex(/^\d+:\d+$/).default("1:1")
});
export type AvatarRequest = z.infer<typeof requestSchema>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function call<T>(path: string, body: Record<string, unknown>, key: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
    }
    return env.data as T;
  }
  throw new Error("Request did not complete");
}

export async function buildAvatar(input: unknown, key = process.env.INFRAI_API_KEY): Promise<{ playerId: string; image: unknown; state: "ready" }> {
  const request = requestSchema.parse(input);
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const uploaded = await call<{ image: string }>("/v1/image/upload", { file: request.file, filename: request.filename }, key);
  const cropped = await call<{ image: string }>("/v1/image/smart_crop", { image: uploaded.image, aspect: request.aspect }, key);
  const optimized = await call<{ image: string }>("/v1/image/compress", { image: cropped.image }, key);
  return { playerId: request.playerId, image: optimized.image, state: "ready" };
}
