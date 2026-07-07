import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { parseWhatsAppWebhook } from "@/lib/whatsapp/inbound";
import { handleInboundWhatsAppMessage } from "@/lib/whatsapp/service";
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const { verifyToken } = getWhatsAppConfig();

  if (mode === "subscribe" && token && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verificación fallida." }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WhatsAppWebhookPayload;

    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    const inbound = parseWhatsAppWebhook(payload);

    for (const message of inbound) {
      await handleInboundWhatsAppMessage(message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json({ ok: true });
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
