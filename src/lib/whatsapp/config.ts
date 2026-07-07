export function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
  const displayPhone =
    process.env.WHATSAPP_DISPLAY_PHONE?.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY_PHONE?.trim() ||
    "";

  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    apiVersion,
    displayPhone,
    isConfigured: Boolean(accessToken && phoneNumberId && verifyToken),
  };
}

export function getPublicWebhookUrl(request?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/api/whatsapp/webhook`;
  if (request) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}/api/whatsapp/webhook`;
  }
  return "https://tu-dominio.com/api/whatsapp/webhook";
}
