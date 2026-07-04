"use client";

import { format, isSameDay, parseISO, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/quote-engine";
import { useInkora } from "@/lib/store";

export default function AgendaPage() {
  const appointments = useInkora((s) => s.appointments);
  const clients = useInkora((s) => s.clients);
  const artists = useInkora((s) => s.artists);
  const markCompleted = useInkora((s) => s.markCompleted);
  const updateAppointmentStatus = useInkora((s) => s.updateAppointmentStatus);
  const [selectedDay, setSelectedDay] = useState(startOfDay(new Date()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)),
    [],
  );

  const dayApts = appointments
    .filter((a) => isSameDay(parseISO(a.startAt), selectedDay))
    .sort(
      (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Vista semanal por artista. Sesiones largas, sin cruces.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {days.map((day) => {
          const active = isSameDay(day, selectedDay);
          const count = appointments.filter((a) =>
            isSameDay(parseISO(a.startAt), day),
          ).length;
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`min-w-[110px] rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-[#e11d48] bg-[#e11d4822]"
                  : "border-[var(--border)] bg-[#121216] hover:border-[#3a3a46]"
              }`}
            >
              <p className="text-xs uppercase text-[var(--text-dim)]">
                {format(day, "EEE", { locale: es })}
              </p>
              <p className="text-lg font-semibold">{format(day, "d")}</p>
              <p className="text-xs text-[var(--text-muted)]">{count} turnos</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {artists.map((artist) => {
          const artistApts = dayApts.filter((a) => a.artistId === artist.id);
          return (
            <section key={artist.id} className="card">
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#e11d48] to-[#9f1239] text-sm font-bold">
                  {artist.avatar}
                </div>
                <div>
                  <p className="font-medium">{artist.name}</p>
                  <p className="text-xs text-[var(--text-dim)]">{artist.role}</p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {artistApts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[var(--text-dim)]">
                    Libre
                  </p>
                ) : (
                  artistApts.map((apt) => {
                    const client = clients.find((c) => c.id === apt.clientId);
                    return (
                      <div
                        key={apt.id}
                        className="rounded-xl border border-[var(--border)] bg-[#0d0d10] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {format(parseISO(apt.startAt), "HH:mm")} –{" "}
                              {format(parseISO(apt.endAt), "HH:mm")}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">
                              {client?.name}
                            </p>
                          </div>
                          <StatusBadge status={apt.status} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--text-dim)]">
                          {apt.title}
                        </p>
                        <p className="mt-1 text-xs text-[#d4a853]">
                          {formatMoney(apt.quotedPrice)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {apt.status === "confirmado" ? (
                            <button
                              onClick={() =>
                                updateAppointmentStatus(apt.id, "en_curso")
                              }
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              Iniciar
                            </button>
                          ) : null}
                          {["confirmado", "en_curso"].includes(apt.status) ? (
                            <button
                              onClick={() => markCompleted(apt.id)}
                              className="btn-primary px-3 py-1.5 text-xs"
                            >
                              Completar + cobrar saldo
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
