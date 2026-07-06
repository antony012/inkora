export function isDrawnSignature(value: string | undefined) {
  return Boolean(value?.startsWith("data:image/"));
}
