"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Flame,
  ImageIcon,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  UserRound,
  Cpu,
  KeyRound,
  Zap,
} from "lucide-react";
import { useCarrizo } from "@/lib/store";
import { botKnowledgeSummary, CRM_REPLY_MODES } from "@/lib/bot-knowledge";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import {
  qualificationReady,
  referenceStatusLabel,
  temperatureMeta,
} from "@/lib/chat-bot";
import type { LeadTemperature, WhatsAppConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: Array<{
  id: "todos" | LeadTemperature | "referencias" | "en_vivo";
  label: string;
}> = [
  { id: "todos", label: "Todos" },
  { id: "en_vivo", label: "En vivo" },
  { id: "referencias", label: "Referencias" },
  { id: "listo", label: "Listos" },
  { id: "caliente", label: "Calientes" },
  { id: "tibio", label: "Tibios" },
  { id: "frio", label: "Fríos" },
  { id: "nuevo", label: "Nuevos" },
];

function avatarStyle(hue: number) {
  return {
    background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${
      (hue + 40) % 360
    } 65% 30%))`,
  };
}

function timeLabel(iso: string) {
  try {
    const date = parseISO(iso);
    const sameDay = new Date().toDateString() === date.toDateString();
    return sameDay ? format(date, "HH:mm") : format(date, "dd/MM");
  } catch {
    return "";
  }
}

function lastPreview(conv: WhatsAppConversation) {
  const last = conv.messages.at(-1);
  if (!last) return "Sin mensajes";
  return last.text;
}

export default function CrmPage() {
  const conversations = useCarrizo((s) => s.conversations);
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const sendClientMessage = useCarrizo((s) => s.sendClientMessage);
  const sendClientImage = useCarrizo((s) => s.sendClientImage);
  const sendArtistMessage = useCarrizo((s) => s.sendArtistMessage);
  const runBotReply = useCarrizo((s) => s.runBotReply);
  const toggleConversationBot = useCarrizo((s) => s.toggleConversationBot);
  const markConversationRead = useCarrizo((s) => s.markConversationRead);
  const reviewReference = useCarrizo((s) => s.reviewReference);
  const simulateIncomingLead = useCarrizo((s) => s.simulateIncomingLead);
  const convertConversationToRequest = useCarrizo(
    (s) => s.convertConversationToRequest,
  );
  const crmBotConfig = useCarrizo((s) => s.crmBotConfig);
  const setCrmBotConfig = useCarrizo((s) => s.setCrmBotConfig);
  const whatsappConnected = useCarrizo((s) => s.whatsappConnected);
  const syncWhatsAppFromServer = useCarrizo((s) => s.syncWhatsAppFromServer);

  const activeArtist = artists.find((a) => a.active) ?? artists[0];
  const artistName = activeArtist?.name ?? studio.name;

  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "todos" | LeadTemperature | "referencias" | "en_vivo"
  >("todos");
  const [artistDraft, setArtistDraft] = useState("");
  const [clientDraft, setClientDraft] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);
  const [botEngineStatus, setBotEngineStatus] = useState<{
    engine?: string;
    geminiModel?: string;
    geminiError?: string;
  } | null>(null);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [waStatus, setWaStatus] = useState<{
    provider?: string;
    configured?: boolean;
    displayPhone?: string;
    webhookUrl?: string;
    evolution?: {
      connectionState?: string;
      connectionStatus?: string;
      displayStatus?: string;
      statusDetail?: string;
      profileName?: string;
      phone?: string;
      isLive?: boolean;
      needsQr?: boolean;
      disconnectionReason?: string;
      instance?: string;
      apiUrl?: string;
    };
    geminiConfigured?: boolean;
    conversationCount?: number;
  } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [evoQr, setEvoQr] = useState<string | null>(null);
  const [evoConnecting, setEvoConnecting] = useState(false);
  const [evoSetupError, setEvoSetupError] = useState<string | null>(null);
  const [evoWebhookWarning, setEvoWebhookWarning] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waAutoFocused = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setApiKeyDraft(crmBotConfig.geminiApiKey);
  }, [crmBotConfig.geminiApiKey]);

  const ordered = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      ),
    [conversations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ordered.filter((c) => {
      if (filter === "en_vivo" && c.source !== "whatsapp") return false;
      if (filter === "referencias" && c.referenceStatus !== "pendiente") {
        return false;
      }
      if (
        filter !== "todos" &&
        filter !== "referencias" &&
        filter !== "en_vivo" &&
        c.temperature !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.contactName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [ordered, filter, search]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  useEffect(() => {
    if (!selectedId && ordered.length > 0) setSelectedId(ordered[0].id);
  }, [ordered, selectedId]);

  useEffect(() => {
    if (selected && selected.unread > 0) markConversationRead(selected.id);
  }, [selected, markConversationRead]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selected?.messages.length, botTyping]);

  useEffect(() => {
    setConvertMsg(null);
    setClientDraft("");
    setArtistDraft("");
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, []);

  const totals = useMemo(() => {
    const unread = conversations.reduce((acc, c) => acc + c.unread, 0);
    const hot = conversations.filter(
      (c) => c.temperature === "caliente" || c.temperature === "listo",
    ).length;
    const pendingReferences = conversations.filter(
      (c) => c.referenceStatus === "pendiente",
    ).length;
    return { unread, hot, total: conversations.length, pendingReferences };
  }, [conversations]);

  const triggerBot = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv?.source === "whatsapp") return;
    if (botTimer.current) clearTimeout(botTimer.current);
    setBotTyping(true);
    const delay = 1400 + Math.random() * 1600;
    botTimer.current = setTimeout(() => {
      void runBotReply(conversationId)
        .then((meta) => {
          if (meta) setBotEngineStatus(meta);
        })
        .finally(() => setBotTyping(false));
    }, delay);
  };

  const onArtistSend = () => {
    if (!selected || !artistDraft.trim()) return;
    void sendArtistMessage(selected.id, artistDraft);
    setArtistDraft("");
  };

  const onClientImage = () => {
    if (!selected) return;
    const id = selected.id;
    const botEnabled = selected.botEnabled;
    sendClientImage(id);
    if (botEnabled) triggerBot(id);
  };

  const onApproveReference = () => {
    if (!selected) return;
    reviewReference(selected.id, "aprobada");
  };

  const onRejectReference = () => {
    if (!selected) return;
    reviewReference(selected.id, "rechazada");
  };

  const onClientSend = () => {
    if (!selected || !clientDraft.trim()) return;
    const id = selected.id;
    const botEnabled = selected.botEnabled;
    sendClientMessage(id, clientDraft);
    setClientDraft("");
    if (botEnabled) triggerBot(id);
  };

  const onSimulateLead = () => {
    const id = simulateIncomingLead();
    setSelectedId(id);
    setFilter("todos");
    triggerBot(id);
  };

  const connectEvolution = async () => {
    setEvoConnecting(true);
    setEvoSetupError(null);
    setEvoWebhookWarning(null);
    try {
      const res = await fetch("/api/evolution/setup", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        qrBase64?: string | null;
        connectionState?: string;
        webhookError?: string;
        webhookWarning?: string;
        connectError?: string;
        createError?: string;
      };

      if (data.webhookWarning) setEvoWebhookWarning(data.webhookWarning);

      if (!res.ok || data.ok === false) {
        setEvoQr(null);
        setEvoSetupError(
          data.error ??
            data.connectError ??
            data.createError ??
            data.hint ??
            "No se pudo generar el QR.",
        );
        return;
      }

      if (data.qrBase64) {
        setEvoQr(data.qrBase64);
      } else if (data.connectionState === "open") {
        setEvoQr(null);
        setEvoSetupError(null);
      } else {
        setEvoSetupError(
          "Evolution no devolvió QR. Prueba de nuevo o revisa los logs en Railway.",
        );
      }

      const statusRes = await fetch("/api/whatsapp/status");
      if (statusRes.ok) setWaStatus(await statusRes.json());
      await syncWhatsAppFromServer();
    } catch (error) {
      console.error("Evolution setup failed", error);
      setEvoSetupError("Error de red al conectar con Evolution.");
    } finally {
      setEvoConnecting(false);
    }
  };

  const refreshWaStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
        if (data.provider === "evolution" && data.evolution?.isLive) {
          setEvoQr(null);
          setEvoSetupError(null);
          return;
        }
        if (data.provider === "evolution" && data.evolution?.needsQr) {
          const qrRes = await fetch("/api/evolution/setup");
          if (qrRes.ok) {
            const qrData = (await qrRes.json()) as { qrBase64?: string | null };
            if (qrData.qrBase64) setEvoQr(qrData.qrBase64);
          }
        }
      }
    } catch {
      setWaStatus(null);
    }
  };

  const onConvert = () => {
    if (!selected) return;
    const result = convertConversationToRequest(selected.id);
    setConvertMsg(
      result.ok
        ? "Solicitud creada en el pipeline ✓"
        : result.error ?? "No se pudo convertir.",
    );
  };

  const waLive =
    waStatus?.evolution?.isLive === true ||
    waStatus?.evolution?.connectionState === "open";

  useEffect(() => {
    const load = async () => {
      await syncWhatsAppFromServer();
      await refreshWaStatus();
    };
    void load();
    const syncTimer = setInterval(() => void syncWhatsAppFromServer(), 4000);
    const statusTimer = setInterval(() => void refreshWaStatus(), 8000);
    return () => {
      clearInterval(syncTimer);
      clearInterval(statusTimer);
    };
  }, [syncWhatsAppFromServer]);

  const waConversationCount = useMemo(
    () => conversations.filter((c) => c.source === "whatsapp").length,
    [conversations],
  );

  useEffect(() => {
    const live = conversations.filter((c) => c.source === "whatsapp");
    if (live.length === 0) return;

    if (!waAutoFocused.current) {
      setFilter("en_vivo");
      setSelectedId(live[0].id);
      waAutoFocused.current = true;
      return;
    }

    const selected = conversations.find((c) => c.id === selectedId);
    if (selected?.source !== "whatsapp") {
      const withUnread = live.find((c) => c.unread > 0) ?? live[0];
      setSelectedId(withUnread.id);
    }
  }, [conversations, selectedId]);

  if (!mounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[var(--text-muted)]">
        Cargando bandeja...
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <MessageCircle className="text-[var(--accent-glow)]" size={22} />
            CRM de WhatsApp
          </h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Tus conversaciones en un solo lugar. Las respuestas automáticas suenan
            como vos y filtran los leads listos para cerrar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 text-center">
            <div className="rounded-xl border border-[var(--border)] bg-[#0d0d10] px-3 py-2">
              <p className="text-lg font-semibold">{totals.total}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
                Chats
              </p>
            </div>
            <div className="rounded-xl border border-[#f9731644] bg-[#f9731611] px-3 py-2">
              <p className="text-lg font-semibold text-[var(--accent-glow)]">
                {totals.hot}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
                Calientes
              </p>
            </div>
          </div>
          <button
            onClick={onSimulateLead}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <Plus size={15} />
            Simular lead
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[#0d0d10] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={15} className="text-[var(--accent-glow)]" />
              Motor de respuestas
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Bot entrenado con el perfil de {artistName}: precios, flash, proceso
              y apartado del {studio.depositPercent}%.
            </p>
            {activeArtist ? (
              <p className="mt-1 text-[10px] text-[var(--text-dim)]">
                {botKnowledgeSummary(activeArtist, studio)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowBotConfig((v) => !v)}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-dim)] hover:bg-white/5"
          >
            {showBotConfig ? "Ocultar API" : "Configurar Gemini"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CRM_REPLY_MODES.map((mode) => {
            const active = crmBotConfig.replyMode === mode.id;
            const Icon =
              mode.id === "rules" ? Cpu : mode.id === "gemini" ? Sparkles : Bot;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCrmBotConfig({ replyMode: mode.id })}
                className={cn(
                  "flex min-w-[140px] flex-1 flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors sm:max-w-[220px]",
                  active
                    ? "border-[#f9731644] bg-[#f9731618] text-[var(--accent-glow)]"
                    : "border-[var(--border)] bg-[#111114] text-[var(--text-dim)] hover:bg-white/5",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <Icon size={14} />
                  {mode.label}
                </span>
                <span className="mt-1 text-[10px] leading-snug opacity-80">
                  {mode.description}
                </span>
              </button>
            );
          })}
        </div>

        {showBotConfig ? (
          <div className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 flex items-center gap-1.5 text-[var(--text-dim)]">
                <KeyRound size={12} />
                API key de Gemini (cualquier cuenta)
              </span>
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                onBlur={() => setCrmBotConfig({ geminiApiKey: apiKeyDraft.trim() })}
                placeholder="Pega tu key de Google AI Studio"
                className="input py-2 text-sm"
              />
              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                Si queda vacío, usa GEMINI_API_KEY de .env.local
              </span>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-[var(--text-dim)]">Modelo</span>
              <select
                value={crmBotConfig.geminiModel}
                onChange={(e) => setCrmBotConfig({ geminiModel: e.target.value })}
                className="input py-2 text-sm"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (recomendado)</option>
                <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
              </select>
              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                Educación del bot: config/enderxon-gemini-education.md
              </span>
            </label>
          </div>
        ) : null}
      </div>

      {waConversationCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#34d39944] bg-[#34d39911] px-4 py-2 text-sm">
          <span>
            <strong className="text-[#6ee7b7]">{waConversationCount}</strong>{" "}
            chat{waConversationCount === 1 ? "" : "s"} de WhatsApp en vivo
            {filter !== "en_vivo" ? " — usa el filtro «En vivo»" : ""}
          </span>
          {filter !== "en_vivo" ? (
            <button
              type="button"
              onClick={() => setFilter("en_vivo")}
              className="btn-secondary px-3 py-1 text-xs"
            >
              Ver en vivo
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-xl border p-4",
          waStatus?.configured
            ? "border-[#34d39944] bg-[#34d39911]"
            : "border-[#fbbf2444] bg-[#fbbf2411]",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              {waStatus?.configured ? (
                <CheckCircle2 size={16} className="text-[#6ee7b7]" />
              ) : (
                <AlertCircle size={16} className="text-[#fcd34d]" />
              )}
              WhatsApp {waStatus?.provider === "evolution" ? "(Evolution)" : ""}
              {waLive ? (
                <span className="rounded-full bg-[#34d39922] px-2 py-0.5 text-[10px] font-semibold text-[#6ee7b7]">
                  En vivo
                </span>
              ) : null}
              {waStatus?.geminiConfigured ? (
                <span className="rounded-full bg-[#f9731622] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-glow)]">
                  Gemini
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {waStatus?.provider === "evolution"
                ? waStatus.evolution?.isLive
                  ? `WhatsApp conectado${waStatus.evolution.profileName ? ` como ${waStatus.evolution.profileName}` : ""}. El bot usa Gemini + perfil de Enderxon.`
                  : waStatus.evolution?.statusDetail ??
                    "Evolution API: escanea el QR con tu WhatsApp para vincular tu número (sin Facebook)."
                : waStatus?.configured
                  ? `Número vinculado${waStatus.displayPhone ? `: ${waStatus.displayPhone}` : ""}.`
                  : "Configura Evolution (recomendado) o Meta WhatsApp API en .env.local."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {waStatus?.provider === "evolution" ? (
              <button
                type="button"
                onClick={() => void connectEvolution()}
                disabled={evoConnecting}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                {evoConnecting ? "Conectando..." : "Vincular con QR"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void syncWhatsAppFromServer();
                void refreshWaStatus();
              }}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Sincronizar
            </button>
          </div>
        </div>

        {waStatus?.provider === "evolution" ? (
          <div className="mt-3 space-y-3 text-xs text-[var(--text-muted)]">
            {waStatus.evolution?.displayStatus ? (
              <p>
                Estado:{" "}
                <strong
                  className={cn(
                    waStatus.evolution.isLive
                      ? "text-[#6ee7b7]"
                      : waStatus.evolution.disconnectionReason
                        ? "text-[#fca5a5]"
                        : "text-[#fcd34d]",
                  )}
                >
                  {waStatus.evolution.displayStatus}
                </strong>
                {waStatus.evolution.instance
                  ? ` · instancia ${waStatus.evolution.instance}`
                  : ""}
                {waStatus.evolution.phone ? ` · ${waStatus.evolution.phone}` : ""}
              </p>
            ) : null}
            {waStatus.evolution?.statusDetail && !waStatus.evolution.isLive ? (
              <p className="rounded-lg border border-[#fbbf2444] bg-[#fbbf2411] px-3 py-2 text-[#fcd34d]">
                {waStatus.evolution.statusDetail}
              </p>
            ) : null}
            {evoSetupError ? (
              <p className="rounded-lg border border-[#f8717144] bg-[#f8717111] px-3 py-2 text-[#fca5a5]">
                {evoSetupError}
                {waStatus.evolution?.apiUrl?.includes("localhost") ? (
                  <>
                    {" "}
                    Tu <code className="text-[10px]">EVOLUTION_API_URL</code> apunta a
                    localhost; usa la URL de Railway en <code className="text-[10px]">.env.local</code>{" "}
                    y reinicia <code className="text-[10px]">npm run dev</code>.
                  </>
                ) : null}
              </p>
            ) : null}
            {evoQr && !waStatus.evolution?.isLive ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-3 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={evoQr}
                  alt="QR WhatsApp Evolution"
                  className="h-44 w-44 rounded-lg"
                />
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Abre WhatsApp en tu celular</li>
                  <li>Dispositivos vinculados → Vincular dispositivo</li>
                  <li>Escanea este QR</li>
                  <li>Escribe desde otro número y mira el CRM</li>
                </ol>
              </div>
            ) : null}
            {evoWebhookWarning ? (
              <p className="rounded-lg border border-[#fbbf2444] bg-[#fbbf2411] px-3 py-2 text-[#fcd34d]">
                {evoWebhookWarning} Ejecuta <code className="text-[10px]">ngrok http 3000</code> y
                pon esa URL en <code className="text-[10px]">NEXT_PUBLIC_APP_URL</code>.
              </p>
            ) : null}
            <p className="text-[10px] text-[#fbbf24]">
              Uso no oficial vía QR: solo para pruebas. Riesgo de restricción en
              cuentas comerciales con alto volumen.
            </p>
            <code className="block truncate rounded-lg bg-black/30 px-3 py-2 text-[var(--text-dim)]">
              Webhook: {waStatus.webhookUrl}
            </code>
          </div>
        ) : waStatus?.configured ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <code className="flex-1 truncate rounded-lg bg-black/30 px-3 py-2 text-[var(--text-dim)]">
              {waStatus.webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => {
                if (!waStatus.webhookUrl) return;
                void navigator.clipboard.writeText(waStatus.webhookUrl);
                setCopiedWebhook(true);
                setTimeout(() => setCopiedWebhook(false), 2000);
              }}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2"
            >
              {copiedWebhook ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              {copiedWebhook ? "Copiado" : "Copiar webhook"}
            </button>
          </div>
        ) : (
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-[var(--text-muted)]">
            <li>
              <strong>Evolution (sin Facebook):</strong>{" "}
              <code className="text-[var(--text-dim)]">docker compose up -d</code>{" "}
              en la carpeta del proyecto.
            </li>
            <li>
              En <code className="text-[var(--text-dim)]">.env.local</code> pon{" "}
              <code>WHATSAPP_PROVIDER=evolution</code>,{" "}
              <code>EVOLUTION_API_KEY</code> y reinicia <code>npm run dev</code>.
            </li>
            <li>
              Pulsa <strong>Vincular con QR</strong> y escanea desde tu WhatsApp.
            </li>
            <li>
              El bot responde con <strong>Gemini</strong> (mismo motor del CRM).
            </li>
            <li className="text-[var(--text-dim)]">
              Alternativa oficial: Meta Developers + WHATSAPP_PROVIDER=meta
            </li>
          </ol>
        )}

        {waStatus?.webhookUrl && !waStatus.configured ? (
          <code className="mt-3 block truncate rounded-lg bg-black/30 px-3 py-2 text-xs text-[var(--text-dim)]">
            Webhook: {waStatus.webhookUrl}
          </code>
        ) : null}
      </div>

      {totals.pendingReferences > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fbbf2444] bg-[#fbbf2414] px-4 py-3 text-sm">
          <p className="text-[#fcd34d]">
            Tienes {totals.pendingReferences} foto
            {totals.pendingReferences === 1 ? "" : "s"} de referencia por revisar.
          </p>
          <button
            type="button"
            onClick={() => setFilter("referencias")}
            className="rounded-full border border-[#fbbf2444] px-3 py-1 text-xs font-semibold text-[#fcd34d] hover:bg-[#fbbf2422]"
          >
            Ver referencias
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr_300px]">
        {/* Lista de conversaciones */}
        <div className="card flex max-h-[74vh] flex-col overflow-hidden">
          <div className="border-b border-[var(--border)] p-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contacto..."
                className="input pl-9 py-2 text-sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-colors",
                    filter === f.id
                      ? "bg-[#f9731622] text-[var(--accent-glow)]"
                      : "text-[var(--text-dim)] hover:bg-white/5",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--text-muted)]">
                {filter === "en_vivo" && waConversationCount === 0
                  ? "Aún no hay chats de WhatsApp en vivo. Cuando llegue un mensaje, aparecerá aquí con badge WA."
                  : filter === "en_vivo"
                    ? "Ningún chat coincide con este filtro. Prueba «Todos»."
                    : "Sin conversaciones."}
              </p>
            ) : (
              filtered.map((conv) => {
                const meta = temperatureMeta(conv.temperature);
                const active = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-[var(--border)] p-3 text-left transition-colors",
                      active ? "bg-[#f9731614]" : "hover:bg-white/5",
                    )}
                  >
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={avatarStyle(conv.avatarHue)}
                    >
                      {conv.contactName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {conv.contactName}
                        </span>
                        <span className="flex-shrink-0 text-[10px] text-[var(--text-dim)]">
                          {timeLabel(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)]">
                        {lastPreview(conv)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: `${meta.dot}22`,
                            color: meta.dot,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: meta.dot }}
                          />
                          {meta.label}
                        </span>
                        {conv.referenceStatus === "pendiente" ? (
                          <span className="rounded-full bg-[#fbbf2422] px-1.5 py-0.5 text-[10px] font-bold text-[#fcd34d]">
                            foto
                          </span>
                        ) : null}
                        {conv.source === "whatsapp" ? (
                          <span className="rounded-full bg-[#34d39922] px-1.5 py-0.5 text-[10px] font-bold text-[#6ee7b7]">
                            WA
                          </span>
                        ) : null}
                        {conv.unread > 0 ? (
                          <span className="ml-auto rounded-full bg-[#34d399] px-1.5 py-0.5 text-[10px] font-bold text-black">
                            {conv.unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Hilo de chat */}
        {selected ? (
          <div className="card flex max-h-[74vh] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={avatarStyle(selected.avatarHue)}
                >
                  {selected.contactName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{selected.contactName}</p>
                  <p className="text-xs text-[var(--text-dim)]">
                    {selected.phone}
                    {selected.botEnabled ? (
                      <span className="text-[var(--text-muted)]">
                        {" "}
                        · {artistName}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => toggleConversationBot(selected.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    selected.botEnabled
                      ? "bg-[#34d39922] text-[#6ee7b7]"
                      : "bg-white/5 text-[var(--text-dim)]",
                  )}
                >
                  <Bot size={14} />
                  {selected.botEnabled ? "Responde automáticamente" : "Respondes tú"}
                </button>
                {selected.botEnabled && botEngineStatus ? (
                  <span
                    className={cn(
                      "max-w-[200px] text-right text-[10px] font-medium leading-snug",
                      botEngineStatus.engine === "gemini"
                        ? "text-[#6ee7b7]"
                        : botEngineStatus.engine === "gemini-fallback"
                          ? "text-[#fbbf24]"
                          : "text-[var(--text-muted)]",
                    )}
                  >
                    {botEngineStatus.engine === "gemini"
                      ? `Gemini · ${botEngineStatus.geminiModel ?? crmBotConfig.geminiModel}`
                      : botEngineStatus.engine === "gemini-fallback"
                        ? crmBotConfig.replyMode === "gemini"
                          ? "Gemini falló · revisa API key"
                          : "Gemini falló · respuesta local"
                        : "Motor local"}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              ref={threadRef}
              className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-[#0a0a0c] p-4"
            >
              {selected.messages.map((m) => {
                const mine = m.author !== "cliente";
                const fromArtist = m.author === "artista" || m.author === "bot";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow",
                        m.author === "cliente" &&
                          "rounded-bl-sm bg-[#1c1c22] text-[var(--text)]",
                        fromArtist &&
                          "rounded-br-sm bg-[#e85d04] text-white",
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {m.text}
                      </p>
                      {m.hasImage ? (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/20 bg-black/15 px-3 py-2 text-xs">
                          <ImageIcon size={14} />
                          Foto de referencia
                        </div>
                      ) : null}
                      {m.quotePrice ? (
                        <span className="mt-1 inline-block rounded-md bg-black/25 px-2 py-0.5 text-xs font-semibold">
                          ~ {formatMoney(m.quotePrice)}
                        </span>
                      ) : null}
                      <span className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
                        {timeLabel(m.createdAt)}
                        {mine ? <CheckCheck size={12} /> : null}
                      </span>
                    </div>
                  </div>
                );
              })}
              {botTyping ? (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-[#e85d04] px-4 py-2.5 text-sm text-white">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80" />
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Responder como artista */}
            <div className="border-t border-[var(--border)] p-3">
              <div className="flex items-center gap-2">
                <input
                  value={artistDraft}
                  onChange={(e) => setArtistDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onArtistSend()}
                  placeholder={`Responder como ${artistName}...`}
                  className="input py-2.5 text-sm"
                />
                <button
                  onClick={onArtistSend}
                  disabled={!artistDraft.trim()}
                  className="btn-primary flex-shrink-0 rounded-full p-2.5 disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>
              {selected?.source === "whatsapp" ? (
                <p className="mt-2 text-[10px] text-[#6ee7b7]">
                  Conversación real de WhatsApp — el bot responde automáticamente en el
                  número vinculado.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={clientDraft}
                    onChange={(e) => setClientDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onClientSend()}
                    placeholder="Simular mensaje del cliente..."
                    className="input min-w-0 flex-1 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={onClientImage}
                    className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                    title="Simular envío de foto"
                  >
                    <ImageIcon size={13} />
                    Foto
                  </button>
                  <button
                    type="button"
                    onClick={onClientSend}
                    disabled={!clientDraft.trim()}
                    className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-40"
                  >
                    <Zap size={13} />
                    Enviar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-[var(--text-muted)]">
            Elegí una conversación
          </div>
        )}

        {/* Panel del lead */}
        {selected ? (
          <div className="card flex max-h-[74vh] flex-col overflow-y-auto scrollbar-thin p-4">
            <LeadPanel
              conv={selected}
              depositPercent={studio.depositPercent}
              onConvert={onConvert}
              onApproveReference={onApproveReference}
              onRejectReference={onRejectReference}
              convertMsg={convertMsg}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeadPanel({
  conv,
  depositPercent,
  onConvert,
  onApproveReference,
  onRejectReference,
  convertMsg,
}: {
  conv: WhatsAppConversation;
  depositPercent: number;
  onConvert: () => void;
  onApproveReference: () => void;
  onRejectReference: () => void;
  convertMsg: string | null;
}) {
  const meta = temperatureMeta(conv.temperature);
  const q = conv.qualification;
  const ready = qualificationReady(q);
  const waLink = `https://wa.me/${conv.phone.replace(/\D/g, "")}`;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Estilo", value: q.style ? styleLabel(q.style) : "—" },
    { label: "Zona", value: q.zone ?? "—" },
    { label: "Tamaño", value: q.size ?? "—" },
    { label: "Presupuesto", value: q.budget ? formatMoney(q.budget) : "—" },
    {
      label: "Referencia",
      value: referenceStatusLabel(conv.referenceStatus),
    },
    { label: "Intención", value: q.intent },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
          Estado del lead
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: `${meta.dot}22`, color: meta.dot }}
          >
            <Flame size={14} />
            {meta.label}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Score de venta</span>
            <span className="font-semibold text-[var(--text)]">
              {conv.score}/100
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#0d0d10]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${conv.score}%`,
                background: meta.dot,
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[#0d0d10] p-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-dim)]">
          Calificación
        </p>
        <dl className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <dt className="text-[var(--text-muted)]">{row.label}</dt>
              <dd className="font-medium capitalize">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {conv.referenceStatus === "pendiente" ? (
        <div className="rounded-xl border border-[#fbbf2444] bg-[#fbbf2410] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#fcd34d]">
            Referencia por revisar
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            El cliente envió una foto. Revísala y aprueba o pide otra referencia.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onApproveReference}
              className="btn-primary flex-1 px-3 py-2 text-xs"
            >
              Aprobar diseño
            </button>
            <button
              type="button"
              onClick={onRejectReference}
              className="btn-secondary flex-1 px-3 py-2 text-xs"
            >
              Pedir cambio
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] bg-[#0d0d10] p-3 text-sm text-[var(--text-muted)]">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
          Apartar cupo
        </p>
        <p className="mt-1">
          El cliente aparta con el <strong className="text-[var(--text)]">{depositPercent}%</strong> del
          valor del tatuaje. El saldo se paga el día de la sesión.
        </p>
      </div>

      {conv.tags.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-[var(--text-dim)]">
            Etiquetas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conv.tags.map((tag) => (
              <span key={tag} className="badge badge-gray capitalize">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm"
        >
          <Phone size={15} />
          Abrir en WhatsApp
        </a>

        {conv.convertedAppointmentId ? (
          <Link
            href="/dashboard/solicitudes"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#34d39944] bg-[#34d39914] px-3 py-2.5 text-sm font-semibold text-[#6ee7b7]"
          >
            <Check size={15} />
            Ver en solicitudes
          </Link>
        ) : (
          <button
            onClick={onConvert}
            disabled={!ready}
            className="btn-primary flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm disabled:opacity-40"
          >
            <Sparkles size={15} />
            Convertir en solicitud
          </button>
        )}

        {!ready && !conv.convertedAppointmentId ? (
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
            <UserRound size={12} />
            Faltan datos (estilo, zona o tamaño) para convertir.
          </p>
        ) : null}

        {convertMsg ? (
          <p className="text-xs text-[var(--text-muted)]">{convertMsg}</p>
        ) : null}
      </div>
    </div>
  );
}
