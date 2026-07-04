"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type OEmbedResponse = {
  html: string;
  author_name: string;
  title: string;
  author_url: string;
};

export function TikTokProfileFeed({
  profileUrl = "https://www.tiktok.com/@carrizoartist",
}: {
  profileUrl?: string;
}) {
  const [embed, setEmbed] = useState<OEmbedResponse | null>(null);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/tiktok/oembed?url=${encodeURIComponent(profileUrl)}`)
      .then((res) => res.json())
      .then((data: OEmbedResponse & { error?: string }) => {
        if (!active) return;
        if (data.error || !data.html) {
          setError(data.error ?? "No se pudo cargar el feed.");
          return;
        }
        setEmbed(data);
      })
      .catch(() => {
        if (active) setError("No se pudo conectar con TikTok.");
      });

    return () => {
      active = false;
    };
  }, [profileUrl]);

  useEffect(() => {
    if (!embed || !scriptReady) return;
    const timer = window.setTimeout(() => {
      const tiktok = (window as Window & { tiktokEmbed?: { lib: { render: () => void } } }).tiktokEmbed;
      tiktok?.lib?.render();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [embed, scriptReady]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary mt-4 inline-flex px-4 py-2 text-sm"
        >
          Ver en TikTok
        </a>
      </div>
    );
  }

  if (!embed) {
    return (
      <div className="card flex min-h-80 items-center justify-center p-6">
        <p className="text-sm text-[var(--text-muted)]">Cargando videos de TikTok...</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="badge badge-rose mb-2">TikTok</span>
          <h3 className="text-xl font-semibold">{embed.author_name}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Últimos videos del artista · se actualizan desde TikTok
          </p>
        </div>
        <a
          href={embed.author_url}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary px-4 py-2 text-sm"
        >
          Seguir en TikTok
        </a>
      </div>

      <div
        className="tiktok-feed mx-auto max-w-[780px] overflow-hidden rounded-2xl"
        dangerouslySetInnerHTML={{ __html: embed.html }}
      />

      <Script
        src="https://www.tiktok.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />
    </div>
  );
}
