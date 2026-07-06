"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CarrizoArtLogo } from "@/components/CarrizoArtLogo";
import { PubgRoulette } from "@/components/PubgRoulette";
import { UserCard } from "@/components/UserCard";
import { useCarrizo } from "@/lib/store";

export default function RuletaPage() {
  const params = useParams<{ slug: string }>();
  const studio = useCarrizo((s) => s.studio);

  if (params.slug !== studio.slug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Estudio no encontrado.
      </div>
    );
  }

  return (
    <div className="ink-grid min-h-screen bg-[#050506]">
      <header className="mx-auto w-full max-w-4xl px-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/estudio/${studio.slug}`}
            className="mt-2 shrink-0 text-sm text-[var(--text-muted)] hover:text-white"
          >
            ← Volver
          </Link>
          <UserCard />
        </div>

        <div className="ruleta-page-hero mt-6 border-b border-[var(--border)] pb-8 text-center">
          <CarrizoArtLogo
            variant="contrast"
            size="xl"
            showGlow
            asHeading
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-4 pb-16">
        <PubgRoulette reservarHref={`/estudio/${studio.slug}/reservar`} />
      </main>
    </div>
  );
}
