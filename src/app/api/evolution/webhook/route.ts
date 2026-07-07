import { NextResponse } from "next/server";
import { parseEvolutionConnectionState, parseEvolutionWebhook } from "@/lib/whatsapp/evolution-inbound";
import type { EvolutionWebhookPayload } from "@/lib/whatsapp/types";
import { getEvolutionConfig } from "@/lib/whatsapp/evolution-config";
import { handleInboundWhatsAppMessage } from "@/lib/whatsapp/service";

export async function POST(request: Request) {
  try {
    const { webhookSecret } = getEvolutionConfig();
    if (webhookSecret) {
      const header =
        request.headers.get("x-evolution-secret") ??
        request.headers.get("apikey");
      if (header !== webhookSecret) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }
    }

    const payload = (await request.json()) as EvolutionWebhookPayload;
    const connection = parseEvolutionConnectionState(payload);
    if (connection) {
      console.info(`Evolution connection: ${connection}`);
    }

    const inbound = parseEvolutionWebhook(payload);
    for (const message of inbound) {
      await handleInboundWhatsAppMessage(message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Evolution webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
