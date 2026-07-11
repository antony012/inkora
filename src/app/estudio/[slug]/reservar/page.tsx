"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  formatMoney,
  quoteSessionPackage,
  SESSION_PACKAGES,
  sessionHoursLabel,
  sessionPackageLabel,
  styleLabel,
} from "@/lib/quote-engine";
import { UserCard } from "@/components/UserCard";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useCarrizo } from "@/lib/store";
import type { BodyZone, SessionPackageId, TattooSize, TattooStyle } from "@/lib/types";

const sessionPackages: SessionPackageId[] = [
  "una_hora",
  "corta",
  "estandar",
  "larga",
];

const sessionMobileLabels: Record<SessionPackageId, string> = {
  una_hora: "1 h",
  corta: "Corta",
  estandar: "Estándar",
  larga: "Larga",
};

function formatCompactMoney(amount: number) {
  if (amount >= 1_000_000) {
    return `$${Math.round(amount / 100_000) / 10}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`;
  }
  return formatMoney(amount);
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

const styles: TattooStyle[] = [
  "realismo",
  "tradicional",
  "neotradicional",
  "blackwork",
  "fine_line",
  "geométrico",
  "lettering",
  "japones",
  "watercolor",
  "minimalista",
];

const zones: BodyZone[] = [
  "brazo",
  "antebrazo",
  "mano",
  "hombro",
  "pecho",
  "espalda",
  "costillas",
  "pierna",
  "pantorrilla",
  "pie",
  "cuello",
  "muñeca",
];

const sizes: TattooSize[] = [
  "pequeño",
  "mediano",
  "grande",
  "manga",
  "espalda_completa",
];

export default function ReservarPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const createBookingRequest = useCarrizo((s) => s.createBookingRequest);
  const { sessionUser } = useSessionUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [artistId] = useState(artists[0]?.id ?? "artist-1");
  const [style, setStyle] = useState<TattooStyle>("fine_line");
  const [zone, setZone] = useState<BodyZone>("antebrazo");
  const [size, setSize] = useState<TattooSize>("mediano");
  const [sessionPackage, setSessionPackage] =
    useState<SessionPackageId>("estandar");
  const [description, setDescription] = useState("");
  const [referenceFileName, setReferenceFileName] = useState("");
  const [referencePreview, setReferencePreview] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!sessionUser) return;
    setName(sessionUser.name);
    setEmail(sessionUser.email);
    setPhone(sessionUser.phone);
  }, [sessionUser]);

  const artist = artists.find((a) => a.id === artistId) ?? artists[0];

  const quote = useMemo(() => {
    return quoteSessionPackage(sessionPackage, studio.depositPercent);
  }, [sessionPackage, studio.depositPercent]);

  if (params.slug !== studio.slug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Estudio no encontrado.
      </div>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    createBookingRequest({
      name,
      email,
      phone,
      artistId,
      style,
      zone,
      size,
      sessionPackage,
      description,
      referenceImageUrl: referencePreview || undefined,
      referenceFileName: referenceFileName || undefined,
      preferredDate: preferredDate || undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="ink-grid flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-lg p-8 text-center">
          <span className="badge badge-green mb-4">Solicitud enviada</span>
          <h1 className="text-2xl font-semibold">¡Listo!</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            El estudio recibió tu pedido con el precio de{" "}
            {sessionPackageLabel(sessionPackage).toLowerCase()}. Te van a
            confirmar la seña para bloquear el turno.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/estudio/${studio.slug}`} className="btn-secondary px-5 py-2.5">
              Volver al estudio
            </Link>
            <button
              onClick={() => router.push("/dashboard/solicitudes")}
              className="btn-primary px-5 py-2.5"
            >
              Ver en el panel (demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-end px-4 pt-5">
        <UserCard />
      </header>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <form onSubmit={onSubmit} className="card space-y-5 p-6">
          <div>
            <Link
              href={`/estudio/${studio.slug}`}
              className="text-sm text-[var(--text-muted)] hover:text-white"
            >
              ← {studio.name}
            </Link>
            <h1 className="mt-3 text-2xl font-semibold">Solicitar turno</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Completá una vez. Sin ir y venir por WhatsApp.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                className="input"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
              Artista
            </p>
            <p className="mt-1 font-medium">{artist?.name ?? "Enderxon Carrizo"}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {artist?.role ?? "Tatuajes artísticos"}
            </p>
          </div>

          <div>
            <label className="label">Tipo de sesión</label>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Elegí el bloque de tiempo que mejor calza con tu pieza. Precio fijo en CLP.
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-3">
              {sessionPackages.map((id) => {
                const pkg = SESSION_PACKAGES[id];
                const selected = sessionPackage === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSessionPackage(id)}
                    className={`rounded-xl border p-2 text-left transition sm:rounded-2xl sm:p-3 lg:p-4 ${
                      selected
                        ? "border-[#d4a853] bg-[#d4a85314] ring-1 ring-[#d4a85366]"
                        : "border-[var(--border)] bg-[#0d0d10] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <p className="text-[10px] font-medium leading-tight sm:text-sm">
                      <span className="sm:hidden">{sessionMobileLabels[id]}</span>
                      <span className="hidden sm:inline">{pkg.label}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-none text-[#d4a853] sm:mt-1 sm:text-lg">
                      <span className="sm:hidden">{formatCompactMoney(pkg.price)}</span>
                      <span className="hidden sm:inline">{formatMoney(pkg.price)}</span>
                    </p>
                    <p className="mt-0.5 text-[9px] text-[var(--text-muted)] sm:mt-1 sm:text-xs">
                      {sessionHoursLabel(id)}
                    </p>
                  </button>
                );
              })}
            </div>

            {quote ? (
              <div
                key={sessionPackage}
                className="mt-3 rounded-2xl border border-[#d4a85344] bg-[#d4a8530d] p-4 animate-fade-up"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{sessionPackageLabel(sessionPackage)}</p>
                  <p className="text-lg font-semibold text-[#d4a853]">
                    {formatMoney(quote.suggestedPrice)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {SESSION_PACKAGES[sessionPackage].description}
                </p>
                <div className="mt-3 text-xs text-[var(--text-dim)]">
                  <span>Duración: {sessionHoursLabel(sessionPackage)}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Estilo</label>
              <select
                className="input"
                value={style}
                onChange={(e) => setStyle(e.target.value as TattooStyle)}
              >
                {styles.map((s) => (
                  <option key={s} value={s}>
                    {styleLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Zona</label>
              <select
                className="input"
                value={zone}
                onChange={(e) => setZone(e.target.value as BodyZone)}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tamaño</label>
              <select
                className="input"
                value={size}
                onChange={(e) => setSize(e.target.value as TattooSize)}
              >
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Descripción / referencias</label>
            <textarea
              className="input min-h-28"
              required
              placeholder="Contanos la idea, estilo, colores, inspiración..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Imagen de referencia (opcional)</label>
              <p className="mb-2 text-xs text-[var(--text-dim)]">
                Sube una foto de inspiración para el diseño. JPG, PNG o WEBP · máx. 4 MB.
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[#0d0d10] px-4 py-6 text-center transition hover:border-[#d4a85366]">
                <Upload className="mb-2 text-[var(--accent-glow)]" size={22} />
                <span className="text-sm">
                  {referenceFileName || "Toca para subir referencia"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 4 * 1024 * 1024) {
                      setUploadError("La imagen no puede superar 4 MB.");
                      return;
                    }
                    if (!file.type.startsWith("image/")) {
                      setUploadError("Solo se permiten imágenes.");
                      return;
                    }
                    const dataUrl = await fileToDataUrl(file);
                    setReferencePreview(dataUrl);
                    setReferenceFileName(file.name);
                    setUploadError("");
                  }}
                />
              </label>
              {uploadError ? (
                <p className="mt-2 text-sm text-[var(--accent-glow)]">{uploadError}</p>
              ) : null}
              {referencePreview ? (
                <div className="relative mt-3 overflow-hidden rounded-2xl border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referencePreview}
                    alt="Referencia del tatuaje"
                    className="max-h-48 w-full bg-black object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReferencePreview("");
                      setReferenceFileName("");
                      setUploadError("");
                    }}
                    className="absolute right-2 top-2 rounded-full border border-[var(--border)] bg-[#0c0c0f]/90 p-1.5 text-[var(--text-muted)] hover:text-white"
                    aria-label="Quitar imagen de referencia"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}
            </div>
            <div>
              <label className="label">Fecha preferida</label>
              <input
                className="input"
                type="datetime-local"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3">
            Enviar solicitud
          </button>
        </form>
      </div>
    </div>
  );
}
