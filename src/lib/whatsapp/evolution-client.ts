import { getEvolutionConfig } from "./evolution-config";

export type EvolutionProbeResult =
  | { ok: true; version?: string; message?: string }
  | { ok: false; error: string; apiUrl: string };

export async function probeEvolutionApi(): Promise<EvolutionProbeResult> {
  const { apiUrl, apiKey } = getEvolutionConfig();
  if (!apiKey) {
    return { ok: false, error: "EVOLUTION_API_KEY no configurada.", apiUrl };
  }

  try {
    const response = await fetch(`${apiUrl}/`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();

    try {
      const data = JSON.parse(text) as { message?: string; version?: string };
      const message = data.message ?? "";
      if (
        response.ok &&
        /evolution api/i.test(message)
      ) {
        return { ok: true, version: data.version, message };
      }
    } catch {
      // not JSON — likely wrong service (e.g. CEF on :8080)
    }

    if (!response.ok) {
      return {
        ok: false,
        apiUrl,
        error: `Evolution respondió HTTP ${response.status}. Revisa EVOLUTION_API_URL.`,
      };
    }

    return {
      ok: false,
      apiUrl,
      error: `La URL ${apiUrl} no es Evolution API. Usa tu dominio de Railway (https://....up.railway.app), no localhost:8080.`,
    };
  } catch (error) {
    return {
      ok: false,
      apiUrl,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo conectar con Evolution API.",
    };
  }
}

type EvolutionFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function evolutionFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<EvolutionFetchResult<T>> {
  const { apiUrl, apiKey } = getEvolutionConfig();
  if (!apiKey) {
    return { ok: false, error: "EVOLUTION_API_KEY no configurada." };
  }

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const text = await response.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      data = undefined;
    }

    if (!response.ok) {
      const err =
        (data as { message?: string; error?: string })?.message ??
        (data as { error?: string })?.error ??
        text.slice(0, 200) ??
        `HTTP ${response.status}`;
      return { ok: false, error: err, status: response.status };
    }

    return { ok: true, data: data as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error de red",
    };
  }
}

export async function createEvolutionInstance(instanceName: string) {
  return evolutionFetch<{
    instance?: { instanceName?: string; status?: string };
    qrcode?: { base64?: string; code?: string };
    hash?: string;
  }>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      rejectCall: true,
      msgCall: "En este momento atiendo por mensaje. Escríbeme y te respondo.",
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: false,
    }),
  });
}

export async function connectEvolutionInstance(instanceName: string) {
  return evolutionFetch<{
    base64?: string;
    code?: string;
    pairingCode?: string;
    count?: number;
  }>(`/instance/connect/${encodeURIComponent(instanceName)}`, {
    method: "GET",
  });
}

export async function getEvolutionConnectionState(instanceName: string) {
  return evolutionFetch<{
    instance?: { instanceName?: string; state?: string };
    state?: string;
  }>(`/instance/connectionState/${encodeURIComponent(instanceName)}`, {
    method: "GET",
  });
}

export async function setEvolutionWebhook(
  instanceName: string,
  webhookUrl: string,
) {
  const body = {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhook_base64: false,
    events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
  };

  const nested = evolutionFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ webhook: body }),
  });

  const result = await nested;
  if (result.ok) return result;

  return evolutionFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function sendEvolutionText(number: string, text: string) {
  const { instance } = getEvolutionConfig();
  const digits = number.replace(/\D/g, "");

  return evolutionFetch<{ key?: { id?: string } }>(
    `/message/sendText/${encodeURIComponent(instance)}`,
    {
      method: "POST",
      body: JSON.stringify({ number: digits, text }),
    },
  );
}

export async function listEvolutionInstances() {
  return evolutionFetch<
    Array<{ name?: string; instanceName?: string; connectionStatus?: string }>
  >("/instance/fetchInstances", { method: "GET" });
}
