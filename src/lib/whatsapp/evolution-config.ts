export function getEvolutionConfig() {
  const apiUrl = (
    process.env.EVOLUTION_API_URL?.trim() || "http://localhost:8080"
  ).replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instance = process.env.EVOLUTION_INSTANCE?.trim() || "enderxon";
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  const displayPhone =
    process.env.WHATSAPP_DISPLAY_PHONE?.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY_PHONE?.trim() ||
    "";

  return {
    apiUrl,
    apiKey,
    instance,
    webhookSecret,
    displayPhone,
    isConfigured: Boolean(apiKey && instance),
  };
}

export type WhatsAppProvider = "meta" | "evolution" | "none";

export function getWhatsAppProvider(): WhatsAppProvider {
  const forced = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (forced === "evolution") return "evolution";
  if (forced === "meta") return "meta";

  if (getEvolutionConfig().isConfigured) return "evolution";
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const metaPhone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (metaToken && metaPhone) return "meta";
  return "none";
}

export function getEvolutionWebhookUrl(request?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/api/evolution/webhook`;
  if (request) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}/api/evolution/webhook`;
  }
  return "https://tu-dominio.com/api/evolution/webhook";
}

export function isUnreachableWebhookUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1|host\.docker\.internal/i.test(url);
}
