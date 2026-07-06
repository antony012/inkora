import type {
  BodyZone,
  QuoteResult,
  SessionPackageId,
  TattooSize,
  TattooStyle,
} from "./types";

export const SESSION_PACKAGES: Record<
  SessionPackageId,
  {
    label: string;
    price: number;
    hoursMin: number;
    hoursMax: number;
    estimatedHours: number;
    description: string;
  }
> = {
  una_hora: {
    label: "1 hora",
    price: 60_000,
    hoursMin: 1,
    hoursMax: 1,
    estimatedHours: 1,
    description: "Perfecta para mini piezas, símbolos o retoques puntuales.",
  },
  corta: {
    label: "Sesión corta",
    price: 150_000,
    hoursMin: 2,
    hoursMax: 3,
    estimatedHours: 2.5,
    description: "Ideal para piezas pequeñas o retoques.",
  },
  estandar: {
    label: "Sesión estándar",
    price: 200_000,
    hoursMin: 3,
    hoursMax: 6,
    estimatedHours: 4.5,
    description: "La opción más elegida para un diseño completo.",
  },
  larga: {
    label: "Sesión larga",
    price: 300_000,
    hoursMin: 6,
    hoursMax: 10,
    estimatedHours: 8,
    description: "Para trabajos extensos o alta cobertura.",
  },
};

export function sessionPackageLabel(id: SessionPackageId): string {
  return SESSION_PACKAGES[id].label;
}

export function sessionHoursLabel(id: SessionPackageId): string {
  const pkg = SESSION_PACKAGES[id];
  if (pkg.hoursMin === pkg.hoursMax) return `${pkg.hoursMin} h`;
  return `${pkg.hoursMin}–${pkg.hoursMax} h`;
}

export function quoteSessionPackage(
  sessionPackage: SessionPackageId,
  depositPercent: number,
): QuoteResult {
  const pkg = SESSION_PACKAGES[sessionPackage];
  const depositAmount =
    Math.round((pkg.price * depositPercent) / 100 / 1000) * 1000;

  return {
    estimatedHours: pkg.estimatedHours,
    minPrice: pkg.price,
    maxPrice: pkg.price,
    suggestedPrice: pkg.price,
    depositAmount,
    complexity:
      sessionPackage === "larga"
        ? "alta"
        : sessionPackage === "estandar"
          ? "media"
          : sessionPackage === "corta"
            ? "baja"
            : "baja",
    factors: [
      `${pkg.label}: ${pkg.hoursMin} a ${pkg.hoursMax} horas de trabajo`,
      pkg.description,
      "Precio fijo por tipo de sesión en CLP",
    ],
  };
}

const SIZE_HOURS: Record<TattooSize, number> = {
  pequeño: 1.5,
  mediano: 3,
  grande: 5,
  manga: 12,
  espalda_completa: 20,
};

const STYLE_MULTIPLIER: Record<TattooStyle, number> = {
  realismo: 1.45,
  tradicional: 1.0,
  neotradicional: 1.15,
  blackwork: 1.1,
  fine_line: 1.05,
  geométrico: 1.2,
  lettering: 0.95,
  japones: 1.35,
  watercolor: 1.25,
  minimalista: 0.85,
  otro: 1.0,
};

const ZONE_MULTIPLIER: Record<BodyZone, number> = {
  brazo: 1.0,
  antebrazo: 1.0,
  mano: 1.25,
  hombro: 1.05,
  pecho: 1.15,
  espalda: 1.1,
  costillas: 1.35,
  pierna: 1.0,
  pantorrilla: 1.0,
  pie: 1.3,
  cuello: 1.4,
  muñeca: 1.15,
  otro: 1.1,
};

export function estimateQuote(input: {
  style: TattooStyle;
  zone: BodyZone;
  size: TattooSize;
  hourlyRate: number;
  depositPercent: number;
}): QuoteResult {
  const baseHours = SIZE_HOURS[input.size];
  const styleMul = STYLE_MULTIPLIER[input.style];
  const zoneMul = ZONE_MULTIPLIER[input.zone];
  const estimatedHours = Math.round(baseHours * styleMul * zoneMul * 10) / 10;

  const base = estimatedHours * input.hourlyRate;
  const minPrice = Math.round(base * 0.9 / 1000) * 1000;
  const maxPrice = Math.round(base * 1.2 / 1000) * 1000;
  const suggestedPrice = Math.round(base / 1000) * 1000;
  const depositAmount = Math.round(
    (suggestedPrice * input.depositPercent) / 100 / 1000,
  ) * 1000;

  const score = styleMul * zoneMul * (baseHours / 3);
  const complexity: QuoteResult["complexity"] =
    score >= 4 ? "extrema" : score >= 2.5 ? "alta" : score >= 1.4 ? "media" : "baja";

  const factors: string[] = [];
  if (styleMul >= 1.3) factors.push(`Estilo ${input.style} de alta complejidad`);
  if (zoneMul >= 1.25) factors.push(`Zona sensible (${input.zone})`);
  if (baseHours >= 8) factors.push("Sesión larga / múltiples citas");
  if (input.size === "pequeño") factors.push("Pieza compacta, setup incluido");
  if (factors.length === 0) factors.push("Complejidad estándar de estudio");

  return {
    estimatedHours,
    minPrice,
    maxPrice,
    suggestedPrice,
    depositAmount,
    complexity,
    factors,
  };
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    solicitud: "Solicitud",
    cotizado: "Cotizado",
    seña_pendiente: "Seña pendiente",
    confirmado: "Confirmado",
    en_curso: "En curso",
    completado: "Completado",
    cancelado: "Cancelado",
    no_show: "No-show",
  };
  return map[status] ?? status;
}

export function styleLabel(style: string): string {
  const map: Record<string, string> = {
    realismo: "Realismo",
    tradicional: "Tradicional",
    neotradicional: "Neotradicional",
    blackwork: "Blackwork",
    fine_line: "Fine line",
    geométrico: "Geométrico",
    lettering: "Lettering",
    japones: "Japonés",
    watercolor: "Watercolor",
    minimalista: "Minimalista",
    otro: "Otro",
  };
  return map[style] ?? style;
}
