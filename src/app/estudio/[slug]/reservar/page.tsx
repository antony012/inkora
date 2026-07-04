"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { estimateQuote, formatMoney, styleLabel } from "@/lib/quote-engine";
import { useInkora } from "@/lib/store";
import type { BodyZone, TattooSize, TattooStyle } from "@/lib/types";

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
  const studio = useInkora((s) => s.studio);
  const artists = useInkora((s) => s.artists);
  const createBookingRequest = useInkora((s) => s.createBookingRequest);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [artistId] = useState(artists[0]?.id ?? "artist-1");
  const [style, setStyle] = useState<TattooStyle>("fine_line");
  const [zone, setZone] = useState<BodyZone>("antebrazo");
  const [size, setSize] = useState<TattooSize>("mediano");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const artist = artists.find((a) => a.id === artistId) ?? artists[0];

  const quote = useMemo(() => {
    if (!artist) return null;
    return estimateQuote({
      style,
      zone,
      size,
      hourlyRate: artist.hourlyRate,
      depositPercent: studio.depositPercent,
    });
  }, [artist, style, zone, size, studio.depositPercent]);

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
      description,
      budget: budget ? Number(budget) : undefined,
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
            El estudio recibió tu pedido con cotización estimada. Te van a
            confirmar precio final y seña para bloquear el turno.
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
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
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
            <p className="mt-1 font-medium">{artist?.name ?? "Enderson Carrizo"}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {artist?.role ?? "Tatuajes artísticos"}
            </p>
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
              <label className="label">Presupuesto (opcional)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
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

        <aside className="card h-fit p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
            Cotización inteligente
          </p>
          <h2 className="mt-2 text-xl font-semibold">Estimación Inkora</h2>
          {quote ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-3xl font-semibold text-[#d4a853]">
                  {formatMoney(quote.suggestedPrice)}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Rango {formatMoney(quote.minPrice)} –{" "}
                  {formatMoney(quote.maxPrice)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#0d0d10] p-3">
                  <p className="text-[var(--text-dim)]">Horas</p>
                  <p className="font-medium">{quote.estimatedHours}h</p>
                </div>
                <div className="rounded-xl bg-[#0d0d10] p-3">
                  <p className="text-[var(--text-dim)]">Seña ({studio.depositPercent}%)</p>
                  <p className="font-medium">{formatMoney(quote.depositAmount)}</p>
                </div>
              </div>
              <div>
                <span className="badge badge-rose capitalize">
                  Complejidad {quote.complexity}
                </span>
              </div>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                {quote.factors.map((factor) => (
                  <li key={factor}>• {factor}</li>
                ))}
              </ul>
              <p className="text-xs text-[var(--text-dim)]">
                El artista aprueba el precio final. La seña confirma el turno.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
