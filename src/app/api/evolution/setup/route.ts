import { NextResponse } from "next/server";
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  getEvolutionConnectionState,
  probeEvolutionApi,
  setEvolutionWebhook,
} from "@/lib/whatsapp/evolution-client";
import {
  getEvolutionConfig,
  getEvolutionWebhookUrl,
  isUnreachableWebhookUrl,
} from "@/lib/whatsapp/evolution-config";

export async function POST(request: Request) {
  const { instance, isConfigured } = getEvolutionConfig();
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Evolution API no configurada en .env.local" },
      { status: 503 },
    );
  }

  const probe = await probeEvolutionApi();
  if (!probe.ok) {
    return NextResponse.json(
      {
        error: probe.error,
        hint: "Actualiza EVOLUTION_API_URL con tu dominio de Railway.",
      },
      { status: 502 },
    );
  }

  const webhookUrl = getEvolutionWebhookUrl(request);
  const webhookWarning = isUnreachableWebhookUrl(webhookUrl)
    ? "El webhook apunta a tu PC (localhost/host.docker.internal). Evolution en Railway no podrá enviar mensajes hasta que uses ngrok y NEXT_PUBLIC_APP_URL."
    : undefined;

  let created = await createEvolutionInstance(instance);
  if (!created.ok && created.status === 403) {
    created = { ok: true, data: {} };
  }
  if (!created.ok && created.error.toLowerCase().includes("already")) {
    created = { ok: true, data: {} };
  }

  const webhook = await setEvolutionWebhook(instance, webhookUrl);
  const connect = await connectEvolutionInstance(instance);
  const state = await getEvolutionConnectionState(instance);

  const connectionState =
    (state.ok ? state.data?.instance?.state : undefined) ??
    (state.ok ? state.data?.state : undefined) ??
    "unknown";

  const qrBase64 =
    (connect.ok ? connect.data?.base64 : undefined) ??
    (created.ok ? created.data?.qrcode?.base64 : undefined) ??
    null;

  const createError = created.ok ? undefined : created.error;
  const connectError = connect.ok ? undefined : connect.error;

  if (!qrBase64 && connectionState !== "open") {
    return NextResponse.json(
      {
        ok: false,
        instance,
        webhookUrl,
        webhookWarning,
        webhookConfigured: webhook.ok,
        webhookError: webhook.ok ? undefined : webhook.error,
        connectionState,
        createError,
        connectError,
        stateError: state.ok ? undefined : state.error,
        qrBase64: null,
        error:
          connectError ??
          createError ??
          "No se pudo generar el QR. Revisa EVOLUTION_API_URL y los logs de Railway.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    instance,
    webhookUrl,
    webhookWarning,
    webhookConfigured: webhook.ok,
    webhookError: webhook.ok ? undefined : webhook.error,
    connectionState,
    createError,
    connectError,
    qrBase64: qrBase64
      ? qrBase64.startsWith("data:")
        ? qrBase64
        : `data:image/png;base64,${qrBase64}`
      : null,
    pairingCode: connect.ok ? connect.data?.pairingCode : undefined,
  });
}

export async function GET(request: Request) {
  const { instance, isConfigured } = getEvolutionConfig();
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Evolution API no configurada." },
      { status: 503 },
    );
  }

  const probe = await probeEvolutionApi();
  if (!probe.ok) {
    return NextResponse.json({ error: probe.error }, { status: 502 });
  }

  const webhookUrl = getEvolutionWebhookUrl(request);

  const [connect, state] = await Promise.all([
    connectEvolutionInstance(instance),
    getEvolutionConnectionState(instance),
  ]);

  const qrBase64 = connect.ok && connect.data?.base64
    ? connect.data.base64.startsWith("data:")
      ? connect.data.base64
      : `data:image/png;base64,${connect.data.base64}`
    : null;

  return NextResponse.json({
    instance,
    webhookUrl,
    webhookWarning: isUnreachableWebhookUrl(webhookUrl)
      ? "Usa ngrok y NEXT_PUBLIC_APP_URL para que Railway pueda llamar al webhook."
      : undefined,
    connectionState:
      (state.ok ? state.data?.instance?.state : undefined) ??
      (state.ok ? state.data?.state : undefined) ??
      "unknown",
    qrBase64,
    pairingCode: connect.ok ? connect.data?.pairingCode : undefined,
    connectError: connect.ok ? undefined : connect.error,
  });
}
