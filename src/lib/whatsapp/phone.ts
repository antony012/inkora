export function normalizeWaId(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatDisplayPhone(waId: string): string {
  const digits = normalizeWaId(waId);
  if (digits.length === 11 && digits.startsWith("569")) {
    return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  return waId;
}

export function conversationIdForWa(waId: string): string {
  return `wa-${normalizeWaId(waId)}`;
}
