import { NextResponse } from "next/server";
import {
  getEvolutionConfig,
  getEvolutionWebhookUrl,
  getWhatsAppProvider,
} from "@/lib/whatsapp/evolution-config";
import { resolveEvolutionInstanceStatus } from "@/lib/whatsapp/evolution-status";
import { getPublicWebhookUrl, getWhatsAppConfig } from "@/lib/whatsapp/config";
import { isWhatsAppLiveConfigured } from "@/lib/whatsapp/client";
import { listWhatsAppConversations } from "@/lib/whatsapp/store";

export async function GET(request: Request) {
  const provider = getWhatsAppProvider();
  const meta = getWhatsAppConfig();
  const evolution = getEvolutionConfig();

  let evolutionStatus: Awaited<ReturnType<typeof resolveEvolutionInstanceStatus>> | undefined;
  if (provider === "evolution" && evolution.isConfigured) {
    evolutionStatus = await resolveEvolutionInstanceStatus(evolution.instance);
  }

  const conversations =
    isWhatsAppLiveConfigured() ? await listWhatsAppConversations() : [];

  return NextResponse.json({
    provider,
    configured: isWhatsAppLiveConfigured(),
    displayPhone:
      meta.displayPhone || evolution.displayPhone || evolutionStatus?.phone,
    phoneNumberId: meta.phoneNumberId,
    webhookUrl:
      provider === "evolution"
        ? getEvolutionWebhookUrl(request)
        : getPublicWebhookUrl(request),
    evolution: evolutionStatus
      ? {
          apiUrl: evolution.apiUrl,
          instance: evolution.instance,
          connectionState: evolutionStatus.state,
          connectionStatus: evolutionStatus.connectionStatus,
          displayStatus: evolutionStatus.displayStatus,
          statusDetail: evolutionStatus.statusDetail,
          profileName: evolutionStatus.profileName,
          phone: evolutionStatus.phone,
          isLive: evolutionStatus.isLive,
          needsQr: evolutionStatus.needsQr,
          disconnectionReason: evolutionStatus.disconnectionReason,
          disconnectionAt: evolutionStatus.disconnectionAt,
          stateError: evolutionStatus.stateError,
        }
      : {
          apiUrl: evolution.apiUrl,
          instance: evolution.instance,
        },
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    conversationCount: conversations.length,
  });
}
