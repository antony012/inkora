type ProviderErrorInfo = {
  status?: number;
  code?: string;
  message: string;
  retryable: boolean;
};

export function parsePollinationsErrorResponse(
  status: number,
  body: string,
): ProviderErrorInfo {
  let parsedMessage = body;

  try {
    const data = JSON.parse(body) as {
      error?: { message?: string };
      message?: string;
    };
    parsedMessage = data.error?.message ?? data.message ?? body;
  } catch {
    parsedMessage = body;
  }

  if (status === 402 || /insufficient|payment_required|balance/i.test(parsedMessage)) {
    return {
      status: 402,
      code: "PAYMENT_REQUIRED",
      retryable: true,
      message:
        "Saldo de Pollinations en 0 para la API. El panel puede mostrar Pollen reclamado, pero aún no está disponible para editar imágenes. En enter.pollinations.ai: reclama las misiones de imagen y audio (Setup 4/4) y verifica que tu clave API tenga permiso account:usage o presupuesto. Mientras tanto se usa la vista aproximada local.",
    };
  }

  if (status === 429 || /quota|rate limit|too many/i.test(parsedMessage)) {
    return {
      status: 429,
      code: "QUOTA_EXCEEDED",
      retryable: true,
      message:
        "Límite de peticiones de Pollinations alcanzado. Espera unos segundos o usa la vista aproximada local.",
    };
  }

  if (status === 401 || status === 403 || /unauthorized|invalid.*key/i.test(parsedMessage)) {
    return {
      status,
      code: "FORBIDDEN",
      retryable: false,
      message:
        "POLLINATIONS_API_KEY inválida. Crea una clave gratis en enter.pollinations.ai.",
    };
  }

  if (status === 404 || /not found|unknown model/i.test(parsedMessage)) {
    return {
      status: 404,
      code: "MODEL_NOT_FOUND",
      retryable: true,
      message: "El modelo de Pollinations no está disponible.",
    };
  }

  return {
    status,
    code: "POLLINATIONS_ERROR",
    retryable: false,
    message:
      parsedMessage.slice(0, 220) ||
      "No se pudo generar la previsualización con Pollinations.",
  };
}

export function shouldTryNextPollinationsModel(info: ProviderErrorInfo) {
  return info.retryable || info.code === "MODEL_NOT_FOUND";
}
