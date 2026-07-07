import { NextResponse } from "next/server";
import { getEvolutionConfig } from "@/lib/whatsapp/evolution-config";
import { probeEvolutionApi } from "@/lib/whatsapp/evolution-client";

export async function GET() {
  const { apiUrl, isConfigured } = getEvolutionConfig();

  if (!isConfigured) {
    return NextResponse.json({
      ok: false,
      error: "Evolution no configurado en .env.local",
    });
  }

  const probe = await probeEvolutionApi();

  if (!probe.ok) {
    return NextResponse.json({
      ok: false,
      apiUrl,
      error: probe.error,
      hint: "Pon EVOLUTION_API_URL=https://tu-servicio.up.railway.app y reinicia npm run dev.",
    });
  }

  return NextResponse.json({
    ok: true,
    apiUrl,
    version: probe.version,
    hint: `Evolution ${probe.version ?? ""} responde. Puedes usar Vincular con QR.`.trim(),
  });
}
