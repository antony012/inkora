import { NextResponse } from "next/server";
import {
  getWhatsAppBotConfig,
  setWhatsAppBotConfig,
} from "@/lib/whatsapp/store";
import type { CrmBotConfig } from "@/lib/bot-knowledge";

export async function GET() {
  const botConfig = await getWhatsAppBotConfig();
  return NextResponse.json({ botConfig });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<CrmBotConfig>;
  const botConfig = await setWhatsAppBotConfig(body);
  return NextResponse.json({ botConfig });
}
