import crypto from "node:crypto";
import { config } from "../../config/env.js";

const ENCRYPTED_PREFIX = "enc:v1:";

function getKeyBuffer() {
  const raw = config.appEncryptionKey.trim();

  if (!raw) {
    return null;
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const asBase64 = Buffer.from(raw, "base64");
  if (asBase64.length === 32) {
    return asBase64;
  }

  return null;
}

function getEncryptionKey() {
  return getKeyBuffer();
}

export function hasEncryptionKey() {
  return Boolean(getEncryptionKey());
}

export function encryptSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const key = getEncryptionKey();
  if (!key) {
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const key = getEncryptionKey();
  if (!key) {
    return value;
  }

  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(":");

  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Malformed encrypted secret payload.");
  }

  const iv = Buffer.from(ivEncoded, "base64");
  const authTag = Buffer.from(tagEncoded, "base64");
  const ciphertext = Buffer.from(ciphertextEncoded, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
