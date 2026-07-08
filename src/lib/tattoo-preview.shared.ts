import { bodyZoneLabel } from "./tattoo-preview";
import type { BodyZone } from "./types";

export type TattooPreviewInput = {
  zone: BodyZone;
  bodyImageBase64: string;
  bodyMimeType: string;
  designImageBase64: string;
  designMimeType: string;
  notes?: string;
};

export type TattooPreviewResult =
  | {
      ok: true;
      imageDataUrl: string;
      model: string;
      provider: "pollinations" | "gemini";
      description?: string;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      fallbackSuggested?: boolean;
    };

export function buildTattooPreviewPrompt(zone: BodyZone, notes?: string) {
  const zoneLabel = bodyZoneLabel(zone);
  return [
    "Photorealistic tattoo preview on real human skin.",
    `Image 1: photo of the client's body focused on the "${zoneLabel}" area.`,
    "Image 2: tattoo design to apply.",
    "",
    "Generate ONE realistic image placing the tattoo design onto the skin in image 1.",
    "Rules:",
    `- Place the tattoo on the "${zoneLabel}" with believable scale and orientation.`,
    "- Match skin tone, lighting, perspective, and anatomy.",
    "- The tattoo must look inked into the skin, not like a floating sticker.",
    "- Keep the original framing and background as much as possible.",
    "- No watermark, no text overlays.",
    notes?.trim() ? `Client notes: ${notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function extensionForMime(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}
