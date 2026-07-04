import { webcrypto } from "node:crypto";

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const encoder = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_BYTES * 8,
  );
  return `pbkdf2-sha256:${PBKDF2_ITERATIONS}:${toBase64(salt)}:${toBase64(new Uint8Array(derived))}`;
}

const accounts = [
  ["sofia@email.com", "Sofia2026!"],
  ["diego@email.com", "Diego2026!"],
  ["ana@email.com", "Ana2026!"],
];

for (const [email, password] of accounts) {
  const hash = await hashPassword(password);
  console.log(`${email}\t${password}\t${hash}`);
}
