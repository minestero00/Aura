import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// back/src/lib/security/encryption.ts 와 동일한 포맷 (enc:v1:{iv}:{tag}:{ciphertext}, base64)
// BOT_ENCRYPTION_KEY는 back/의 APP_ENCRYPTION_KEY와 반드시 동일한 값이어야 함
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = (process.env.BOT_ENCRYPTION_KEY ?? "").trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  throw new Error("BOT_ENCRYPTION_KEY must be 64-char hex or 32-byte base64");
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // 암호화 안 된 값 그대로 반환
  const key = getKey();
  const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}
