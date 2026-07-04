"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Gavel } from "lucide-react";
import { useEffect } from "react";
import { LiveAuctionRoom } from "@/components/LiveAuctionRoom";
import { SocialStrip } from "@/components/SocialStrip";
import { useSessionUser } from "@/hooks/useSessionUser";
import { trackPageView } from "@/lib/analytics";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";
import { useInkora } from "@/lib/store";

const LEGACY_SLUGS = new Set(["nueva-temporada", "santiago-ink"]);

export default function SubastaPublicPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = useInkora((s) => s.studio);
  const { hydrated, sessionUser } = useSessionUser();

  useEffect(() => {
    if (LEGACY_SLUGS.has(params.slug)) {
      router.replace(`/estudio/${studio.slug}/subasta`);
      return;
    }
    trackPageView("studio");
  }, [params.slug, router, studio.slug]);

  if (!hydrated || LEGACY_SLUGS.has(params.slug)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Abriendo sala de subasta...
      </div>
    );
  }

  if (params.slug !== studio.slug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Artista no encontrado.
      </div>
    );
  }

  return (
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/estudio/${studio.slug}`}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← {studio.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {sessionUser ? (
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5 text-xs">
              <span className="font-medium text-white">{sessionUser.name}</span>
              <span
                className={`badge ${verificationBadge(sessionUser.verificationStatus)}`}
              >
                {verificationLabel(sessionUser.verificationStatus)}
              </span>
            </div>
          ) : (
            <Link href="/acceso" className="btn-secondary px-3 py-1.5 text-xs">
              Iniciar sesión
            </Link>
          )}
          <span className="badge badge-rose">
            <Gavel size={12} /> Subasta en vivo
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">
              Subasta de tatuaje en vivo
            </h1>
            <p className="mt-2 text-[var(--text-muted)]">
              Enderson publica una pieza exclusiva. Pujas en tiempo real con
              identidad verificada.
            </p>
          </div>
          <SocialStrip studio={studio} />
        </div>
        <LiveAuctionRoom />
      </main>
    </div>
  );
}
