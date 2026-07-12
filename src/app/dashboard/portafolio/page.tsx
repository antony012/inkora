"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ImagePlus, Pencil, Trash2, Upload, X } from "lucide-react";
import { styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
import type { PortfolioItem, TattooStyle } from "@/lib/types";

const styles: TattooStyle[] = [
  "realismo",
  "blackwork",
  "fine_line",
  "tradicional",
  "neotradicional",
  "minimalista",
  "geométrico",
  "lettering",
  "japones",
  "watercolor",
  "otro",
];

const MAX_IMAGE_BYTES = 2_500_000;

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function PortfolioImage({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  const isData = src.startsWith("data:");
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized={isData}
      className="object-cover"
      sizes={sizes}
    />
  );
}

export default function PortafolioPage() {
  const portfolio = useCarrizo((s) => s.portfolio);
  const artists = useCarrizo((s) => s.artists);
  const studio = useCarrizo((s) => s.studio);
  const createItem = useCarrizo((s) => s.createPortfolioItem);
  const updateItem = useCarrizo((s) => s.updatePortfolioItem);
  const deleteItem = useCarrizo((s) => s.deletePortfolioItem);

  const defaultArtistId = artists[0]?.id ?? "artist-1";
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<TattooStyle>("realismo");
  const [featured, setFeatured] = useState(true);
  const [artistId, setArtistId] = useState(defaultArtistId);
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setStyle("realismo");
    setFeatured(true);
    setArtistId(defaultArtistId);
    setImage("");
    setImageName("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setStyle(item.style);
    setFeatured(item.featured);
    setArtistId(item.artistId);
    setImage(item.image);
    setImageName("");
    setError("");
    setShowForm(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen no puede superar 2,5 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
      setImageName(file.name);
      setError("");
    } catch {
      setError("No se pudo cargar la imagen.");
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!image) {
      setError("Carga una imagen para la pieza.");
      return;
    }
    if (!title.trim()) {
      setError("Escribe un título.");
      return;
    }

    if (editingId) {
      updateItem(editingId, {
        title: title.trim(),
        style,
        image,
        featured,
        artistId,
      });
    } else {
      createItem({
        artistId,
        title: title.trim(),
        style,
        image,
        featured,
      });
    }

    setShowForm(false);
    resetForm();
  };

  const onDelete = (item: PortfolioItem) => {
    const ok = window.confirm(
      `¿Eliminar “${item.title}” del portafolio? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    deleteItem(item.id);
    if (editingId === item.id) {
      setShowForm(false);
      resetForm();
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portafolio</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Carga y edita los trabajos que se muestran en la página pública de{" "}
            {studio.name}.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
          <ImagePlus size={16} />
          Cargar imagen
        </button>
      </div>

      {showForm ? (
        <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">
                {editingId ? "Editar pieza" : "Nueva pieza"}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--text-dim)]">
                La imagen se publica en la galería del estudio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-full border border-[var(--border)] p-2 text-[var(--text-muted)] hover:text-white"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <div className="relative h-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0d0d10]">
                {image ? (
                  <PortfolioImage src={image} alt={title || "Vista previa"} sizes="220px" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-[var(--text-dim)]">
                    <Upload size={22} />
                    Sin imagen
                  </div>
                )}
              </div>
              <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2 px-3 py-2 text-sm">
                <Upload size={14} />
                {image ? "Cambiar imagen" : "Elegir imagen"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => onImageUpload(event.target.files?.[0] ?? null)}
                />
              </label>
              {imageName ? (
                <p className="truncate text-xs text-[var(--text-dim)]">{imageName}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="portfolio-title">
                  Título
                </label>
                <input
                  id="portfolio-title"
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Brazo realismo"
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="portfolio-style">
                  Estilo
                </label>
                <select
                  id="portfolio-style"
                  className="input"
                  value={style}
                  onChange={(event) => setStyle(event.target.value as TattooStyle)}
                >
                  {styles.map((value) => (
                    <option key={value} value={value}>
                      {styleLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              {artists.length > 1 ? (
                <div>
                  <label className="label" htmlFor="portfolio-artist">
                    Artista
                  </label>
                  <select
                    id="portfolio-artist"
                    className="input"
                    value={artistId}
                    onChange={(event) => setArtistId(event.target.value)}
                  >
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Destacar en galería
              </label>

              {error ? (
                <p className="sm:col-span-2 text-sm text-[#fb7185]">{error}</p>
              ) : null}

              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button type="submit" className="btn-primary">
                  {editingId ? "Guardar cambios" : "Publicar en portafolio"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {portfolio.map((item) => {
          const artist = artists.find((a) => a.id === item.artistId);
          return (
            <article key={item.id} className="card overflow-hidden card-hover">
              <div className="relative h-52">
                <PortfolioImage src={item.image} alt={item.title} sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {artist?.name} · {styleLabel(item.style)}
                    </p>
                  </div>
                  {item.featured ? (
                    <span className="badge badge-gold shrink-0">Destacado</span>
                  ) : (
                    <span className="badge badge-gray shrink-0">Galería</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#fb718533] px-3 py-1.5 text-xs text-[#fb7185] transition hover:bg-[#fb718514]"
                  >
                    <Trash2 size={13} />
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!portfolio.length ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-[var(--text-muted)]">
            Aún no hay piezas. Carga la primera imagen del portafolio.
          </p>
          <button type="button" onClick={openCreate} className="btn-primary mt-4">
            Cargar imagen
          </button>
        </div>
      ) : null}
    </div>
  );
}
