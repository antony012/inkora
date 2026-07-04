"use client";

import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  Inbox,
  TrendingUp,
  Users,
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/quote-engine";
import { useInkora } from "@/lib/store";

export default function DashboardPage() {
  const appointments = useInkora((s) => s.appointments);
  const clients = useInkora((s) => s.clients);
  const payments = useInkora((s) => s.payments);
  const artists = useInkora((s) => s.artists);

  const today = new Date();
  const todayApts = appointments
    .filter((a) => isSameDay(parseISO(a.startAt), today))
    .sort(
      (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
    );

  const monthRevenue = payments
    .filter((p) => {
      const d = parseISO(p.createdAt);
      return (
        d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingRequests = appointments.filter((a) =>
    ["solicitud", "cotizado", "seña_pendiente"].includes(a.status),
  ).length;

  const confirmed = appointments.filter((a) =>
    ["confirmado", "en_curso"].includes(a.status),
  ).length;

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos del mes"
          value={formatMoney(monthRevenue)}
          hint="Señas + saldos + propinas"
          icon={CircleDollarSign}
          tone="gold"
        />
        <StatCard
          label="Turnos hoy"
          value={String(todayApts.length)}
          hint={`${confirmed} confirmados activos`}
          icon={CalendarDays}
          tone="rose"
        />
        <StatCard
          label="Solicitudes pendientes"
          value={String(pendingRequests)}
          hint="Requieren tu acción"
          icon={Inbox}
          tone="blue"
        />
        <StatCard
          label="Clientes"
          value={String(clients.length)}
          hint="Base activa del estudio"
          icon={Users}
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-medium">Agenda de hoy</h2>
            <Link
              href="/dashboard/agenda"
              className="text-sm text-[#fb7185] hover:underline"
            >
              Ver agenda
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {todayApts.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[var(--text-muted)]">
                No hay turnos para hoy.
              </p>
            ) : (
              todayApts.map((apt) => {
                const client = clients.find((c) => c.id === apt.clientId);
                const artist = artists.find((a) => a.id === apt.artistId);
                return (
                  <div
                    key={apt.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {format(parseISO(apt.startAt), "HH:mm")} · {client?.name}
                        </p>
                        <StatusBadge status={apt.status} />
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {apt.title} · {artist?.name}
                      </p>
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">
                      {formatMoney(apt.quotedPrice)}
                      {apt.depositPaid ? (
                        <span className="ml-2 text-[#6ee7b7]">Seña OK</span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="card">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-medium">Pipeline</h2>
          </div>
          <div className="space-y-3 p-5">
            {[
              {
                label: "Solicitudes nuevas",
                count: appointments.filter((a) => a.status === "solicitud").length,
                href: "/dashboard/solicitudes",
              },
              {
                label: "Cotizados",
                count: appointments.filter((a) => a.status === "cotizado").length,
                href: "/dashboard/solicitudes",
              },
              {
                label: "Esperando seña",
                count: appointments.filter((a) => a.status === "seña_pendiente")
                  .length,
                href: "/dashboard/solicitudes",
              },
              {
                label: "Consentimientos pendientes",
                count: appointments.filter(
                  (a) =>
                    ["confirmado", "en_curso"].includes(a.status) &&
                    !a.consentSigned,
                ).length,
                href: "/dashboard/consentimientos",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#0d0d10] px-4 py-3 transition hover:border-[#e11d4866]"
              >
                <span className="text-sm text-[var(--text-muted)]">
                  {item.label}
                </span>
                <span className="text-lg font-semibold">{item.count}</span>
              </Link>
            ))}
          </div>
          <div className="border-t border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <TrendingUp size={15} className="text-[#d4a853]" />
              Conversión demo: solicitudes → seña en minutos, no en días.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
