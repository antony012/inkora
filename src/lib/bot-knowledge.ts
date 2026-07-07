import { alreadyQuoted } from "./chat-bot";
import { FLASH_DESIGNS } from "./flash-designs";
import {
  estimateQuote,
  formatMoney,
  SESSION_PACKAGES,
  styleLabel,
} from "./quote-engine";
import type {
  Artist,
  LeadQualification,
  Studio,
  TattooStyle,
  WhatsAppConversation,
} from "./types";

export type CrmReplyMode = "rules" | "gemini" | "hybrid";

export interface CrmBotConfig {
  replyMode: CrmReplyMode;
  geminiApiKey: string;
  geminiModel: string;
}

export const DEFAULT_CRM_BOT_CONFIG: CrmBotConfig = {
  replyMode: "hybrid",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
};

export const CRM_REPLY_MODES: Array<{
  id: CrmReplyMode;
  label: string;
  description: string;
}> = [
  {
    id: "rules",
    label: "Motor local",
    description: "Reglas fijas. Rápido, precios exactos, menos natural.",
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "Solo IA. Conversación natural con el conocimiento de Enderxon.",
  },
  {
    id: "hybrid",
    label: "Híbrido",
    description: "Gemini primero; si falla, usa el motor local.",
  },
];

const SPECIALTY_LABELS: Record<TattooStyle, string> = {
  realismo: "Realismo e hiperrealismo",
  tradicional: "Tradicional / old school",
  neotradicional: "Neotradicional",
  blackwork: "Blackwork y piezas en negro sólido",
  fine_line: "Fine line y línea fina",
  geométrico: "Geométrico y ornamental",
  lettering: "Lettering y tipografía",
  japones: "Japonés / oriental",
  watercolor: "Watercolor / acuarela",
  minimalista: "Minimalista",
  otro: "Piezas personalizadas",
};

const PRICE_EXAMPLES: Array<{
  label: string;
  style: TattooStyle;
  zone: "muñeca" | "antebrazo" | "espalda";
  size: "pequeño" | "mediano" | "grande";
}> = [
  { label: "Fine line chico en muñeca", style: "fine_line", zone: "muñeca", size: "pequeño" },
  { label: "Blackwork mediano en antebrazo", style: "blackwork", zone: "antebrazo", size: "mediano" },
  { label: "Realismo mediano en antebrazo", style: "realismo", zone: "antebrazo", size: "mediano" },
  { label: "Lettering pequeño en muñeca", style: "lettering", zone: "muñeca", size: "pequeño" },
  { label: "Minimalista pequeño", style: "minimalista", zone: "muñeca", size: "pequeño" },
];

function packagesBlock() {
  return Object.entries(SESSION_PACKAGES)
    .map(
      ([, p]) =>
        `- ${p.label}: ${formatMoney(p.price)} (${p.hoursMin === p.hoursMax ? `${p.hoursMin} h` : `${p.hoursMin}–${p.hoursMax} h`}) — ${p.description}`,
    )
    .join("\n");
}

function flashBlock() {
  return FLASH_DESIGNS.map((f) => {
    const status = f.available ? "disponible" : "no disponible";
    return `- ${f.name} (${styleLabel(f.style)}, ${status}): ${f.description} Desde ${formatMoney(f.fromPrice)}, ${f.duration}.`;
  }).join("\n");
}

function priceExamplesBlock(hourlyRate: number, depositPercent: number) {
  return PRICE_EXAMPLES.map((ex) => {
    const q = estimateQuote({
      style: ex.style,
      zone: ex.zone,
      size: ex.size,
      hourlyRate,
      depositPercent,
    });
    return `- ${ex.label}: ~${formatMoney(q.suggestedPrice)} (${q.estimatedHours} h), apartado ${formatMoney(q.depositAmount)}`;
  }).join("\n");
}

function specialtiesBlock(artist: Artist) {
  return artist.specialties
    .map((s) => `- ${SPECIALTY_LABELS[s] ?? styleLabel(s)}`)
    .join("\n");
}

export type BotKnowledgeInput = {
  studio: Studio;
  artist: Artist;
  qualification: LeadQualification;
  conversation?: WhatsAppConversation;
  /** Texto de config/enderxon-gemini-education.md (solo en servidor). */
  educationAppend?: string;
};

export function buildEnderxonSystemPrompt(input: BotKnowledgeInput): string {
  const { studio, artist, qualification, conversation, educationAppend } = input;
  const hourlyRate = artist.hourlyRate;
  const depositPercent = studio.depositPercent;

  let quoteBlock = "";
  if (qualification.style && qualification.zone && qualification.size) {
    const quote = estimateQuote({
      style: qualification.style,
      zone: qualification.zone,
      size: qualification.size,
      hourlyRate,
      depositPercent,
    });
    quoteBlock = `
COTIZACIÓN OFICIAL DE ESTE CLIENTE (no inventes otros montos):
- Estilo: ${styleLabel(qualification.style)} · Zona: ${qualification.zone} · Tamaño: ${qualification.size}
- Estimado: ${formatMoney(quote.suggestedPrice)}
- Rango: ${formatMoney(quote.minPrice)} – ${formatMoney(quote.maxPrice)}
- Duración aprox.: ${quote.estimatedHours} h
- Apartado para cupo: ${depositPercent}% = ${formatMoney(quote.depositAmount)}
`;
  }

  const quoted = conversation ? alreadyQuoted(conversation.messages) : false;
  const quoteRule = quoted
    ? "Ya diste un precio en el chat. NO lo repitas salvo que el cliente lo pida de nuevo."
    : "Si das precio, usa solo los montos oficiales de arriba o los ejemplos de referencia.";

  const education = educationAppend?.trim() ?? "";
  const educationBlock = education
    ? `\nGUÍA DE EDUCACIÓN (config/enderxon-gemini-education.md — prioridad alta):\n${education}\n`
    : "";

  return `Eres ${artist.name}, tatuador profesional en ${studio.city}, Chile. Respondes por WhatsApp como persona real, en español neutro, cercano y claro. Nunca digas que eres IA, bot o asistente.
${educationBlock}

QUIÉN ERES:
- ${studio.tagline}
- ${artist.bio}
- Tarifa base del estudio: ${formatMoney(hourlyRate)}/hora
- Los precios finales dependen de estilo, zona del cuerpo, tamaño y complejidad del diseño

ESTILOS QUE TRABAJAS:
${specialtiesBlock(artist)}

REGLAS DE CONVERSACIÓN:
- Máximo 3 oraciones cortas. Sin emojis excesivos.
- Vende con naturalidad: orienta, recomienda y guía hacia agendar.
- Para apartar cupo el cliente paga el ${depositPercent}% del valor total. NUNCA uses la palabra "seña"; di "apartar cupo" o "apartado del ${depositPercent}%".
- El resto del valor se paga el día de la sesión.
- Si preguntan qué recomiendas o si hay diseños/modelos disponibles, menciona 1–2 flash del catálogo y pregunta qué le gusta.
- Si preguntan cómo es el proceso, explícalo en orden: (1) idea o referencia, (2) confirmar diseño y valor, (3) apartado ${depositPercent}%, (4) agendar fecha, (5) sesión y pago del resto. No saltes directo a fechas.
- Si quieren agendar, propón martes, jueves o sábado y explica el apartado.
- Si envían foto, confirma que la revisarás antes de cerrar el diseño.
- Si dudan por precio, ofrece ajustar diseño o dividir en sesiones sin presionar.
- ${quoteRule}

PROCESO DE RESERVA:
1. Cliente cuenta la idea (estilo, zona, tamaño) o manda referencia/foto
2. Tú cotizas con los precios oficiales
3. Para confirmar fecha, pide el apartado del ${depositPercent}% por transferencia
4. Sesión en el estudio; el cliente paga el saldo ese día
5. Entregas cuidados post-tatuaje

PAQUETES DE SESIÓN (precios fijos en CLP):
${packagesBlock()}

EJEMPLOS DE COTIZACIÓN (referencia, no inventar fuera de estos rangos):
${priceExamplesBlock(hourlyRate, depositPercent)}

CATÁLOGO FLASH / DISEÑOS:
${flashBlock()}

DISPONIBILIDAD:
- Días habituales: martes, jueves y sábado
- Horarios: coordinar por WhatsApp según cupo

DATOS DE CONTACTO:
- Estudio: ${studio.name}
- Teléfono / WhatsApp: ${studio.phone}
- Instagram: ${studio.instagram}
- TikTok: ${studio.tiktok}
- Ciudad: ${studio.city}

CUIDADOS POST-TATTOO (si preguntan):
${studio.aftercareText}

CALIFICACIÓN ACTUAL DEL CLIENTE:
- Estilo: ${qualification.style ? styleLabel(qualification.style) : "sin definir"}
- Zona: ${qualification.zone ?? "sin definir"}
- Tamaño: ${qualification.size ?? "sin definir"}
- Referencia: ${qualification.hasReference ? "sí" : "no"}
- Intención: ${qualification.intent}
${quoteBlock}`;
}

export function botKnowledgeSummary(artist: Artist, studio: Studio): string {
  const availableFlash = FLASH_DESIGNS.filter((f) => f.available).length;
  return [
    artist.name,
    `${artist.specialties.length} estilos`,
    `${Object.keys(SESSION_PACKAGES).length} paquetes`,
    `${availableFlash} flash disponibles`,
    `apartado ${studio.depositPercent}%`,
    formatMoney(artist.hourlyRate) + "/h",
  ].join(" · ");
}
