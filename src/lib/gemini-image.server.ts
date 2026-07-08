import {
  parseGeminiErrorResponse,
  shouldTryNextGeminiModel,
} from "./gemini-errors";
import { FetchTimeoutError, fetchWithTimeout } from "./fetch-with-timeout";
import {
  buildTattooPreviewPrompt,
  type TattooPreviewInput,
  type TattooPreviewResult,
} from "./tattoo-preview.shared";

function imageModelCandidates(): string[] {
  const configured = process.env.GEMINI_IMAGE_MODEL?.trim();
  const defaults = [
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-preview-image-generation",
  ];
  return Array.from(new Set([configured, ...defaults].filter(Boolean))) as string[];
}

async function callGeminiImageModel(
  apiKey: string,
  model: string,
  input: TattooPreviewInput,
): Promise<TattooPreviewResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = buildTattooPreviewPrompt(input.zone, input.notes);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: input.bodyMimeType,
                    data: input.bodyImageBase64,
                  },
                },
                {
                  inlineData: {
                    mimeType: input.designMimeType,
                    data: input.designImageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      },
      55_000,
    );
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      return {
        ok: false,
        code: "TIMEOUT",
        fallbackSuggested: true,
        error:
          "Gemini tardó demasiado en responder. Prueba de nuevo o usa la vista aproximada local.",
      };
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const parsed = parseGeminiErrorResponse(response.status, errorBody);
    return {
      ok: false,
      code: parsed.code,
      fallbackSuggested: parsed.code === "QUOTA_EXCEEDED",
      error: parsed.message,
    };
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const text = parts
      .map((part) => part.text)
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      ok: false,
      error: text || `Gemini (${model}) no devolvió imagen.`,
    };
  }

  const mimeType = imagePart.inlineData.mimeType ?? "image/png";
  const description = parts
    .filter((part) => part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();

  return {
    ok: true,
    provider: "gemini",
    model,
    imageDataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    description: description || undefined,
  };
}

export async function generateGeminiTattooPreview(
  input: TattooPreviewInput,
): Promise<TattooPreviewResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, code: "NO_PROVIDER", error: "GEMINI_API_KEY no configurada." };
  }

  let lastError = "No se pudo generar la previsualización con Gemini.";
  let lastCode: string | undefined;
  let fallbackSuggested = false;

  for (const model of imageModelCandidates()) {
    const result = await callGeminiImageModel(apiKey, model, input);
    if (result.ok) return result;
    lastError = result.error;
    lastCode = result.code;
    fallbackSuggested = fallbackSuggested || Boolean(result.fallbackSuggested);
    if (
      !shouldTryNextGeminiModel({
        message: result.error,
        code: result.code,
        retryable:
          Boolean(result.fallbackSuggested) || result.code === "MODEL_NOT_FOUND",
      })
    ) {
      break;
    }
  }

  return {
    ok: false,
    error: lastError,
    code: lastCode,
    fallbackSuggested,
  };
}
