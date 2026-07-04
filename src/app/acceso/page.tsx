"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ShieldCheck, Upload } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ArtistBadge, SocialStrip } from "@/components/SocialStrip";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useInkora } from "@/lib/store";
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

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function AccesoPage() {
  const registerUser = useInkora((s) => s.registerUser);
  const loginUser = useInkora((s) => s.loginUser);
  const logoutUser = useInkora((s) => s.logoutUser);
  const submitIdentityDocument = useInkora((s) => s.submitIdentityDocument);
  const studio = useInkora((s) => s.studio);
  const { hydrated, sessionUser } = useSessionUser();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("cedula");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const greeting = useMemo(() => {
    if (!sessionUser) return null;
    return sessionUser.verificationStatus === "verificado"
      ? "Listo para pujar en vivo"
      : "Completa tu verificación";
  }, [sessionUser]);

  const onRegister = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const result = registerUser({
      name: sanitizeText(name, 80),
      email: sanitizeEmail(email),
      phone: sanitizePhone(phone),
      rut: sanitizeText(rut, 20),
      documentType,
    });
    if (!result.ok) {
      setError(result.error ?? "No se pudo crear la cuenta.");
      return;
    }
    setSuccess("Cuenta creada. Ahora sube tu documento de identidad.");
  };

  const onLogin = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const result = loginUser({
      email: sanitizeEmail(email),
      phone: sanitizePhone(phone),
    });
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    setSuccess("Sesión iniciada correctamente.");
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

      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="tiktok-panel rounded-2xl p-6">
          <span className="badge badge-rose mb-4">Acceso verificado</span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Entra, verifica y puja en vivo
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Sala protegida de {studio.name}. Regístrate con datos reales, sube tu
            documento y el equipo habilita tu cuenta para ofertar.
          </p>

          <div className="mt-6 space-y-3 text-sm text-[var(--text-muted)]">
            {[
              "Crea tu cuenta con email y WhatsApp",
              "Sube cédula o pasaporte legible",
              "Revisión del equipo de Enderson",
              "Pujas habilitadas al verificar",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 text-[#34d399]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-xs uppercase tracking-wider text-[var(--text-dim)]">
              Sigue al artista
            </p>
            <SocialStrip studio={studio} />
          </div>

          <Link
            href={`/estudio/${studio.slug}/subasta`}
            className="btn-secondary mt-8 inline-flex px-4 py-2 text-sm"
          >
            Volver a la subasta
          </Link>
        </section>

        <section className="space-y-4">
          {!sessionUser ? (
            <div className="card p-6">
              <div className="mb-4 flex gap-2">
                <button
                  className={
                    mode === "register"
                      ? "btn-primary px-4 py-2 text-sm"
                      : "btn-secondary px-4 py-2 text-sm"
                  }
                  onClick={() => setMode("register")}
                >
                  Crear cuenta
                </button>
                <button
                  className={
                    mode === "login"
                      ? "btn-primary px-4 py-2 text-sm"
                      : "btn-secondary px-4 py-2 text-sm"
                  }
                  onClick={() => setMode("login")}
                >
                  Iniciar sesión
                </button>
              </div>

              <form
                onSubmit={mode === "register" ? onRegister : onLogin}
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
                <div>
                  <label className="label">WhatsApp</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={mode === "register"}
                    placeholder={mode === "login" ? "Opcional si usas email" : ""}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-[var(--accent-glow)]">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-[#6ee7b7]">{success}</p>
                ) : null}
                <button type="submit" className="btn-primary w-full py-3">
                  {mode === "register" ? "Crear cuenta" : "Entrar"}
                </button>
                <p className="text-xs text-[var(--text-dim)]">
                  Demo: sofia@email.com ya está verificada.
                </p>
              </form>
            </div>
          ) : (
            <div className="card space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[#0a0a0c]">
                    <Image
                      src={studio.logoUrl}
                      alt={sessionUser.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{sessionUser.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {greeting}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      {sessionUser.email} · {sessionUser.phone}
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">
                      RUT: {sessionUser.rut}
                    </p>
                  </div>
                </div>
                <span
                  className={`badge ${verificationBadge(sessionUser.verificationStatus)}`}
                >
                  {verificationLabel(sessionUser.verificationStatus)}
                </span>
              </div>

              {sessionUser.verificationStatus === "verificado" ? (
                <div className="rounded-2xl border border-[#34d39944] bg-[#34d39914] p-4 text-sm text-[#6ee7b7]">
                  Identidad verificada. Tu sesión está activa para pujar en la
                  sala en vivo.
                </div>
              ) : null}

              {sessionUser.verificationStatus === "en_revision" ? (
                <div className="rounded-2xl border border-[#fbbf2444] bg-[#fbbf2414] p-4 text-sm text-[#fcd34d]">
                  Documento en revisión por el equipo. Te avisaremos al aprobarlo.
                </div>
              ) : null}

              {sessionUser.verificationStatus === "rechazado" ? (
                <div className="rounded-2xl border border-[#f9731644] bg-[#f9731614] p-4 text-sm text-[var(--accent-glow)]">
                  Rechazado:{" "}
                  {sessionUser.reviewNote || "Documento ilegible o datos no coinciden."}{" "}
                  Sube uno nuevo para reintentar.
                </div>
              ) : null}

              {sessionUser.verificationStatus !== "verificado" ? (
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
              ) : (
                <Link
                  href={`/estudio/${studio.slug}/subasta`}
                  className="btn-primary inline-flex w-full justify-center px-4 py-3"
                >
                  Ir a pujar
                </Link>
              )}

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
