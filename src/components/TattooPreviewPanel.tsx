"use client";

import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Download,
  ImageIcon,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { trackMarketingEvent, trackPageView } from "@/lib/analytics";
import {
  BODY_ZONE_OPTIONS,
  MAX_PREVIEW_IMAGE_BYTES,
  bodyZoneLabel,
} from "@/lib/tattoo-preview";
import { buildLocalTattooPreview } from "@/lib/tattoo-preview-fallback.client";
import type { BodyZone } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function TattooPreviewPanel() {
  const [step, setStep] = useState<Step>(1);
  const [zone, setZone] = useState<BodyZone>("antebrazo");
  const [bodyImage, setBodyImage] = useState("");
  const [bodyFileName, setBodyFileName] = useState("");
  const [designImage, setDesignImage] = useState("");
  const [designFileName, setDesignFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [description, setDescription] = useState("");
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState<"preview" | "before" | "design">(
    "preview",
  );

  const selectedZone = useMemo(
    () => BODY_ZONE_OPTIONS.find((item) => item.id === zone),
    [zone],
  );

  useEffect(() => {
    trackPageView("tattoo_preview");
  }, []);

  const onUpload = async (file: File | null, kind: "body" | "design") => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_PREVIEW_IMAGE_BYTES) {
      setError("Cada imagen debe pesar menos de 4.5 MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    if (kind === "body") {
      setBodyImage(dataUrl);
      setBodyFileName(file.name);
    } else {
      setDesignImage(dataUrl);
      setDesignFileName(file.name);
    }
  };

  const applyLocalFallback = async () => {
    const localPreview = await buildLocalTattooPreview(
      bodyImage,
      designImage,
      zone,
    );
    setPreviewImage(localPreview);
    setUsedLocalFallback(true);
    setDescription(
      "Vista aproximada sin IA: el diseño se integra sobre la foto como referencia de ubicación. Configura Pollinations (gratis) para resultados fotorrealistas.",
    );
    setStep(4);
  };

  const onGenerate = async () => {
    setLoading(true);
    setError("");
    setPreviewImage("");
    setDescription("");
    setUsedLocalFallback(false);
    setProviderLabel("");
    try {
      trackMarketingEvent("InitiateCheckout", {
        source: "tattoo_preview",
        metadata: { zone, step: "generate" },
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 110_000);

      let res: Response;
      try {
        res = await fetch("/api/tattoo-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone,
            bodyImage,
            designImage,
            notes,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const data = (await res.json()) as {
        ok?: boolean;
        previewImage?: string;
        description?: string;
        error?: string;
        code?: string;
        fallbackSuggested?: boolean;
        provider?: string;
        model?: string;
      };

      if (!res.ok || !data.previewImage) {
        if (res.status === 400) {
          setError(data.error ?? "Revisa las imágenes e inténtalo de nuevo.");
          return;
        }
        setError(
          data.error ??
            "Sin cuota de IA disponible. Mostrando una aproximación local.",
        );
        await applyLocalFallback();
        return;
      }

      setPreviewImage(data.previewImage);
      setDescription(data.description ?? "");
      setProviderLabel(
        data.provider === "pollinations"
          ? `Pollinations · ${data.model ?? "nanobanana"}`
          : data.provider === "gemini"
            ? `Gemini · ${data.model ?? "imagen"}`
            : "IA",
      );
      setUsedLocalFallback(false);
      setStep(4);
      trackMarketingEvent("ViewContent", {
        source: "tattoo_preview",
        metadata: { zone, generated: true },
      });
    } catch {
      setError(
        "No se pudo contactar el servicio de IA (tiempo agotado o red). Mostrando una aproximación local.",
      );
      try {
        await applyLocalFallback();
      } catch {
        setError("No se pudo generar ni la vista aproximada local.");
      }
    } finally {
      setLoading(false);
    }
  };

  const compareSrc =
    compareMode === "before"
      ? bodyImage
      : compareMode === "design"
        ? designImage
        : previewImage;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="badge badge-gold">
            <Sparkles size={12} /> Herramienta interna
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Preview IA</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
          Sube la zona del cuerpo y el diseño. La edición fotorrealista usa Pollen en
          Pollinations. Si el panel muestra créditos pero la API responde saldo 0,
          completa y <strong>reclama</strong> las misiones de imagen y audio en{" "}
          <a
            href="https://enter.pollinations.ai"
            target="_blank"
            rel="noreferrer"
            className="text-[#6ee7b7] underline"
          >
            enter.pollinations.ai
          </a>
          . Sin saldo, se muestra la vista aproximada local.
        </p>
      </div>

      <section className="card overflow-hidden p-6 sm:p-8">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
          Sube la zona del cuerpo y el diseño. Usa{" "}
          <a
            href="https://enter.pollinations.ai"
            target="_blank"
            rel="noreferrer"
            className="text-[#6ee7b7] underline"
          >
            Pollinations
          </a>{" "}
          (cuenta gratis + créditos semanales) o Gemini como respaldo. Si no hay
          cuota, puedes usar la aproximación local.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          <StepPill active={step === 1} done={step > 1} label="1. Zona" />
          <StepPill active={step === 2} done={step > 2} label="2. Foto" />
          <StepPill active={step === 3} done={step > 3} label="3. Diseño" />
          <StepPill active={step === 4} done={step === 4} label="4. Preview" />
        </div>

        {step === 1 ? (
          <div className="mt-8 space-y-4">
            <h2 className="font-medium">Zona del cuerpo</h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BODY_ZONE_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setZone(item.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    zone === item.id
                      ? "border-[#6ee7b7] bg-[#6ee7b722]"
                      : "border-[var(--border)] bg-[#0d0d10] hover:border-[#f9731666]"
                  }`}
                >
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.hint}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              >
                Continuar
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-8 space-y-4">
            <h2 className="font-medium">
              Foto del {bodyZoneLabel(zone).toLowerCase()}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {selectedZone?.hint} Buena luz y encuadre cercano mejoran el
              resultado.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="card-hover flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[var(--border)] bg-[#0d0d10] p-6">
                <Camera className="text-[#6ee7b7]" />
                <span className="text-sm font-medium">Subir foto del cuerpo</span>
                <span className="text-xs text-[var(--text-dim)]">
                  JPG, PNG o WebP · máx. 4.5 MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    void onUpload(event.target.files?.[0] ?? null, "body")
                  }
                />
              </label>

              {bodyImage ? (
                <div className="relative min-h-56 overflow-hidden rounded-2xl border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bodyImage}
                    alt="Foto del cuerpo"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--border)] bg-[#0d0d10] text-sm text-[var(--text-muted)]">
                  Vista previa de la foto
                </div>
              )}
            </div>

            {bodyFileName ? (
              <p className="text-xs text-[var(--text-dim)]">Archivo: {bodyFileName}</p>
            ) : null}

            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary px-4 py-2"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={!bodyImage}
                onClick={() => setStep(3)}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-40"
              >
                Continuar
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-8 space-y-4">
            <h2 className="font-medium">Diseño del tatuaje</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Boceto, referencia o flash del estudio.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="card-hover flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[var(--border)] bg-[#0d0d10] p-6">
                <ImagePlus className="text-[#f97316]" />
                <span className="text-sm font-medium">Subir diseño</span>
                <span className="text-xs text-[var(--text-dim)]">
                  Fondo transparente opcional
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    void onUpload(event.target.files?.[0] ?? null, "design")
                  }
                />
              </label>

              {designImage ? (
                <div className="relative min-h-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0d0d10]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={designImage}
                    alt="Diseño del tatuaje"
                    className="h-full w-full object-contain p-4"
                  />
                </div>
              ) : (
                <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--border)] bg-[#0d0d10] text-sm text-[var(--text-muted)]">
                  Vista previa del diseño
                </div>
              )}
            </div>

            {designFileName ? (
              <p className="text-xs text-[var(--text-dim)]">Archivo: {designFileName}</p>
            ) : null}

            <div>
              <label className="label">Notas opcionales para la IA</label>
              <textarea
                className="input min-h-20"
                placeholder="Ej: más chico, un poco más arriba del codo, orientación vertical..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {error ? (
              <div className="space-y-3">
                <p className="rounded-xl border border-[#f8717144] bg-[#f8717111] p-3 text-sm text-[#fca5a5]">
                  {error}
                  {error.includes("cuota") ||
                  error.includes("Cuota") ||
                  error.includes("Pollinations") ? (
                    <>
                      {" "}
                      <a
                        href="https://enter.pollinations.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Obtener clave gratis en Pollinations
                      </a>
                    </>
                  ) : null}
                </p>
                {!loading ? (
                  <button
                    type="button"
                    onClick={() => void applyLocalFallback()}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Usar vista aproximada local
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary px-4 py-2"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={!designImage || loading}
                onClick={() => void onGenerate()}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                      Generando preview con IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generar previsualización
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 && previewImage ? (
          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {usedLocalFallback ? (
                <span className="badge badge-gold">Aproximación local</span>
              ) : providerLabel ? (
                <span className="badge badge-green">{providerLabel}</span>
              ) : null}
              <ToggleButton
                active={compareMode === "before"}
                onClick={() => setCompareMode("before")}
              >
                Foto original
              </ToggleButton>
              <ToggleButton
                active={compareMode === "design"}
                onClick={() => setCompareMode("design")}
              >
                Diseño
              </ToggleButton>
              <ToggleButton
                active={compareMode === "preview"}
                onClick={() => setCompareMode("preview")}
              >
                Con tatuaje
              </ToggleButton>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0d0d10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compareSrc}
                alt="Previsualización del tatuaje"
                className="h-full w-full object-contain"
              />
            </div>

            {description ? (
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}

            <p className="text-xs text-[var(--text-dim)]">
              Vista orientativa. El resultado final en piel puede variar según
              anatomía, sesión y adaptación del artista.
            </p>

            <div className="flex flex-wrap gap-2">
              <a
                href={previewImage}
                download={`preview-${zone}.png`}
                className="btn-secondary inline-flex items-center gap-2 px-4 py-2"
              >
                <Download size={14} />
                Descargar
              </a>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPreviewImage("");
                  setBodyImage("");
                  setDesignImage("");
                  setBodyFileName("");
                  setDesignFileName("");
                }}
                className="btn-secondary px-4 py-2"
              >
                Nueva prueba
              </button>
              <Link
                href="/dashboard/agenda"
                className="btn-primary inline-flex items-center gap-2 px-4 py-2"
              >
                Ir a agenda
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <InfoCard
          icon={<Upload size={16} />}
          title="Foto clara"
          text="Luz natural y la zona visible sin filtros extremos."
        />
        <InfoCard
          icon={<ImageIcon size={16} />}
          title="Diseño definido"
          text="Mejor contraste y líneas legibles para ubicar el tatuaje."
        />
        <InfoCard
          icon={<Sparkles size={16} />}
          title="Pollinations"
          text="Cuenta gratis en enter.pollinations.ai. Edición con dos imágenes (cuerpo + diseño)."
        />
      </section>
    </div>
  );
}

function StepPill({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={`rounded-full border px-3 py-2 text-center text-xs ${
        active
          ? "border-[#6ee7b7] bg-[#6ee7b722] text-[#6ee7b7]"
          : done
            ? "border-[var(--border)] bg-[#0d0d10] text-[var(--text-muted)]"
            : "border-[var(--border)] bg-[#0d0d10] text-[var(--text-dim)]"
      }`}
    >
      {label}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm ${
        active
          ? "border-[#6ee7b7] bg-[#6ee7b722] text-[#6ee7b7]"
          : "border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-2 font-medium">
        <span className="text-[#6ee7b7]">{icon}</span>
        {title}
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{text}</p>
    </div>
  );
}
