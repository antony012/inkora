"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { SignaturePad, ConsentSignaturePreview } from "@/components/SignaturePad";
import { DownloadConsentPdfButton } from "@/components/DownloadConsentPdfButton";
import { consentSessionLabel } from "@/lib/consent-display";
import { isDrawnSignature } from "@/lib/signature";
import { useCarrizo } from "@/lib/store";

export default function ConsentimientoPage() {
  const params = useParams<{ id: string }>();
  const consents = useCarrizo((s) => s.consents);
  const appointments = useCarrizo((s) => s.appointments);
  const studio = useCarrizo((s) => s.studio);
  const signConsent = useCarrizo((s) => s.signConsent);

  const consent = consents.find((c) => c.id === params.id);
  const appointment = appointments.find((a) => a.id === consent?.appointmentId);

  const [signatureData, setSignatureData] = useState("");
  const [healthDeclaration, setHealthDeclaration] = useState("");
  const [accepted, setAccepted] = useState(false);

  const hasSignature =
    isDrawnSignature(signatureData) || signatureData.trim().length > 0;

  if (!consent) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Consentimiento no encontrado.
      </div>
    );
  }

  const sessionLabel = consentSessionLabel(consent, appointment);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!accepted || !hasSignature) return;
    signConsent(consent.id, {
      signatureData: isDrawnSignature(signatureData)
        ? signatureData
        : signatureData.trim(),
      healthDeclaration: healthDeclaration.trim() || "Sin condiciones relevantes",
    });
  };

  if (consent.signedAt) {
    return (
      <div className="ink-grid flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-lg p-8 text-center">
          <span className="badge badge-green mb-4">Firmado</span>
          <h1 className="text-2xl font-semibold">Consentimiento registrado</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            {consent.clientName} firmó el{" "}
            {format(parseISO(consent.signedAt), "d MMMM yyyy 'a las' HH:mm", {
              locale: es,
            })}
            .
          </p>
          <ConsentSignaturePreview signatureData={consent.signatureData ?? ""} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <DownloadConsentPdfButton
              studio={studio}
              consent={consent}
              appointment={appointment}
              variant="primary"
            />
            <Link href="/dashboard/consentimientos" className="btn-secondary px-5 py-2.5">
              Volver al panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ink-grid min-h-screen px-4 py-10">
      <form onSubmit={onSubmit} className="card mx-auto max-w-2xl space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-sm text-[var(--text-dim)]">{studio.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">
            Consentimiento informado
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Cliente: {consent.clientName}
            {sessionLabel ? ` · ${sessionLabel}` : null}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
          <p>
            Declaro que fui informado/a sobre el procedimiento de tatuaje, riesgos
            posibles (infección, reacción alérgica, cicatrización irregular),
            cuidados posteriores y que soy mayor de edad. Autorizo al estudio a
            realizar el trabajo descrito y acepto que la seña no es reembolsable
            ante inasistencias sin aviso de 48 horas.
          </p>
          <p className="mt-3">{studio.aftercareText}</p>
        </div>

        <div>
          <label className="label">Declaración de salud / alergias</label>
          <textarea
            className="input min-h-24"
            placeholder="Ej: alergia a látex, medicación, embarazo, condiciones de piel..."
            value={healthDeclaration}
            onChange={(e) => setHealthDeclaration(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Firma digital</label>
          <p className="mb-2 text-xs text-[var(--text-dim)]">
            Deslizá el dedo sobre el recuadro para firmar desde tu teléfono.
          </p>
          <SignaturePad onChange={setSignatureData} />
        </div>

        <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            className="mt-1"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          Acepto los términos, cuidados posteriores y declaro que la información
          de salud es verídica.
        </label>

        <button
          type="submit"
          disabled={!accepted || !hasSignature}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Firmar consentimiento
        </button>
      </form>
    </div>
  );
}
