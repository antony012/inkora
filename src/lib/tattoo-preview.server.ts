import { generateGeminiTattooPreview } from "./gemini-image.server";
import { generatePollinationsTattooPreview } from "./pollinations-image.server";
import type { TattooPreviewInput, TattooPreviewResult } from "./tattoo-preview.shared";

export type { TattooPreviewInput, TattooPreviewResult } from "./tattoo-preview.shared";

export async function generateTattooPreview(
  input: TattooPreviewInput,
): Promise<TattooPreviewResult> {
  const pollinationsKey = process.env.POLLINATIONS_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  let lastError =
    "No hay proveedor de IA configurado. Añade POLLINATIONS_API_KEY (gratis) en .env.local.";
  let lastCode: string | undefined = "NO_PROVIDER";
  let fallbackSuggested = true;

  if (pollinationsKey) {
    const pollinationsResult = await generatePollinationsTattooPreview(input);
    if (pollinationsResult.ok) return pollinationsResult;
    lastError = pollinationsResult.error;
    lastCode = pollinationsResult.code;
    fallbackSuggested = Boolean(pollinationsResult.fallbackSuggested);

    if (
      pollinationsResult.code === "TIMEOUT" ||
      pollinationsResult.code === "PAYMENT_REQUIRED"
    ) {
      return {
        ok: false,
        error: lastError,
        code: lastCode,
        fallbackSuggested: true,
      };
    }
  }

  const pollinationsExhausted =
    lastCode === "PAYMENT_REQUIRED" || lastCode === "QUOTA_EXCEEDED";

  if (geminiKey) {
    const geminiResult = await generateGeminiTattooPreview(input);
    if (geminiResult.ok) return geminiResult;
    fallbackSuggested = fallbackSuggested || Boolean(geminiResult.fallbackSuggested);

    const geminiExhausted =
      geminiResult.code === "QUOTA_EXCEEDED" ||
      geminiResult.code === "FORBIDDEN";

    if (pollinationsExhausted && geminiExhausted) {
      return {
        ok: false,
        code: "ALL_PROVIDERS_EXHAUSTED",
        fallbackSuggested: true,
        error:
          "Sin cuota disponible: Pollinations sin saldo y Gemini sin cuota de imagen. Recarga Pollen en enter.pollinations.ai o habilita facturación en Gemini. Mientras tanto se usa la vista aproximada local.",
      };
    }

    if (!pollinationsExhausted) {
      lastError = geminiResult.error;
      lastCode = geminiResult.code;
    }
  }

  return {
    ok: false,
    error: lastError,
    code: lastCode,
    fallbackSuggested,
  };
}
