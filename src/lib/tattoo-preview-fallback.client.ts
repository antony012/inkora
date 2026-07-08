import type { BodyZone } from "./types";

type Placement = {
  cx: number;
  cy: number;
  width: number;
  rotation: number;
};

const ZONE_PLACEMENT: Record<BodyZone, Placement> = {
  antebrazo: { cx: 0.56, cy: 0.54, width: 0.36, rotation: 0.22 },
  brazo: { cx: 0.58, cy: 0.44, width: 0.38, rotation: 0.12 },
  muñeca: { cx: 0.52, cy: 0.68, width: 0.22, rotation: 0.35 },
  mano: { cx: 0.5, cy: 0.62, width: 0.24, rotation: 0.1 },
  hombro: { cx: 0.54, cy: 0.36, width: 0.34, rotation: -0.08 },
  pecho: { cx: 0.5, cy: 0.48, width: 0.4, rotation: 0 },
  espalda: { cx: 0.5, cy: 0.42, width: 0.42, rotation: 0 },
  costillas: { cx: 0.48, cy: 0.5, width: 0.32, rotation: 0.18 },
  pierna: { cx: 0.5, cy: 0.55, width: 0.38, rotation: 0.05 },
  pantorrilla: { cx: 0.52, cy: 0.58, width: 0.34, rotation: 0.12 },
  pie: { cx: 0.5, cy: 0.62, width: 0.26, rotation: 0.08 },
  cuello: { cx: 0.5, cy: 0.32, width: 0.28, rotation: 0 },
  otro: { cx: 0.5, cy: 0.5, width: 0.36, rotation: 0 },
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    image.src = src;
  });
}

function prepareDesignLayer(design: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = design.naturalWidth;
  canvas.height = design.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  ctx.drawImage(design, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (lum > 238 && saturation < 0.12) {
      data[i + 3] = 0;
      continue;
    }

    if (lum < 28 && saturation < 0.14) {
      data[i + 3] = 0;
      continue;
    }

    if (lum < 70 && saturation < 0.18) {
      const fade = Math.max(0, lum / 70);
      data[i + 3] = Math.round(data[i + 3] * fade);
      continue;
    }

    if (lum > 185 && saturation < 0.2) {
      const fade = Math.max(0, 1 - (lum - 185) / 70);
      data[i + 3] = Math.round(data[i + 3] * fade);
      continue;
    }

    if (lum > 150) {
      const inkBoost = Math.min(1, (lum - 150) / 90);
      data[i] = Math.round(r * (1 - inkBoost * 0.35));
      data[i + 1] = Math.round(g * (1 - inkBoost * 0.35));
      data[i + 2] = Math.round(b * (1 - inkBoost * 0.35));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function applyFeatherMask(
  source: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const masked = document.createElement("canvas");
  masked.width = width;
  masked.height = height;
  const ctx = masked.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = "destination-in";

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.18,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.52,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.72, "rgba(255,255,255,0.92)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return masked;
}

function sampleSkinTone(
  bodyCtx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) {
  const size = radius * 2;
  const x = Math.max(0, Math.min(bodyCtx.canvas.width - size, cx - radius));
  const y = Math.max(0, Math.min(bodyCtx.canvas.height - size, cy - radius));
  const pixels = bodyCtx.getImageData(x, y, size, size).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const pr = pixels[i];
    const pg = pixels[i + 1];
    const pb = pixels[i + 2];
    const lum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
    if (lum < 35 || lum > 235) continue;
    r += pr;
    g += pg;
    b += pb;
    count += 1;
  }

  if (!count) return { r: 180, g: 140, b: 115 };
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function drawTattooBlend(
  ctx: CanvasRenderingContext2D,
  tattoo: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  skin: { r: number; g: number; b: number },
) {
  const cx = x + width / 2;
  const cy = y + height / 2;

  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const layerCtx = layer.getContext("2d");
  if (!layerCtx) throw new Error("Canvas no disponible.");

  layerCtx.save();
  layerCtx.translate(cx, cy);
  layerCtx.rotate(rotation);
  layerCtx.drawImage(tattoo, -width / 2, -height / 2, width, height);
  layerCtx.restore();

  layerCtx.save();
  layerCtx.globalCompositeOperation = "source-atop";
  layerCtx.fillStyle = `rgba(${skin.r}, ${skin.g}, ${skin.b}, 0.14)`;
  layerCtx.fillRect(0, 0, layer.width, layer.height);
  layerCtx.restore();

  const passes: Array<{
    operation: GlobalCompositeOperation;
    alpha: number;
    blur?: number;
  }> = [
    { operation: "multiply", alpha: 0.88 },
    { operation: "color-burn", alpha: 0.22 },
    { operation: "overlay", alpha: 0.18, blur: 0.4 },
    { operation: "soft-light", alpha: 0.12 },
  ];

  for (const pass of passes) {
    ctx.save();
    ctx.globalAlpha = pass.alpha;
    ctx.globalCompositeOperation = pass.operation;
    if (pass.blur) ctx.filter = `blur(${pass.blur}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
    ctx.filter = "none";
  }
}

export async function buildLocalTattooPreview(
  bodyImage: string,
  designImage: string,
  zone: BodyZone = "antebrazo",
) {
  const [body, design] = await Promise.all([
    loadImage(bodyImage),
    loadImage(designImage),
  ]);

  const placement = ZONE_PLACEMENT[zone] ?? ZONE_PLACEMENT.otro;

  const canvas = document.createElement("canvas");
  canvas.width = body.naturalWidth;
  canvas.height = body.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  ctx.drawImage(body, 0, 0, canvas.width, canvas.height);

  const designWidth = canvas.width * placement.width;
  const designHeight =
    (design.naturalHeight / design.naturalWidth) * designWidth;
  const cx = canvas.width * placement.cx;
  const cy = canvas.height * placement.cy;
  const x = cx - designWidth / 2;
  const y = cy - designHeight / 2;

  const cleaned = prepareDesignLayer(design);
  const masked = applyFeatherMask(cleaned, designWidth, designHeight);
  const skin = sampleSkinTone(ctx, cx, cy, Math.round(designWidth * 0.22));

  drawTattooBlend(
    ctx,
    masked,
    x,
    y,
    designWidth,
    designHeight,
    placement.rotation,
    skin,
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}
