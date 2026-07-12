"use client";

import Image from "next/image";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { PasswordField } from "@/components/PasswordField";
import { useCarrizo } from "@/lib/store";
import { pushVerificationUserToServer } from "@/lib/verifications/client-sync";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";
import type {
  DocumentType,
  UserRole,
  VerificationStatus,
  VerifiedUser,
} from "@/lib/types";

type PageTab = "cuentas" | "verificaciones";

type UserFilter =
  | "todos"
  | "verificado"
  | "en_revision"
  | "pendiente_documento"
  | "rechazado"
  | "bloqueados";

const FILTERS: Array<{ id: UserFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "verificado", label: "Verificados" },
  { id: "en_revision", label: "Por verificar" },
  { id: "pendiente_documento", label: "Sin documento" },
  { id: "rechazado", label: "Rechazados" },
  { id: "bloqueados", label: "Bloqueados" },
];

const VERIFY_FILTERS: Array<VerificationStatus | "todos"> = [
  "todos",
  "en_revision",
  "verificado",
  "rechazado",
  "pendiente_documento",
];

export default function UsuariosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-[var(--text-muted)]">Cargando usuarios...</div>
      }
    >
      <UsuariosPageContent />
    </Suspense>
  );
}

function UsuariosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: PageTab =
    tabParam === "verificaciones" ? "verificaciones" : "cuentas";

  const users = useCarrizo((s) => s.users);
  const sessionUserId = useCarrizo((s) => s.sessionUserId);
  const adminCreateUser = useCarrizo((s) => s.adminCreateUser);
  const adminDeleteUser = useCarrizo((s) => s.adminDeleteUser);
  const adminSetUserBlocked = useCarrizo((s) => s.adminSetUserBlocked);
  const adminSetUserPassword = useCarrizo((s) => s.adminSetUserPassword);
  const adminSetVerificationStatus = useCarrizo(
    (s) => s.adminSetVerificationStatus,
  );
  const reviewVerification = useCarrizo((s) => s.reviewVerification);
  const syncVerificationsFromServer = useCarrizo(
    (s) => s.syncVerificationsFromServer,
  );

  const [tab, setTab] = useState<PageTab>(initialTab);
  const [filter, setFilter] = useState<UserFilter>("todos");
  const [verifyFilter, setVerifyFilter] = useState<
    VerificationStatus | "todos"
  >("en_revision");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("Documento ilegible o datos no coinciden.");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("cedula");
  const [role, setRole] = useState<UserRole>("user");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("pendiente_documento");
  const [password, setPassword] = useState("");
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const localUsers = useCarrizo.getState().users;
    for (const user of localUsers) {
      if (user.submittedAt) {
        void pushVerificationUserToServer(user);
      }
    }
    void syncVerificationsFromServer();
  }, [syncVerificationsFromServer]);

  const switchTab = (next: PageTab) => {
    setTab(next);
    setError("");
    setMessage("");
    const href =
      next === "verificaciones"
        ? "/dashboard/usuarios?tab=verificaciones"
        : "/dashboard/usuarios";
    router.replace(href);
  };

  const counts = useMemo(() => {
    return {
      todos: users.length,
      verificado: users.filter((u) => u.verificationStatus === "verificado")
        .length,
      en_revision: users.filter((u) => u.verificationStatus === "en_revision")
        .length,
      pendiente_documento: users.filter(
        (u) => u.verificationStatus === "pendiente_documento",
      ).length,
      rechazado: users.filter((u) => u.verificationStatus === "rechazado")
        .length,
      bloqueados: users.filter((u) => u.blocked).length,
    };
  }, [users]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...users]
      .filter((user) => {
        if (filter === "bloqueados") return Boolean(user.blocked);
        if (filter !== "todos" && user.verificationStatus !== filter) return false;
        if (!q) return true;
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.phone.toLowerCase().includes(q) ||
          user.rut.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [users, filter, query]);

  const verifyList = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });
    if (verifyFilter === "todos") return sorted;
    return sorted.filter((user) => user.verificationStatus === verifyFilter);
  }, [users, verifyFilter]);

  const resetCreateForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRut("");
    setDocumentType("cedula");
    setRole("user");
    setVerificationStatus("pendiente_documento");
    setPassword("");
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusyId("create");
    try {
      const result = await adminCreateUser({
        name,
        email,
        phone,
        rut,
        documentType,
        password,
        role,
        verificationStatus,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo crear el usuario.");
        return;
      }
      setMessage("Usuario creado correctamente.");
      resetCreateForm();
      setShowCreate(false);
      void syncVerificationsFromServer();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = (user: VerifiedUser) => {
    if (
      !window.confirm(
        `¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setError("");
    setMessage("");
    const result = adminDeleteUser(user.id);
    if (!result.ok) {
      setError(result.error ?? "No se pudo eliminar.");
      return;
    }
    setMessage(`Usuario ${user.name} eliminado.`);
  };

  const onToggleBlock = (user: VerifiedUser) => {
    setError("");
    setMessage("");
    const nextBlocked = !user.blocked;
    const reason = nextBlocked
      ? window.prompt(
          "Motivo del bloqueo (opcional):",
          user.blockedReason || "Cuenta bloqueada por el estudio.",
        )
      : undefined;
    if (nextBlocked && reason === null) return;

    const result = adminSetUserBlocked({
      userId: user.id,
      blocked: nextBlocked,
      reason: reason || undefined,
    });
    if (!result.ok) {
      setError(result.error ?? "No se pudo actualizar el bloqueo.");
      return;
    }
    setMessage(
      nextBlocked ? `${user.name} bloqueado.` : `${user.name} desbloqueado.`,
    );
  };

  const onSavePassword = async (userId: string) => {
    setError("");
    setMessage("");
    setBusyId(userId);
    try {
      const result = await adminSetUserPassword({
        userId,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setMessage("Contraseña actualizada.");
      setPasswordUserId(null);
      setNewPassword("");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Cuentas, verificación de identidad, bloqueos y contraseñas en un solo
            lugar.
          </p>
        </div>
        {tab === "cuentas" ? (
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setError("");
              setMessage("");
            }}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <UserPlus size={16} />
            {showCreate ? "Cerrar formulario" : "Crear usuario"}
          </button>
        ) : (
          <span className="badge badge-amber">
            <ShieldCheck size={12} /> {counts.en_revision} en revisión
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab("cuentas")}
          className={
            tab === "cuentas"
              ? "btn-primary px-4 py-2 text-sm"
              : "btn-secondary px-4 py-2 text-sm"
          }
        >
          Cuentas
        </button>
        <button
          type="button"
          onClick={() => switchTab("verificaciones")}
          className={
            tab === "verificaciones"
              ? "btn-primary px-4 py-2 text-sm"
              : "btn-secondary px-4 py-2 text-sm"
          }
        >
          Verificaciones
          {counts.en_revision > 0 ? ` (${counts.en_revision})` : ""}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users size={16} />} label="Total" value={counts.todos} />
        <StatCard
          icon={<ShieldCheck size={16} />}
          label="Verificados"
          value={counts.verificado}
        />
        <StatCard
          icon={<Plus size={16} />}
          label="Por verificar"
          value={counts.en_revision}
        />
        <StatCard
          icon={<Ban size={16} />}
          label="Bloqueados"
          value={counts.bloqueados}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-[#f9731644] bg-[#f9731614] px-4 py-3 text-sm text-[var(--accent-glow)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-[#34d39944] bg-[#34d39914] px-4 py-3 text-sm text-[#6ee7b7]">
          {message}
        </p>
      ) : null}

      {tab === "cuentas" ? (
        <>
          {showCreate ? (
            <form onSubmit={onCreate} className="card space-y-4 p-5">
              <h2 className="text-lg font-medium">Nuevo usuario</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Nombre</label>
                  <input
                    className="input"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">WhatsApp</label>
                  <input
                    className="input"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">RUT / ID</label>
                  <input
                    className="input"
                    required
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Documento</label>
                  <select
                    className="input"
                    value={documentType}
                    onChange={(e) =>
                      setDocumentType(e.target.value as DocumentType)
                    }
                  >
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="label">Rol</label>
                  <select
                    className="input"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    <option value="user">Usuario</option>
                    <option value="studio_admin">Admin estudio</option>
                  </select>
                </div>
                <div>
                  <label className="label">Estado verificación</label>
                  <select
                    className="input"
                    value={verificationStatus}
                    onChange={(e) =>
                      setVerificationStatus(e.target.value as VerificationStatus)
                    }
                  >
                    <option value="pendiente_documento">Falta documento</option>
                    <option value="en_revision">En revisión</option>
                    <option value="verificado">Verificado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
                <div>
                  <PasswordField
                    label="Contraseña inicial"
                    value={password}
                    onChange={setPassword}
                    showHints
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 text-sm"
                disabled={busyId === "create"}
              >
                {busyId === "create" ? "Creando..." : "Guardar usuario"}
              </button>
            </form>
          ) : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={
                    filter === item.id
                      ? "btn-primary px-3 py-1.5 text-xs"
                      : "btn-secondary px-3 py-1.5 text-xs"
                  }
                >
                  {item.label} ({counts[item.id]})
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
              />
              <input
                className="input pl-9"
                placeholder="Buscar por nombre, email, teléfono o RUT"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {list.length === 0 ? (
              <div className="card p-8 text-center text-[var(--text-muted)]">
                No hay usuarios en este filtro.
              </div>
            ) : (
              list.map((user) => {
                const isSelf = user.id === sessionUserId;
                const isAdmin = user.role === "studio_admin";
                return (
                  <article key={user.id} className="card space-y-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-medium">{user.name}</h2>
                          <span
                            className={`badge ${verificationBadge(user.verificationStatus)}`}
                          >
                            {verificationLabel(user.verificationStatus)}
                          </span>
                          {user.blocked ? (
                            <span className="badge badge-rose">Bloqueado</span>
                          ) : null}
                          {isAdmin ? (
                            <span className="badge badge-gold">Admin</span>
                          ) : null}
                          {isSelf ? (
                            <span className="badge badge-gray">Tú</span>
                          ) : null}
                        </div>
                        <dl className="mt-3 grid gap-1 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div>
                            <span className="text-[var(--text-dim)]">Email: </span>
                            {user.email}
                          </div>
                          <div>
                            <span className="text-[var(--text-dim)]">
                              WhatsApp:{" "}
                            </span>
                            {user.phone}
                          </div>
                          <div>
                            <span className="text-[var(--text-dim)]">RUT: </span>
                            {user.rut}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-dim)]">
                              Contraseña:{" "}
                            </span>
                            {user.passwordPlain?.trim() ? (
                              <>
                                <span className="font-mono text-[var(--text)]">
                                  {visiblePasswordIds.has(user.id)
                                    ? user.passwordPlain
                                    : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  className="text-[var(--text-dim)] transition hover:text-[var(--text-muted)]"
                                  onClick={() => {
                                    setVisiblePasswordIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(user.id)) next.delete(user.id);
                                      else next.add(user.id);
                                      return next;
                                    });
                                  }}
                                  aria-label={
                                    visiblePasswordIds.has(user.id)
                                      ? "Ocultar contraseña"
                                      : "Mostrar contraseña"
                                  }
                                >
                                  {visiblePasswordIds.has(user.id) ? (
                                    <EyeOff size={15} />
                                  ) : (
                                    <Eye size={15} />
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-[var(--text-dim)]">—</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[var(--text-dim)]">Alta: </span>
                            {new Date(user.createdAt).toLocaleString("es-CL")}
                          </div>
                          {user.blockedReason ? (
                            <div className="sm:col-span-2 text-[var(--accent-glow)]">
                              Motivo bloqueo: {user.blockedReason}
                            </div>
                          ) : null}
                        </dl>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <select
                          className="input w-auto py-2 text-xs"
                          value={user.verificationStatus}
                          onChange={(e) =>
                            adminSetVerificationStatus({
                              userId: user.id,
                              status: e.target.value as VerificationStatus,
                            })
                          }
                        >
                          <option value="pendiente_documento">
                            Falta documento
                          </option>
                          <option value="en_revision">En revisión</option>
                          <option value="verificado">Verificado</option>
                          <option value="rechazado">Rechazado</option>
                        </select>

                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                          onClick={() => {
                            setPasswordUserId(
                              passwordUserId === user.id ? null : user.id,
                            );
                            setNewPassword("");
                            setError("");
                            setMessage("");
                          }}
                        >
                          <KeyRound size={14} />
                          Contraseña
                        </button>

                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                          onClick={() => onToggleBlock(user)}
                          disabled={isAdmin || isSelf}
                        >
                          <Ban size={14} />
                          {user.blocked ? "Desbloquear" : "Bloquear"}
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#f9731644] bg-[#f9731614] px-3 py-2 text-xs text-[var(--accent-glow)] hover:bg-[#f9731622] disabled:opacity-40"
                          onClick={() => onDelete(user)}
                          disabled={isAdmin || isSelf}
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {passwordUserId === user.id ? (
                      <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
                        <p className="mb-3 text-sm font-medium">
                          Nueva contraseña para {user.name}
                        </p>
                        {user.passwordPlain ? (
                          <p className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            Actual:{" "}
                            <span className="font-mono text-[var(--text)]">
                              {visiblePasswordIds.has(user.id)
                                ? user.passwordPlain
                                : "••••••••"}
                            </span>
                            <button
                              type="button"
                              className="text-[var(--text-dim)] transition hover:text-[var(--text-muted)]"
                              onClick={() => {
                                setVisiblePasswordIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(user.id)) next.delete(user.id);
                                  else next.add(user.id);
                                  return next;
                                });
                              }}
                              aria-label={
                                visiblePasswordIds.has(user.id)
                                  ? "Ocultar contraseña"
                                  : "Mostrar contraseña"
                              }
                            >
                              {visiblePasswordIds.has(user.id) ? (
                                <EyeOff size={14} />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                          </p>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <PasswordField
                            label="Nueva contraseña"
                            value={newPassword}
                            onChange={setNewPassword}
                            showHints
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="btn-primary px-4 py-3 text-sm"
                            disabled={busyId === user.id}
                            onClick={() => void onSavePassword(user.id)}
                          >
                            {busyId === user.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {VERIFY_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setVerifyFilter(item)}
                className={
                  verifyFilter === item
                    ? "btn-primary px-3 py-1.5 text-xs"
                    : "btn-secondary px-3 py-1.5 text-xs"
                }
              >
                {item === "todos" ? "Todos" : verificationLabel(item)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {verifyList.length === 0 ? (
              <div className="card p-8 text-center text-[var(--text-muted)]">
                No hay usuarios en este filtro.
              </div>
            ) : (
              verifyList.map((user) => (
                <article
                  key={user.id}
                  className="card grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium">{user.name}</h2>
                      <span
                        className={`badge ${verificationBadge(user.verificationStatus)}`}
                      >
                        {verificationLabel(user.verificationStatus)}
                      </span>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      {[
                        ["Email", user.email],
                        ["WhatsApp", user.phone],
                        ["RUT / ID", user.rut],
                        ["Documento", user.documentType],
                        ["Archivo", user.documentFileName || "Sin archivo"],
                        [
                          "Enviado",
                          user.submittedAt
                            ? new Date(user.submittedAt).toLocaleString("es-CL")
                            : "—",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between gap-3 border-b border-[var(--border)] pb-2"
                        >
                          <dt className="text-[var(--text-dim)]">{label}</dt>
                          <dd className="text-right font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {user.verificationStatus === "en_revision" ||
                    user.verificationStatus === "rechazado" ? (
                      <div className="mt-4 space-y-2">
                        <label className="label">Nota de revisión</label>
                        <input
                          className="input"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              reviewVerification({
                                userId: user.id,
                                status: "verificado",
                                reviewNote: "Identidad validada por el equipo.",
                              })
                            }
                            className="btn-primary px-4 py-2 text-sm"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              reviewVerification({
                                userId: user.id,
                                status: "rechazado",
                                reviewNote: note,
                              })
                            }
                            className="btn-secondary px-4 py-2 text-sm"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-3">
                    {user.documentDataUrl ? (
                      <div className="relative h-72 overflow-hidden rounded-xl">
                        {user.documentDataUrl.startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.documentDataUrl}
                            alt={`Documento de ${user.name}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Image
                            src={user.documentDataUrl}
                            alt={`Documento de ${user.name}`}
                            fill
                            className="object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-72 items-center justify-center text-sm text-[var(--text-dim)]">
                        Sin documento cargado
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[#0d0d10] text-[var(--accent-glow)]">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
          {label}
        </p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
