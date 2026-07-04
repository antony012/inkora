"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type OEmbedResponse = {
  html: string;
  author_url: string;
};

export function TikTokVideoCarousel({
  profileUrl = "https://www.tiktok.com/@carrizoartist",
}: {
  profileUrl?: string;
}) {
  const [embedHtml, setEmbedHtml] = useState("");
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/tiktok/oembed?url=${encodeURIComponent(profileUrl)}`)
      .then((res) => res.json())
      .then((data: OEmbedResponse & { error?: string }) => {
        if (!active) return;
        if (!data.html) {
          setError(data.error ?? "No se pudo cargar TikTok.");
          return;
        }
        setEmbedHtml(data.html);
      })
      .catch(() => {
        if (active) setError("No se pudo conectar con TikTok.");
      });

    return () => {
      active = false;
    };
  }, [profileUrl]);

  useEffect(() => {
    if (!embedHtml || !scriptReady) return;

    const render = () => {
      const tiktok = (
        window as Window & { tiktokEmbed?: { lib: { render: () => void } } }
      ).tiktokEmbed;
      tiktok?.lib?.render();
    };

    render();
    const timer = window.setTimeout(render, 400);
    return () => window.clearTimeout(timer);
  }, [embedHtml, scriptReady]);

  if (error) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary inline-flex px-4 py-2 text-sm"
      >
        Ver videos en TikTok
      </a>
    );
  }

  if (!embedHtml) {
    return (
      <div className="tiktok-scroll flex gap-3 overflow-hidden py-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[280px] w-[158px] shrink-0 animate-pulse rounded-2xl bg-[#1a1a20]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#070708]">
      <div className="tiktok-strip-viewport relative h-[300px] overflow-hidden">
        <div
          className="tiktok-strip-embed pointer-events-auto absolute left-0 right-0 top-[-148px]"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#070708] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#070708] to-transparent" />
      </div>

      <Script
        src="https://www.tiktok.com/embed.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
    </div>
  );
}
