import type { BodyZone } from "./types";

export type BodyZoneOption = {
  id: BodyZone;
  label: string;
  hint: string;
};

export const BODY_ZONE_OPTIONS: BodyZoneOption[] = [
  { id: "antebrazo", label: "Antebrazo", hint: "Foto clara del antebrazo, buena luz." },
  { id: "brazo", label: "Brazo", hint: "Muestra el brazo completo o la zona alta." },
  { id: "muñeca", label: "Muñeca", hint: "Ideal para piezas pequeñas y fine line." },
  { id: "mano", label: "Mano", hint: "Palma o dorso, sin sombras fuertes." },
  { id: "hombro", label: "Hombro", hint: "Incluye hombro y parte del brazo." },
  { id: "pecho", label: "Pecho", hint: "Foto frontal o lateral del pecho." },
  { id: "espalda", label: "Espalda", hint: "Espalda completa o zona superior." },
  { id: "costillas", label: "Costillas", hint: "Lateral del torso, zona de costillas." },
  { id: "pierna", label: "Pierna", hint: "Muslo o pierna según la pieza." },
  { id: "pantorrilla", label: "Pantorrilla", hint: "Vista lateral o frontal de la pantorrilla." },
  { id: "pie", label: "Pie", hint: "Empeine o lateral del pie." },
  { id: "cuello", label: "Cuello", hint: "Zona del cuello o nuca visible." },
];

export function bodyZoneLabel(zone: BodyZone) {
  return BODY_ZONE_OPTIONS.find((item) => item.id === zone)?.label ?? zone;
}

export function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1].toLowerCase().replace("jpg", "jpeg");
  const base64 = match[2];
  const bytes = Math.floor((base64.length * 3) / 4);
  return { mimeType, base64, bytes };
}

export const MAX_PREVIEW_IMAGE_BYTES = 4_500_000;
