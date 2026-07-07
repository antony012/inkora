import { NextResponse } from "next/server";
import { isWhatsAppLiveConfigured } from "@/lib/whatsapp/client";
import { sendArtistWhatsAppMessage } from "@/lib/whatsapp/service";

export async function POST(request: Request) {
  if (!isWhatsAppLiveConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp no configurado." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    conversationId?: string;
    text?: string;
  };

  if (!body.conversationId || !body.text?.trim()) {
    return NextResponse.json(
      { error: "conversationId y text son requeridos." },
      { status: 400 },
    );
  }

  const result = await sendArtistWhatsAppMessage(
    body.conversationId,
    body.text,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ conversation: result.conversation });
}
