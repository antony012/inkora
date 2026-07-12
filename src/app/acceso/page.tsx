"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Upload, Clock3 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PasswordField } from "@/components/PasswordField";
import { ProfilePhotoUpload } from "@/components/UserAvatar";
import { ArtistBadge } from "@/components/SocialStrip";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useCarrizo } from "@/lib/store";
import { postLoginPath } from "@/lib/auth";
import { userAccessMessage } from "@/lib/user-access";
import {
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
} from "@/lib/validation";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";
import type { DocumentType } from "@/lib/types";
import { cn } from "@/lib/utils";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function AccesoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
          Cargando acceso...
        </div>
      }
    >
      <AccesoPageContent />
    </Suspense>
  );
}

function AccesoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginFrom = searchParams.get("from");
  const modeParam = searchParams.get("mode");
  const registerUser = useCarrizo((s) => s.registerUser);
  const loginUser = useCarrizo((s) => s.loginUser);
  const changePassword = useCarrizo((s) => s.changePassword);
  const resetPassword = useCarrizo((s) => s.resetPassword);
  const logoutUser = useCarrizo((s) => s.logoutUser);
  const submitIdentityDocument = useCarrizo((s) => s.submitIdentityDocument);
  const updateProfilePhoto = useCarrizo((s) => s.updateProfilePhoto);
  const studio = useCarrizo((s) => s.studio);
  const { hydrated, sessionUser } = useSessionUser();

  const initialMode =
    modeParam === "login" || modeParam === "recover" || modeParam === "register"
      ? modeParam
      : "login";
  const [mode, setMode] = useState<"login" | "register" | "recover">(initialMode);

  useEffect(() => {
    if (
      modeParam === "login" ||
      modeParam === "recover" ||
      modeParam === "register"
    ) {
      setMode(modeParam);
    }
  }, [modeParam]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("cedula");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearPasswordFields = () => {
    setPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const switchMode = (next: "login" | "register" | "recover") => {
    setMode(next);
    clearPasswordFields();
    setError("");
    setSuccess("");
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerUser({
        name: sanitizeText(name, 80),
        email: sanitizeEmail(email),
        phone: sanitizePhone(phone),
        rut: sanitizeText(rut, 20),
        documentType,
        password,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo crear la cuenta.");
        return;
      }
      setSuccess("Cuenta creada. Ya puedes pujar y reservar.");
      setPassword("");
      setConfirmPassword("");
      router.push(`/estudio/${studio.slug}/subasta`);
    } finally {
      setSubmitting(false);
    }
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    setSubmitting(true);
    try {
      const result = await loginUser({
        email: sanitizeEmail(email),
        password,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo iniciar sesión.");
        return;
      }
      setSuccess("Sesión iniciada correctamente.");
      setPassword("");
      const loggedInUser = useCarrizo
        .getState()
        .users.find((user) => user.email === sanitizeEmail(email));
      router.push(postLoginPath(loggedInUser, studio.slug, loginFrom));
    } finally {
      setSubmitting(false);
    }
  };

  const onRecover = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPassword({
        email: sanitizeEmail(email),
        phone: sanitizePhone(phone),
        rut: sanitizeText(rut, 20),
        newPassword: password,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo restablecer la contraseña.");
        return;
      }
      setSuccess("Contraseña actualizada. Ya puedes iniciar sesión.");
      clearPasswordFields();
      switchMode("login");
    } finally {
      setSubmitting(false);
    }
  };

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setError("");
    setSuccess("");

    if (newPassword !== confirmNewPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({
        userId: sessionUser.id,
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setSuccess("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowChangePassword(false);
    } finally {
      setSubmitting(false);
    }
  };

  const onProfilePhoto = async (file: File) => {
    if (!sessionUser) return;
    setError("");
    setSuccess("");

    if (file.size > 2 * 1024 * 1024) {
      setError("La foto de perfil no puede superar 2 MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("La foto de perfil debe ser una imagen.");
      return;
    }

    const profilePhotoUrl = await fileToDataUrl(file);
    const result = updateProfilePhoto({
      userId: sessionUser.id,
      profilePhotoUrl,
    });

    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar la foto.");
      return;
    }

    setSuccess("Foto de perfil actualizada.");
  };

  const onUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setError("");
    setSuccess("");

    if (!preview || !fileName) {
      setError("Selecciona una foto o PDF de tu documento.");
      return;
    }

    const result = submitIdentityDocument({
      userId: sessionUser.id,
      documentDataUrl: preview,
      documentFileName: fileName,
    });

    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar el documento.");
      return;
    }

    setSuccess(
      "Documento enviado a revisión. Nuestro equipo validará tus datos antes de habilitar pujas.",
    );
    setPreview("");
    setFileName("");
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Cargando acceso...
      </div>
    );
  }

  return (
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-6">
        <BrandLogo href={`/estudio/${studio.slug}`} variant="compact" showImage={false} />
        <ArtistBadge />
      </header>

      <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-6">
        <section className="space-y-4">
          {!sessionUser ? (
            <div className="card p-6">
              {mode === "recover" ? (
                <div className="mb-4">
                  <h2 className="text-lg font-medium">Recuperar contraseña</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Confirma tu identidad con email, WhatsApp y RUT registrados.
                  </p>
                </div>
              ) : (
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    className={
                      mode === "login"
                        ? "btn-primary px-4 py-2 text-sm"
                        : "btn-secondary px-4 py-2 text-sm"
                    }
                    onClick={() => switchMode("login")}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    className={
                      mode === "register"
                        ? "btn-primary px-4 py-2 text-sm"
                        : "btn-secondary px-4 py-2 text-sm"
                    }
                    onClick={() => switchMode("register")}
                  >
                    Crear cuenta
                  </button>
                </div>
              )}

              <form
                onSubmit={
                  mode === "register"
                    ? onRegister
                    : mode === "recover"
                      ? onRecover
                      : onLogin
                }
                className="space-y-3"
              >
                {mode === "register" ? (
                  <>
                    <div>
                      <label className="label">Nombre completo</label>
                      <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">RUT / ID</label>
                      <input
                        className="input"
                        value={rut}
                        onChange={(e) => setRut(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Tipo de documento</label>
                      <select
                        className="input"
                        value={documentType}
                        onChange={(e) =>
                          setDocumentType(e.target.value as DocumentType)
                        }
                      >
                        <option value="cedula">Cédula de identidad</option>
                        <option value="pasaporte">Pasaporte</option>
                      </select>
                    </div>
                  </>
                ) : null}
                {mode === "recover" ? (
                  <div>
                    <label className="label">RUT / ID</label>
                    <input
                      className="input"
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                      required
                    />
                  </div>
                ) : null}
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {(mode === "register" || mode === "recover") ? (
                  <div>
                    <label className="label">WhatsApp</label>
                    <input
                      className="input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                ) : null}
                {mode !== "recover" ? (
                  <PasswordField
                    label="Contraseña"
                    value={password}
                    onChange={setPassword}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    showHints={mode === "register"}
                  />
                ) : null}
                {mode === "register" || mode === "recover" ? (
                  <>
                    <PasswordField
                      label={
                        mode === "recover"
                          ? "Nueva contraseña"
                          : "Confirmar contraseña"
                      }
                      value={mode === "recover" ? password : confirmPassword}
                      onChange={
                        mode === "recover" ? setPassword : setConfirmPassword
                      }
                      autoComplete="new-password"
                      showHints={mode === "recover"}
                    />
                    {mode === "recover" ? (
                      <PasswordField
                        label="Confirmar nueva contraseña"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                      />
                    ) : null}
                  </>
                ) : null}
                {mode === "login" ? (
                  <button
                    type="button"
                    className="text-left text-sm text-[var(--accent-glow)] transition hover:underline"
                    onClick={() => switchMode("recover")}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                ) : null}
                {error ? (
                  <p className="text-sm text-[var(--accent-glow)]">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-[#6ee7b7]">{success}</p>
                ) : null}
                <button
                  type="submit"
                  className="btn-primary w-full py-3"
                  disabled={submitting}
                >
                  {submitting
                    ? "Procesando..."
                    : mode === "register"
                      ? "Crear cuenta"
                      : mode === "recover"
                        ? "Restablecer contraseña"
                        : "Entrar"}
                </button>
                {mode === "recover" ? (
                  <button
                    type="button"
                    className="btn-secondary w-full py-3 text-sm"
                    onClick={() => switchMode("login")}
                  >
                    Volver a iniciar sesión
                  </button>
                ) : null}
              </form>
            </div>
          ) : (
            <div className="card space-y-5 p-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-5">
                <ProfilePhotoUpload
                  name={sessionUser.name}
                  profilePhotoUrl={sessionUser.profilePhotoUrl}
                  verificationStatus={sessionUser.verificationStatus}
                  onSelect={onProfilePhoto}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{sessionUser.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {userAccessMessage(sessionUser).detail}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-dim)]">
                    {sessionUser.email} · {sessionUser.phone}
                  </p>
                  <p className="text-xs text-[var(--text-dim)]">
                    RUT: {sessionUser.rut}
                  </p>
                </div>
                <span
                  className={`badge ${verificationBadge(sessionUser.verificationStatus)}`}
                >
                  {verificationLabel(sessionUser.verificationStatus)}
                </span>
              </div>

              {sessionUser.verificationStatus === "verificado" ? (
                <div className="rounded-2xl border border-[#34d39944] bg-[#34d39914] p-4 text-sm text-[#6ee7b7]">
                  Identidad verificada. Puedes reservar turnos y pujar en subastas.
                </div>
              ) : sessionUser.verificationStatus === "rechazado" ? (
                <div className="rounded-2xl border border-[#f9731644] bg-[#f9731614] p-4 text-sm text-[var(--accent-glow)]">
                  Rechazado:{" "}
                  {sessionUser.reviewNote || "Documento ilegible o datos no coinciden."}{" "}
                  Sube uno nuevo para reintentar.
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm text-[var(--text-muted)]">
                  {userAccessMessage(sessionUser).detail}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href={`/estudio/${studio.slug}/reservar`}
                  className="btn-primary inline-flex justify-center px-4 py-3 text-sm"
                >
                  Reservar turno
                </Link>
                {sessionUser.verificationStatus === "verificado" ? (
                  <Link
                    href={`/estudio/${studio.slug}/subasta`}
                    className="btn-secondary inline-flex justify-center px-4 py-3 text-sm"
                  >
                    Ir a subasta
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[#0d0d10] px-4 py-3 text-center text-xs text-[var(--text-muted)]">
                    Subasta: requiere documento aprobado
                  </span>
                )}
              </div>

              {sessionUser.verificationStatus === "en_revision" ? (
                <div
                  className={cn(
                    "space-y-4 rounded-2xl border border-[#2a2a2f] bg-[#111114] p-4",
                    "pointer-events-none select-none opacity-80",
                  )}
                  aria-disabled="true"
                >
                  <div className="flex items-center gap-2">
                    <Clock3 size={16} className="text-[var(--text-dim)]" />
                    <span className="badge badge-amber">En revisión</span>
                  </div>
                  <p className="text-sm text-[var(--text-dim)]">
                    Documento enviado. Esta sección queda bloqueada hasta que el
                    equipo apruebe tu identidad.
                  </p>

                  <div>
                    <p className="label text-[var(--text-dim)]">
                      Documento de identidad
                    </p>
                    <div className="mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2a2a2f] bg-[#0a0a0c] px-4 py-6 text-center">
                      <Upload className="mb-2 text-[var(--text-dim)]" size={22} />
                      <span className="text-sm text-[var(--text-dim)]">
                        {sessionUser.documentFileName || "Documento en revisión"}
                      </span>
                    </div>
                  </div>

                  {sessionUser.documentDataUrl ? (
                    <div className="relative h-48 overflow-hidden rounded-2xl border border-[#2a2a2f] grayscale">
                      {sessionUser.documentDataUrl.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sessionUser.documentDataUrl}
                          alt="Documento enviado"
                          className="h-full w-full bg-black object-contain"
                        />
                      ) : (
                        <Image
                          src={sessionUser.documentDataUrl}
                          alt="Documento enviado"
                          fill
                          className="bg-black object-contain"
                        />
                      )}
                    </div>
                  ) : null}

                  <div className="inline-flex w-full items-center justify-center rounded-full border border-[#2a2a2f] bg-[#0a0a0c] px-4 py-3 text-sm text-[var(--text-dim)]">
                    Enviado a revisión
                  </div>
                </div>
              ) : sessionUser.verificationStatus === "pendiente_documento" ||
                sessionUser.verificationStatus === "rechazado" ? (
                <form onSubmit={onUpload} className="space-y-3">
                  <div>
                    <label className="label">Documento de identidad</label>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[#0d0d10] px-4 py-8 text-center">
                      <Upload className="mb-2 text-[var(--accent-glow)]" size={22} />
                      <span className="text-sm">
                        {fileName || "Sube foto de cédula o pasaporte"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 4 * 1024 * 1024) {
                            setError("El archivo no puede superar 4MB.");
                            return;
                          }
                          const dataUrl = await fileToDataUrl(file);
                          setPreview(dataUrl);
                          setFileName(file.name);
                          setError("");
                        }}
                      />
                    </label>
                  </div>

                  {preview && preview.startsWith("data:image") ? (
                    <div className="relative h-48 overflow-hidden rounded-2xl border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Documento"
                        className="h-full w-full bg-black object-contain"
                      />
                    </div>
                  ) : null}

                  {sessionUser.documentDataUrl && !preview ? (
                    <div className="relative h-40 overflow-hidden rounded-2xl border border-[var(--border)]">
                      <Image
                        src={sessionUser.documentDataUrl}
                        alt="Documento enviado"
                        fill
                        className="bg-black object-contain"
                      />
                    </div>
                  ) : null}

                  {error ? (
                    <p className="text-sm text-[var(--accent-glow)]">{error}</p>
                  ) : null}
                  {success ? (
                    <p className="text-sm text-[#6ee7b7]">{success}</p>
                  ) : null}

                  <button type="submit" className="btn-primary w-full py-3">
                    Enviar a revisión
                  </button>
                </form>
              ) : null}

              <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Seguridad</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Cambia tu contraseña cuando quieras.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-sm"
                    onClick={() => {
                      setShowChangePassword((current) => !current);
                      setError("");
                      setSuccess("");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                  >
                    {showChangePassword ? "Ocultar" : "Cambiar"}
                  </button>
                </div>

                {showChangePassword ? (
                  <form onSubmit={onChangePassword} className="mt-4 space-y-3">
                    <PasswordField
                      label="Contraseña actual"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      autoComplete="current-password"
                    />
                    <PasswordField
                      label="Nueva contraseña"
                      value={newPassword}
                      onChange={setNewPassword}
                      autoComplete="new-password"
                      showHints
                    />
                    <PasswordField
                      label="Confirmar nueva contraseña"
                      value={confirmNewPassword}
                      onChange={setConfirmNewPassword}
                      autoComplete="new-password"
                    />
                    <button
                      type="submit"
                      className="btn-primary w-full py-3"
                      disabled={submitting}
                    >
                      {submitting ? "Guardando..." : "Guardar nueva contraseña"}
                    </button>
                  </form>
                ) : null}
              </div>

              <button
                onClick={logoutUser}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
