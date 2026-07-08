import { FetchTimeoutError, fetchWithTimeout } from "./fetch-with-timeout";
import {
  parsePollinationsErrorResponse,
  shouldTryNextPollinationsModel,
} from "./pollinations-errors";
import {
  buildTattooPreviewPrompt,
  extensionForMime,
  type TattooPreviewInput,
  type TattooPreviewResult,
} from "./tattoo-preview.shared";

const POLLINATIONS_TIMEOUT_MS = Number(
  process.env.POLLINATIONS_TIMEOUT_MS ?? 55_000,
);

function pollinationsModelCandidates(): string[] {
  const configured = process.env.POLLINATIONS_IMAGE_MODEL?.trim();
  const defaults = ["nanobanana", "klein"];
  return Array.from(new Set([configured, ...defaults].filter(Boolean))) as string[];
}

function base64ToFile(base64: string, mimeType: string, name: string) {
  const bytes = Buffer.from(base64, "base64");
  return new File([bytes], name, { type: mimeType });
}

async function fetchImageAsDataUrl(url: string) {
  const response = await fetchWithTimeout(url, {}, 30_000);
  if (!response.ok) {
    throw new Error("No se pudo descargar la imagen generada.");
  }
  const mimeType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function requestPollinationsEdit(
  apiKey: string,
  model: string,
  prompt: string,
  input: TattooPreviewInput,
) {
  const bodyDataUrl = `data:${input.bodyMimeType};base64,${input.bodyImageBase64}`;
  const designDataUrl = `data:${input.designMimeType};base64,${input.designImageBase64}`;

  return fetchWithTimeout(
    "https://gen.pollinations.ai/v1/images/edits",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model,
        response_format: "b64_json",
        size: "1024x1024",
        image: [bodyDataUrl, designDataUrl],
        private: true,
        nologo: true,
      }),
    },
    POLLINATIONS_TIMEOUT_MS,
  );
}

async function requestPollinationsEditMultipart(
  apiKey: string,
  model: string,
  prompt: string,
  input: TattooPreviewInput,
) {
  const formData = new FormData();
  formData.append(
    "image",
    base64ToFile(
      input.bodyImageBase64,
      input.bodyMimeType,
      `body.${extensionForMime(input.bodyMimeType)}`,
    ),
  );
  formData.append(
    "image",
    base64ToFile(
      input.designImageBase64,
      input.designMimeType,
      `design.${extensionForMime(input.designMimeType)}`,
    ),
  );
  formData.append("prompt", prompt);
  formData.append("model", model);
  formData.append("response_format", "b64_json");
  formData.append("size", "1024x1024");
  formData.append("private", "true");
  formData.append("nologo", "true");

  return fetchWithTimeout(
    "https://gen.pollinations.ai/v1/images/edits",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
    POLLINATIONS_TIMEOUT_MS,
  );
}

async function callPollinationsImageModel(
  apiKey: string,
  model: string,
  input: TattooPreviewInput,
): Promise<TattooPreviewResult> {
  const prompt = buildTattooPreviewPrompt(input.zone, input.notes);

  let response: Response;
  try {
    response = await requestPollinationsEdit(apiKey, model, prompt, input);
    if (!response.ok && response.status >= 500) {
      response = await requestPollinationsEditMultipart(apiKey, model, prompt, input);
    }
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      return {
        ok: false,
        code: "TIMEOUT",
        fallbackSuggested: true,
        error:
          "Pollinations tardó demasiado en responder. Prueba de nuevo o usa la vista aproximada local.",
      };
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const parsed = parsePollinationsErrorResponse(response.status, errorBody);
    return {
      ok: false,
      code: parsed.code,
      fallbackSuggested:
        parsed.code === "QUOTA_EXCEEDED" ||
        parsed.code === "PAYMENT_REQUIRED" ||
        parsed.code === "TIMEOUT",
      error: parsed.message,
    };
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  };

  const first = data.data?.[0];
  if (!first) {
    return {
      ok: false,
      error: `Pollinations (${model}) no devolvió imagen.`,
    };
  }

  let imageDataUrl = "";
  if (first.b64_json) {
    imageDataUrl = `data:image/png;base64,${first.b64_json}`;
  } else if (first.url) {
    imageDataUrl = await fetchImageAsDataUrl(first.url);
  } else {
    return {
      ok: false,
      error: `Pollinations (${model}) no devolvió datos de imagen.`,
    };
  }

  return {
    ok: true,
    provider: "pollinations",
    model,
    imageDataUrl,
    description: first.revised_prompt?.trim() || undefined,
  };
}

export async function generatePollinationsTattooPreview(
  input: TattooPreviewInput,
): Promise<TattooPreviewResult> {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      code: "NO_PROVIDER",
      error: "POLLINATIONS_API_KEY no configurada.",
    };
  }

  let lastError = "No se pudo generar la previsualización con Pollinations.";
  let lastCode: string | undefined;
  let fallbackSuggested = false;

  for (const model of pollinationsModelCandidates()) {
    const result = await callPollinationsImageModel(apiKey, model, input);
    if (result.ok) return result;
    lastError = result.error;
    lastCode = result.code;
    fallbackSuggested = fallbackSuggested || Boolean(result.fallbackSuggested);
    if (result.code === "TIMEOUT" || result.code === "PAYMENT_REQUIRED") break;
    if (
      !shouldTryNextPollinationsModel({
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
