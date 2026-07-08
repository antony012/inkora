type GeminiErrorInfo = {
  status?: number;
  code?: string;
  message: string;
  retryable: boolean;
};

export function parseGeminiErrorResponse(
  status: number,
  body: string,
): GeminiErrorInfo {
  let parsedMessage = "";
  let code = "";

  try {
    const data = JSON.parse(body) as {
      error?: {
        code?: number;
        status?: string;
        message?: string;
      };
    };
    parsedMessage = data.error?.message ?? "";
    code = data.error?.status ?? String(data.error?.code ?? "");
  } catch {
    parsedMessage = body;
  }

  if (status === 429 || /quota|rate limit|resource exhausted/i.test(parsedMessage)) {
    return {
      status: 429,
      code: "QUOTA_EXCEEDED",
      retryable: true,
      message:
        "La cuota de Gemini para generar imágenes se agotó. Revisa tu plan en Google AI Studio o espera unos minutos. Mientras tanto puedes usar la vista aproximada local.",
    };
  }

  if (status === 403 || /permission|billing|api key/i.test(parsedMessage)) {
    return {
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
      message:
        "La API de Gemini rechazó la solicitud. Verifica que GEMINI_API_KEY sea válida y tenga facturación o cuota de generación de imágenes habilitada.",
    };
  }

  if (status === 404 || /not found|invalid model/i.test(parsedMessage)) {
    return {
      status: 404,
      code: "MODEL_NOT_FOUND",
      retryable: true,
      message: "El modelo de imagen no está disponible en tu cuenta.",
    };
  }

  return {
    status,
    code: code || "GEMINI_ERROR",
    retryable: false,
    message:
      parsedMessage.slice(0, 220) ||
      "No se pudo generar la previsualización con Gemini.",
  };
}

export function shouldTryNextGeminiModel(info: GeminiErrorInfo) {
  return info.retryable || info.code === "MODEL_NOT_FOUND";
}
