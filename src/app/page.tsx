import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  FileSignature,
  Sparkles,
  Wallet,
  Users,
  BarChart3,
  ShieldCheck,
  Share2,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: CalendarCheck2,
    title: "Agenda inteligente",
    text: "Sesiones de duración variable, multi-artista y sin dobles reservas. Confirmaciones automáticas.",
  },
  {
    icon: Sparkles,
    title: "Cotización inteligente",
    text: "Estima horas y precio según estilo, zona y tamaño. Vos aprobás. El cliente paga la seña.",
  },
  {
    icon: Wallet,
    title: "Señas y caja",
    text: "Cobrá depósitos, saldos y propinas. Cierres diarios y comisiones por artista.",
  },
  {
    icon: FileSignature,
    title: "Consentimientos digitales",
    text: "Firma desde el celular con registro fechado. Cobertura legal sin papeles perdidos.",
  },
  {
    icon: Users,
    title: "CRM de clientes",
    text: "Historial de tatuajes, alergias, zonas y gasto total en una ficha clara.",
  },
  {
    icon: BarChart3,
    title: "Reportes reales",
    text: "Ingresos, no-shows, conversión de solicitudes y rendimiento por artista.",
  },
];

const comparisons = [
  { label: "Hecho para tatuadores (no salones)", inkora: true, others: false },
  { label: "Cotización por estilo / zona / tamaño", inkora: true, others: false },
  { label: "Página pública + portafolio", inkora: true, others: true },
  { label: "Consentimientos digitales", inkora: true, others: true },
  { label: "Señas y caja integradas", inkora: true, others: true },
  { label: "UX en español para LATAM", inkora: true, others: false },
  { label: "Sin comisión por reserva", inkora: true, others: false },
];

export default function HomePage() {
  return (
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#e11d48] to-[#9f1239] font-bold">
            I
          </div>
          <span className="text-lg font-semibold tracking-wide">Inkora</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/estudio/nueva-temporada"
            className="hidden text-sm text-[var(--text-muted)] hover:text-white sm:block"
          >
            Ver página pública
          </Link>
          <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm">
            Abrir demo
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:px-6 lg:pb-24 lg:pt-16">
          <div className="animate-fade-up max-w-3xl">
            <span className="badge badge-rose mb-5">
              <Zap size={12} /> Mejor que Porter + TATTOOX + SesionInk
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              El sistema operativo del estudio de tatuajes.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-[var(--text-muted)]">
              Dejá de perder turnos en WhatsApp. Inkora centraliza solicitudes,
              cotización inteligente, señas, agenda, consentimientos, CRM y caja
              en una sola plataforma pensada para tatuadores.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                Probar panel del estudio
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/estudio/nueva-temporada"
                className="btn-secondary inline-flex items-center gap-2 px-6 py-3"
              >
                <Share2 size={16} />
                Flujo del cliente
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["-68%", "menos no-shows"],
                ["+15%", "más citas"],
                ["10 min", "setup"],
                ["0%", "comisión"],
              ].map(([value, label]) => (
                <div key={label} className="card p-4">
                  <p className="text-2xl font-semibold text-[var(--accent-glow)]">{value}</p>
                  <p className="text-xs text-[var(--text-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[#0c0c0f]/80 py-16">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                Todo lo que Porter promete. Más lo que LATAM necesita.
              </h2>
              <p className="mt-3 text-[var(--text-muted)]">
                Analizamos Porter, TATTOOX, SesionInk, Studioapp y Booksy.
                Inkora une lo mejor y elimina la fricción del día a día.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="card card-hover p-5">
                    <div className="mb-4 inline-flex rounded-xl bg-[#e11d4822] p-2.5 text-[#fb7185]">
                      <Icon size={18} />
                    </div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                      {feature.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Por qué Inkora gana
              </h2>
              <p className="mt-3 text-[var(--text-muted)]">
                Las apps genéricas de salones no entienden sesiones de 4 horas,
                señas del 30%, zonas sensibles ni consentimientos sanitarios.
                Inkora sí.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Link en bio de Instagram → solicitud completa",
                  "Cotización automática que el artista aprueba en 1 click",
                  "Seña online antes de bloquear la agenda",
                  "Consentimiento firmado antes de la sesión",
                  "Caja y comisiones sin planillas",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    <ShieldCheck className="mt-0.5 shrink-0 text-[#34d399]" size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[#121216] px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                <span>Capacidad</span>
                <span className="text-center text-[var(--accent-glow)]">Inkora</span>
                <span className="text-center">Otras</span>
              </div>
              {comparisons.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-3 items-center border-b border-[var(--border)] px-4 py-3 text-sm last:border-0"
                >
                  <span className="pr-2 text-[var(--text-muted)]">{row.label}</span>
                  <span className="text-center text-[#6ee7b7]">
                    {row.inkora ? "✓" : "—"}
                  </span>
                  <span className="text-center text-[var(--text-dim)]">
                    {row.others ? "✓" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
          <div className="card relative overflow-hidden p-8 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#f9731633,transparent_40%)]" />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                Manos a la obra: la demo ya está lista.
              </h2>
              <p className="mt-3 text-[var(--text-muted)]">
                Entrá al panel con datos reales de un estudio demo, o viví el
                flujo completo como cliente desde la página pública.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3"
                >
                  Abrir dashboard
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/estudio/nueva-temporada/reservar"
                  className="btn-secondary px-6 py-3"
                >
                  Solicitar un turno
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--text-dim)]">
        Inkora · Software para estudios de tatuaje · Nueva Temporada
      </footer>
    </div>
  );
}
