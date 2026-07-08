"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArtistSaleContractTerms } from "@/components/ArtistSaleContractTerms";
import { ConsentBrandHeader } from "@/components/ConsentBrandHeader";
import { ConsentSignaturePreview, SignaturePad } from "@/components/SignaturePad";
import { isDrawnSignature } from "@/lib/signature";
import { useCarrizo } from "@/lib/store";

export default function ContratoArtistaPage() {
  const params = useParams<{ id: string }>();
  const contracts = useCarrizo((s) => s.artistSaleContracts);
  const artists = useCarrizo((s) => s.artists);
  const studio = useCarrizo((s) => s.studio);
  const signArtistSaleContract = useCarrizo((s) => s.signArtistSaleContract);

  const contract = contracts.find((item) => item.id === params.id);
  const artist = artists.find((item) => item.id === contract?.artistId);

  const [signatureData, setSignatureData] = useState("");
  const [accepted, setAccepted] = useState(false);

  const hasSignature =
    isDrawnSignature(signatureData) || signatureData.trim().length > 0;

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Contrato no encontrado.
      </div>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!accepted || !hasSignature) return;
    signArtistSaleContract(contract.id, {
      signatureData: isDrawnSignature(signatureData)
        ? signatureData
        : signatureData.trim(),
    });
  };

  if (contract.signedAt) {
    return (
      <div className="ink-grid flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-lg p-8 text-center">
          <ConsentBrandHeader studioName={studio.name} centered className="mb-6 border-0 pb-0" />
          <span className="badge badge-green mb-4">Firmado</span>
          <h1 className="text-2xl font-semibold">Contrato registrado</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            {contract.artistName} confirmó la venta de{" "}
            <strong className="text-white">{contract.artworkTitle}</strong> el{" "}
            {format(parseISO(contract.signedAt), "d MMMM yyyy 'a las' HH:mm", {
              locale: es,
            })}
            .
          </p>
          <p className="mt-2 text-sm text-[#6ee7b7]">
            La obra quedó publicada en el marketplace.
          </p>
          <ConsentSignaturePreview signatureData={contract.signatureData ?? ""} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/marketplace" className="btn-secondary px-5 py-2.5">
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
        <ConsentBrandHeader studioName={studio.name} />

        <div>
          <h1 className="text-2xl font-semibold">Contrato de responsabilidad del artista</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Artista: {contract.artistName}
            {artist?.role ? ` · ${artist.role}` : null}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Obra: {contract.artworkTitle}
          </p>
        </div>

        <ArtistSaleContractTerms contract={contract} />

        <div>
          <label className="label">Firma del artista</label>
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
            onChange={(event) => setAccepted(event.target.checked)}
          />
          Confirmo que soy {contract.artistName}, he leído el contrato y acepto la comisión
          del {contract.studioFeePercent}% para {contract.studioName}, autorizando la venta de
          mi obra bajo administración del estudio.
        </label>

        <button
          type="submit"
          disabled={!accepted || !hasSignature}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Firmar y autorizar publicación
        </button>
      </form>
    </div>
  );
}
