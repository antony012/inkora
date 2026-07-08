import { formatMoney } from "@/lib/quote-engine";
import type { ArtistSaleContract } from "@/lib/types";

type ArtistSaleContractTermsProps = {
  contract: ArtistSaleContract;
};

export function ArtistSaleContractTerms({ contract }: ArtistSaleContractTermsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
      <p className="font-medium text-white">Contrato de responsabilidad y consignación</p>
      <p>
        Entre <strong className="text-white">{contract.studioName}</strong> (en adelante, el
        &quot;Estudio&quot;) y <strong className="text-white">{contract.artistName}</strong>{" "}
        (en adelante, el &quot;Artista&quot;), se acuerda la publicación y venta de la obra
        única titulada <strong className="text-white">{contract.artworkTitle}</strong> a través
        del marketplace curado del Estudio.
      </p>

      <div className="rounded-xl border border-[var(--border)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
          Valor de la obra
        </p>
        <p className="mt-1 text-lg font-semibold text-white">
          {formatMoney(contract.artworkPrice)}
        </p>
      </div>

      <ol className="list-decimal space-y-2 pl-5">
        <li>
          El Artista declara ser titular o tener autorización para comercializar la obra y
          autoriza al Estudio a exhibirla, promocionarla y gestionar su venta como pieza de
          stock único.
        </li>
        <li>
          En cada venta concretada, el Estudio retendrá una comisión del{" "}
          <strong className="text-white">{contract.studioFeePercent}%</strong> sobre el valor
          total de la obra ({formatMoney(contract.studioFee)}), correspondiente a curaduría,
          administración, plataforma, cobro y coordinación de sesión.
        </li>
        <li>
          El Artista recibirá el <strong className="text-white">{100 - contract.studioFeePercent}%</strong>{" "}
          restante ({formatMoney(contract.artistPayout)}) una vez confirmado el pago del
          comprador y descontadas las comisiones acordadas.
        </li>
        <li>
          La obra no podrá venderse dos veces. Si un comprador reserva o paga, el Artista se
          compromete a ejecutar la sesión conforme a los estándares del Estudio y a la
          adaptación anatómica acordada con el cliente.
        </li>
        <li>
          El Artista asume responsabilidad por la veracidad de la información entregada, la
          originalidad del diseño y el cumplimiento de las normas sanitarias aplicables durante
          la ejecución del tatuaje.
        </li>
        <li>
          El Estudio podrá pausar o retirar la publicación si detecta incumplimientos,
          reclamos fundados o riesgos para la compra protegida del cliente.
        </li>
      </ol>

      <p className="text-xs text-[var(--text-dim)]">
        Al firmar, el Artista confirma que leyó y acepta este acuerdo para la venta de la obra
        indicada bajo administración de {contract.studioName}.
      </p>
    </div>
  );
}
