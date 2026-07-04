export const PASSWORD_MIN_LENGTH = 8;

export type PasswordValidation = {
  ok: boolean;
  errors: string[];
};

export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Incluye al menos una minúscula.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Incluye al menos una mayúscula.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Incluye al menos un número.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Incluye al menos un símbolo.");
  }

  return { ok: errors.length === 0, errors };
}

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const saltBytes = Uint8Array.from(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_BYTES * 8,
  );
  return new Uint8Array(derived);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256:${PBKDF2_ITERATIONS}:${toBase64(salt)}:${toBase64(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const match = /^pbkdf2-sha256:(\d+):([^:]+):([^:]+)$/.exec(stored);
  if (!match) return false;

  const iterations = Number(match[1]);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;

  const salt = fromBase64(match[2]);
  const expected = fromBase64(match[3]);
  const derived = await deriveKey(password, salt, iterations);
  return constantTimeEqual(derived, expected);
}

export function passwordStrengthHints(password: string): string[] {
  const hints: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    hints.push(`${PASSWORD_MIN_LENGTH}+ caracteres`);
  }
  if (!/[a-z]/.test(password)) hints.push("minúscula");
  if (!/[A-Z]/.test(password)) hints.push("mayúscula");
  if (!/[0-9]/.test(password)) hints.push("número");
  if (!/[^A-Za-z0-9]/.test(password)) hints.push("símbolo");
  return hints;
}
