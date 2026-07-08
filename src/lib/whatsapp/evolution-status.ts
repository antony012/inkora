import {
  getEvolutionConnectionState,
  listEvolutionInstances,
} from "./evolution-client";

export type EvolutionConnectionState = "open" | "connecting" | "close" | "unknown";

export type EvolutionInstanceRecord = {
  id?: string;
  name?: string;
  instanceName?: string;
  connectionStatus?: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  disconnectionReasonCode?: number | null;
  disconnectionObject?: string | null;
  disconnectionAt?: string | null;
};

export type EvolutionResolvedStatus = {
  instanceName: string;
  state: EvolutionConnectionState;
  connectionStatus?: string;
  displayStatus: string;
  statusDetail?: string;
  profileName?: string;
  phone?: string;
  isLive: boolean;
  needsQr: boolean;
  disconnectionReason?: string;
  disconnectionAt?: string;
  stateError?: string;
};

function parseDisconnectionReason(
  disconnectionObject?: string | null,
): string | undefined {
  if (!disconnectionObject) return undefined;
  try {
    const data = JSON.parse(disconnectionObject) as {
      error?: {
        data?: { tag?: string; attrs?: { type?: string } };
        output?: { payload?: { message?: string } };
      };
    };
    const type = data.error?.data?.attrs?.type ?? data.error?.data?.tag;
    const message = data.error?.output?.payload?.message;
    if (type === "device_removed") {
      return "WhatsApp eliminó el dispositivo vinculado.";
    }
    if (message) return message;
    if (type) return type;
  } catch {
    return disconnectionObject.slice(0, 120);
  }
  return undefined;
}

function normalizeState(value?: string | null): EvolutionConnectionState {
  if (value === "open" || value === "connecting" || value === "close") {
    return value;
  }
  return "unknown";
}

function formatPhone(ownerJid?: string | null) {
  if (!ownerJid) return undefined;
  const digits = ownerJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
  if (!digits) return undefined;
  return `+${digits}`;
}

export async function resolveEvolutionInstanceStatus(
  instanceName: string,
): Promise<EvolutionResolvedStatus> {
  const [stateRes, instancesRes] = await Promise.all([
    getEvolutionConnectionState(instanceName),
    listEvolutionInstances(),
  ]);

  let instanceRecord: EvolutionInstanceRecord | undefined;
  if (instancesRes.ok && Array.isArray(instancesRes.data)) {
    instanceRecord = instancesRes.data.find(
      (item) => (item.name ?? item.instanceName) === instanceName,
    );
  }

  const rawState = normalizeState(
    (stateRes.ok ? stateRes.data?.instance?.state : undefined) ??
      (stateRes.ok ? stateRes.data?.state : undefined) ??
      instanceRecord?.connectionStatus,
  );

  const disconnectionReason = parseDisconnectionReason(
    instanceRecord?.disconnectionObject,
  );
  const phone = formatPhone(instanceRecord?.ownerJid);
  const disconnectedAt = instanceRecord?.disconnectionAt ?? undefined;

  let displayStatus = "Estado desconocido";
  let statusDetail: string | undefined;
  let needsQr = false;
  let isLive = rawState === "open";

  if (rawState === "open") {
    displayStatus = "Conectado";
    statusDetail = instanceRecord?.profileName
      ? `Sesión activa como ${instanceRecord.profileName}.`
      : "WhatsApp listo para recibir y enviar mensajes.";
  } else if (
    disconnectionReason?.includes("dispositivo") ||
    instanceRecord?.disconnectionReasonCode === 401
  ) {
    displayStatus = "Sesión invalidada";
    statusDetail =
      "WhatsApp cerró la vinculación anterior (dispositivo eliminado o conflicto). Pulsa «Vincular con QR» y escanea de nuevo desde tu celular.";
    needsQr = true;
    isLive = false;
  } else if (rawState === "connecting") {
    displayStatus = "Pendiente de vincular";
    statusDetail =
      "Evolution está esperando que escanees el QR en WhatsApp → Dispositivos vinculados.";
    needsQr = true;
  } else if (rawState === "close") {
    displayStatus = "Desconectado";
    statusDetail = "No hay sesión activa. Vincula tu número con QR.";
    needsQr = true;
  } else if (disconnectionReason) {
    displayStatus = "Desconectado";
    statusDetail = disconnectionReason;
    needsQr = true;
  }

  return {
    instanceName,
    state: rawState,
    connectionStatus: instanceRecord?.connectionStatus,
    displayStatus,
    statusDetail,
    profileName: instanceRecord?.profileName ?? undefined,
    phone,
    isLive,
    needsQr,
    disconnectionReason,
    disconnectionAt: disconnectedAt,
    stateError: stateRes.ok ? undefined : stateRes.error,
  };
}
