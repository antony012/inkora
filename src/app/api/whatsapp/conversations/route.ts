import { NextResponse } from "next/server";
import { isWhatsAppLiveConfigured } from "@/lib/whatsapp/client";
import { listWhatsAppConversations } from "@/lib/whatsapp/store";

export async function GET() {
  if (!isWhatsAppLiveConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp no configurado." },
      { status: 503 },
    );
  }

  const conversations = await listWhatsAppConversations();
  return NextResponse.json({ conversations });
}
