import { NextResponse } from "next/server";
import { generateTattooPreview } from "@/lib/tattoo-preview.server";
import { MAX_PREVIEW_IMAGE_BYTES, parseDataUrl } from "@/lib/tattoo-preview";
import type { BodyZone } from "@/lib/types";

export const maxDuration = 120;

const VALID_ZONES = new Set<BodyZone>([
  "brazo",
  "antebrazo",
  "mano",
  "hombro",
  "pecho",
  "espalda",
  "costillas",
  "pierna",
  "pantorrilla",
  "pie",
  "cuello",
  "muñeca",
  "otro",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      zone?: BodyZone;
      bodyImage?: string;
      designImage?: string;
      notes?: string;
    };

    if (!body.zone || !VALID_ZONES.has(body.zone)) {
      return NextResponse.json({ error: "Zona del cuerpo inválida." }, { status: 400 });
    }

    if (!body.bodyImage || !body.designImage) {
      return NextResponse.json(
        { error: "Debes subir la foto del cuerpo y el diseño." },
        { status: 400 },
      );
    }

    const parsedBody = parseDataUrl(body.bodyImage);
    const parsedDesign = parseDataUrl(body.designImage);
    if (!parsedBody || !parsedDesign) {
      return NextResponse.json(
        { error: "Formato de imagen no válido. Usa JPG, PNG o WebP." },
        { status: 400 },
      );
    }

    if (
      parsedBody.bytes > MAX_PREVIEW_IMAGE_BYTES ||
      parsedDesign.bytes > MAX_PREVIEW_IMAGE_BYTES
    ) {
      return NextResponse.json(
        { error: "Cada imagen debe pesar menos de 4.5 MB." },
        { status: 400 },
      );
    }

    const result = await generateTattooPreview({
      zone: body.zone,
      bodyImageBase64: parsedBody.base64,
      bodyMimeType: parsedBody.mimeType,
      designImageBase64: parsedDesign.base64,
      designMimeType: parsedDesign.mimeType,
      notes: body.notes?.slice(0, 400),
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          fallbackSuggested: result.fallbackSuggested,
        },
        { status: result.code === "QUOTA_EXCEEDED" ? 429 : result.code === "PAYMENT_REQUIRED" ? 402 : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      previewImage: result.imageDataUrl,
      description: result.description,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    console.error("tattoo-preview route error", error);
    return NextResponse.json(
      { error: "Error interno al generar la previsualización." },
      { status: 500 },
    );
  }
}
