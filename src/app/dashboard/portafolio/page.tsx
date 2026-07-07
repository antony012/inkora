"use client";

import Image from "next/image";
import { styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";

export default function PortafolioPage() {
  const portfolio = useCarrizo((s) => s.portfolio);
  const artists = useCarrizo((s) => s.artists);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portafolio</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Trabajos de Enderxon Carrizo publicados en la página pública.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {portfolio.map((item) => {
          const artist = artists.find((a) => a.id === item.artistId);
          return (
            <article key={item.id} className="card overflow-hidden card-hover">
              <div className="relative h-52">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-[var(--text-dim)]">
                    {artist?.name} · {styleLabel(item.style)}
                  </p>
                </div>
                {item.featured ? (
                  <span className="badge badge-gold">Destacado</span>
                ) : (
                  <span className="badge badge-gray">Galería</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
