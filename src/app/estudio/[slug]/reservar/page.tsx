"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [budget, setBudget] = useState("");
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
      <header className="mx-auto flex w-full max-w-5xl items-center justify-end px-4 pt-5">
        <UserCard />
      </header>
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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

          <div>
            <label className="label">Tipo de sesión</label>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Elegí el bloque de tiempo que mejor calza con tu pieza. Precio fijo en CLP.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sessionPackages.map((id) => {
                const pkg = SESSION_PACKAGES[id];
                const selected = sessionPackage === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSessionPackage(id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-[#d4a853] bg-[#d4a85314] ring-1 ring-[#d4a85366]"
                        : "border-[var(--border)] bg-[#0d0d10] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <p className="text-sm font-medium">{pkg.label}</p>
                    <p className="mt-1 text-lg font-semibold text-[#d4a853]">
                      {formatMoney(pkg.price)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {sessionHoursLabel(id)}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">
                      {pkg.description}
                    </p>
                  </button>
                );
              })}
            </div>
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
          <h2 className="mt-2 text-xl font-semibold">
            {sessionPackageLabel(sessionPackage)}
          </h2>
          {quote ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-3xl font-semibold text-[#d4a853]">
                  {formatMoney(quote.suggestedPrice)}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Precio fijo · {sessionHoursLabel(sessionPackage)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#0d0d10] p-3">
                  <p className="text-[var(--text-dim)]">Duración</p>
                  <p className="font-medium">{sessionHoursLabel(sessionPackage)}</p>
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
                Pagás la seña para confirmar el turno. El saldo se abona el día de la sesión.
              </p>
            </div>
          ) : null}
        </aside>
        </div>
      </div>
    </div>
  );
}
