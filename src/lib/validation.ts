export function sanitizeText(value: unknown, maxLength = 240) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: unknown) {
  const email = sanitizeText(value, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function sanitizePhone(value: unknown) {
  return sanitizeText(value, 40).replace(/[^\d+\s()-]/g, "");
}

export function sanitizeNumber(value: unknown, min = 0, max = 100000000) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.min(Math.max(number, min), max);
}