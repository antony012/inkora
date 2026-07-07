import { NextResponse } from "next/server";
import { handleInboundWhatsAppMessage } from "@/lib/whatsapp/service";
import type { WhatsAppInboundMessage } from "@/lib/whatsapp/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      phone?: string;
      name?: string;
      hasImage?: boolean;
    };

    const text = body.text?.trim();
    if (!text && !body.hasImage) {
      return NextResponse.json(
        { error: "Escribe un mensaje o marca hasImage." },
        { status: 400 },
      );
    }

    const digits = (body.phone ?? "56990001122").replace(/\D/g, "");
    const messageId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const inbound: WhatsAppInboundMessage = body.hasImage
      ? {
          kind: "image",
          from: digits,
          messageId,
          timestamp: String(Math.floor(Date.now() / 1000)),
          contactName: body.name?.trim() || "Cliente prueba",
          caption: text || "📷 Foto de referencia del diseño",
          mediaId: messageId,
        }
      : {
          kind: "text",
          from: digits,
          messageId,
          timestamp: String(Math.floor(Date.now() / 1000)),
          contactName: body.name?.trim() || "Cliente prueba",
          body: text!,
        };

    await handleInboundWhatsAppMessage(inbound);

    return NextResponse.json({
      ok: true,
      conversationId: `wa-${digits}`,
      message: "Mensaje procesado. Revisa el chat con badge WA en el CRM.",
    });
  } catch (error) {
    console.error("Evolution simulate error", error);
    return NextResponse.json(
      { error: "No se pudo simular el mensaje." },
      { status: 500 },
    );
  }
}
