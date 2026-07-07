import type { TattooStyle } from "./types";

export type FlashDesign = {
  id: string;
  name: string;
  style: TattooStyle;
  description: string;
  fromPrice: number;
  duration: string;
  available: boolean;
};

export const FLASH_DESIGNS: FlashDesign[] = [
  {
    id: "flash-1",
    name: "Mini flor fine line",
    style: "fine_line",
    description: "Flor minimalista, ideal para muñeca o tobillo.",
    fromPrice: 60_000,
    duration: "1 h",
    available: true,
  },
  {
    id: "flash-2",
    name: "Símbolo minimalista",
    style: "minimalista",
    description: "Línea fina, perfecto para primera tattoo o espacio pequeño.",
    fromPrice: 60_000,
    duration: "1 h",
    available: true,
  },
  {
    id: "flash-3",
    name: "Palabra corta lettering",
    style: "lettering",
    description: "Hasta 8 letras, estilo limpio en muñeca o antebrazo.",
    fromPrice: 60_000,
    duration: "1 h",
    available: true,
  },
  {
    id: "flash-4",
    name: "Ornamental blackwork",
    style: "blackwork",
    description: "Pieza negra compacta, muy legible en antebrazo.",
    fromPrice: 150_000,
    duration: "sesión corta",
    available: true,
  },
  {
    id: "flash-5",
    name: "Geométrico pequeño",
    style: "geométrico",
    description: "Formas y líneas, funciona bien en muñeca o detrás de la oreja.",
    fromPrice: 60_000,
    duration: "1 h",
    available: false,
  },
];

export function availableFlashSummary() {
  return FLASH_DESIGNS.filter((f) => f.available)
    .map(
      (f) =>
        `- ${f.name} (${f.style}): ${f.description} Desde $${f.fromPrice.toLocaleString("es-CL")}, ${f.duration}.`,
    )
    .join("\n");
}
