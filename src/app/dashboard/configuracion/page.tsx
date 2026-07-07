"use client";

import Image from "next/image";
import { useCarrizo } from "@/lib/store";
import { formatMoney } from "@/lib/quote-engine";

export default function ConfiguracionPage() {
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Perfil público de Enderxon Carrizo, abono y datos de contacto.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl">
              <Image
                src={studio.avatarUrl}
                alt={studio.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div>
              <h2 className="font-medium">{studio.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">{studio.tagline}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            {[
              ["Slug público", `/estudio/${studio.slug}`],
              ["Ciudad", studio.city],
              ["Teléfono", studio.phone],
              ["Instagram", studio.instagram],
              ["Facebook", "Enderxon Carrizo"],
              ["Abono", `${studio.depositPercent}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0"
              >
                <dt className="text-[var(--text-dim)]">{label}</dt>
                <dd className="max-w-[60%] text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <a
            href={studio.facebook}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-4 inline-flex px-4 py-2 text-sm"
          >
            Abrir Facebook
          </a>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-medium">Aftercare por defecto</h2>
          <p className="rounded-xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
            {studio.aftercareText}
          </p>
          <p className="mt-4 text-sm text-[var(--text-muted)]">{studio.bio}</p>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-medium">Artista</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  {artist.photoUrl ? (
                    <Image
                      src={artist.photoUrl}
                      alt={artist.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#e11d48] to-[#9f1239] text-sm font-bold">
                      {artist.avatar}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{artist.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{artist.role}</p>
                </div>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {formatMoney(artist.hourlyRate)}/h
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
