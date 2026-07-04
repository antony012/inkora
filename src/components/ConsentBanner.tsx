"use client";

import { ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { trackMarketingEvent } from "@/lib/analytics";
import { useInkora } from "@/lib/store";

export function ConsentBanner() {
  const preferences = useInkora((s) => s.consentPreferences);
  const setConsentPreferences = useInkora((s) => s.setConsentPreferences);
  const [open, setOpen] = useState(!preferences.decidedAt);

  if (!open || preferences.decidedAt) return null;

  const save = (analytics: boolean, marketing: boolean) => {
    setConsentPreferences({
      analytics,
      marketing,
      decidedAt: new Date().toISOString(),
    });
    setOpen(false);
    if (analytics || marketing) {
      trackMarketingEvent("CompleteRegistration", {
        source: "consent",
        metadata: { analytics, marketing },
      });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-5xl rounded-3xl border border-[var(--border-strong)] bg-[#0b0b0ecc] p-4 shadow-[0_24px_80px_#00000099] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="mt-1 rounded-xl bg-[#34d39922] p-2 text-[#6ee7b7]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-medium">Privacidad y medición</p>
              <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
                Usamos métricas para mejorar campañas y reservas. Meta, GA4 y
                TikTok solo se cargan con tu permiso de marketing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => save(false, false)}
            >
              Rechazar
            </button>
            <button
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => save(true, false)}
            >
              Solo analytics
            </button>
            <button
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => save(true, true)}
            >
              Aceptar todo
            </button>
            <button
              className="rounded-full p-2 text-[var(--text-dim)] hover:bg-white/5"
              onClick={() => setOpen(false)}
              aria-label="Cerrar banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}