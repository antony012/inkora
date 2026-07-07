import { estimateQuote, formatMoney, styleLabel } from "./quote-engine";
import { FLASH_DESIGNS } from "./flash-designs";
import type {
  BodyZone,
  ChatMessage,
  LeadIntent,
  LeadQualification,
  LeadTemperature,
  ReferenceReviewStatus,
  SessionPackageId,
  Studio,
  TattooSize,
  TattooStyle,
  WhatsAppConversation,
} from "./types";

type Dict<T extends string> = Array<{ value: T; keywords: string[] }>;

const STYLE_KEYWORDS: Dict<TattooStyle> = [
  { value: "realismo", keywords: ["realismo", "realista", "retrato", "hiperrealismo"] },
  { value: "blackwork", keywords: ["blackwork", "black work", "negro solido", "negro sólido", "mancha negra"] },
  { value: "fine_line", keywords: ["fine line", "fineline", "linea fina", "línea fina", "finas"] },
  { value: "geométrico", keywords: ["geometrico", "geométrico", "geometria", "geometría", "mandala"] },
  { value: "lettering", keywords: ["lettering", "letra", "letras", "frase", "nombre", "caligrafia", "caligrafía"] },
  { value: "japones", keywords: ["japones", "japonés", "oriental", "irezumi", "dragon", "dragón", "koi"] },
  { value: "watercolor", keywords: ["watercolor", "acuarela", "acuarelas"] },
  { value: "minimalista", keywords: ["minimalista", "minimal", "mini", "pequeñito", "simple", "sencillo"] },
  { value: "neotradicional", keywords: ["neotradicional", "neo tradicional", "neo-tradicional"] },
  { value: "tradicional", keywords: ["tradicional", "old school", "oldschool", "americano"] },
];

const ZONE_KEYWORDS: Dict<BodyZone> = [
  { value: "antebrazo", keywords: ["antebrazo", "ante brazo"] },
  { value: "brazo", keywords: ["brazo", "biceps", "bíceps", "hombro a codo"] },
  { value: "mano", keywords: ["mano", "manos", "dedos", "dedo", "nudillos"] },
  { value: "hombro", keywords: ["hombro", "hombros"] },
  { value: "pecho", keywords: ["pecho", "pectoral", "torso"] },
  { value: "espalda", keywords: ["espalda", "columna", "omoplato"] },
  { value: "costillas", keywords: ["costilla", "costillas", "costado"] },
  { value: "pantorrilla", keywords: ["pantorrilla", "gemelo", "gemelos"] },
  { value: "pierna", keywords: ["pierna", "piernas", "muslo", "muslos"] },
  { value: "pie", keywords: ["pie", "pies", "tobillo", "tobillos"] },
  { value: "cuello", keywords: ["cuello", "nuca", "garganta"] },
  { value: "muñeca", keywords: ["muñeca", "muneca", "muñecas"] },
];

const SIZE_KEYWORDS: Dict<TattooSize> = [
  { value: "espalda_completa", keywords: ["espalda completa", "espalda entera", "toda la espalda"] },
  { value: "manga", keywords: ["manga", "brazo completo", "manga completa"] },
  { value: "grande", keywords: ["grande", "grandes", "gran", "cubrir bastante"] },
  { value: "mediano", keywords: ["mediano", "media", "medio", "mediana"] },
  { value: "pequeño", keywords: ["pequeño", "pequeno", "chico", "chica", "small", "mini", "pequeña"] },
];

const REFERENCE_KEYWORDS = [
  "referencia",
  "foto",
  "imagen",
  "diseño",
  "diseno",
  "boceto",
  "idea",
  "te mando",
  "te paso",
  "te envio",
  "te envío",
  "adjunto",
];

const SCHEDULE_KEYWORDS = [
  "agendar",
  "agenda",
  "reservar",
  "reserva",
  "cita",
  "hora",
  "cuando",
  "cuándo",
  "disponibilidad",
  "disponible",
  "fecha",
  "cupo",
  "sesion",
  "sesión",
  "quiero hacerme",
  "me lo quiero hacer",
  "como hacemos",
  "cómo hacemos",
  "como agendo",
  "cómo agendo",
  "apartar",
  "apartar cupo",
];

const PRICE_KEYWORDS = [
  "precio",
  "valor",
  "cuanto",
  "cuánto",
  "cuesta",
  "cotiza",
  "cotización",
  "cotizacion",
  "vale",
  "sale",
  "presupuesto",
];

const GREETING_KEYWORDS = [
  "hola",
  "buenas",
  "buenos dias",
  "buenos días",
  "buenas tardes",
  "que tal",
  "qué tal",
  "hey",
  "holi",
];

const HESITATION_KEYWORDS = [
  "caro",
  "carisimo",
  "carísimo",
  "mucho",
  "lo pienso",
  "despues",
  "después",
  "mas adelante",
  "más adelante",
  "no tengo plata",
  "no me alcanza",
  "veo",
  "aviso",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchDict<T extends string>(text: string, dict: Dict<T>): T | undefined {
  const normalized = normalize(text);
  for (const entry of dict) {
    for (const keyword of entry.keywords) {
      if (normalized.includes(normalize(keyword))) return entry.value;
    }
  }
  return undefined;
}

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function extractBudget(text: string): number | undefined {
  const normalized = normalize(text).replace(/\./g, "").replace(/\s/g, "");
  const kMatch = normalized.match(/(\d{1,3})k/);
  if (kMatch) return parseInt(kMatch[1], 10) * 1000;
  const moneyMatch = normalized.match(/\$?(\d{4,7})/);
  if (moneyMatch) {
    const value = parseInt(moneyMatch[1], 10);
    if (value >= 10000 && value <= 5000000) return value;
  }
  return undefined;
}

const SIZE_TO_PACKAGE: Record<TattooSize, SessionPackageId> = {
  pequeño: "una_hora",
  mediano: "corta",
  grande: "estandar",
  manga: "larga",
  espalda_completa: "larga",
};

const IMAGE_KEYWORDS = [
  "foto",
  "fotografia",
  "fotografía",
  "imagen",
  "adjunto",
  "adjunta",
  "te mando",
  "te envio",
  "te envío",
  "mando la",
  "envio la",
  "envío la",
  "aqui va",
  "aquí va",
  "te paso",
  "te comparto",
];

const RECOMMENDATION_KEYWORDS = [
  "recomiendas",
  "recomendarias",
  "recomendarías",
  "que me recomiendas",
  "qué me recomiendas",
  "que sugieres",
  "qué sugieres",
  "que me sugieres",
  "que me conviene",
  "qué me conviene",
  "que me aconsejas",
  "tu que opinas",
  "tú qué opinas",
];

const FLASH_KEYWORDS = [
  "flash",
  "modelo",
  "modelos",
  "diseño disponible",
  "disenos disponibles",
  "diseños disponibles",
  "tienes algo",
  "tienes alguno",
  "alguno disponible",
  "catalogo",
  "catálogo",
];

const PROCESS_KEYWORDS = [
  "como es el proceso",
  "cómo es el proceso",
  "como funciona",
  "cómo funciona",
  "cuales son los pasos",
  "cuáles son los pasos",
  "que debo hacer",
  "qué debo hacer",
  "que sigue",
  "qué sigue",
  "explicame",
  "explícame",
  "cuentame como",
  "cuéntame cómo",
  "como trabajas",
  "cómo trabajas",
  "como es trabajar",
  "cómo es trabajar",
];

export interface ClientMessageAnalysis {
  patch: Partial<LeadQualification>;
  isGreeting: boolean;
  wantsPrice: boolean;
  wantsSchedule: boolean;
  hesitates: boolean;
  sentImage: boolean;
  asksRecommendation: boolean;
  asksFlash: boolean;
  asksProcess: boolean;
}

export function analyzeClientMessage(
  text: string,
  current: LeadQualification,
  options?: { hasImage?: boolean },
): ClientMessageAnalysis {
  const patch: Partial<LeadQualification> = {};

  const style = matchDict(text, STYLE_KEYWORDS);
  if (style) patch.style = style;

  const zone = matchDict(text, ZONE_KEYWORDS);
  if (zone) patch.zone = zone;

  const size = matchDict(text, SIZE_KEYWORDS);
  if (size) {
    patch.size = size;
    if (!current.sessionPackage) patch.sessionPackage = SIZE_TO_PACKAGE[size];
  }

  const budget = extractBudget(text);
  if (budget) patch.budget = budget;

  const hasReference = includesAny(text, REFERENCE_KEYWORDS);
  if (hasReference) patch.hasReference = true;

  const sentImage = Boolean(options?.hasImage) || includesAny(text, IMAGE_KEYWORDS);

  const wantsPrice = includesAny(text, PRICE_KEYWORDS);
  const wantsSchedule = includesAny(text, SCHEDULE_KEYWORDS);
  const hesitates = includesAny(text, HESITATION_KEYWORDS);
  const isGreeting = includesAny(text, GREETING_KEYWORDS);
  const asksRecommendation = includesAny(text, RECOMMENDATION_KEYWORDS);
  const asksFlash = includesAny(text, FLASH_KEYWORDS);
  const asksProcess = includesAny(text, PROCESS_KEYWORDS);

  let intent: LeadIntent = current.intent;
  if (hesitates) intent = "indeciso";
  else if (wantsSchedule) intent = "agendar";
  else if (wantsPrice) intent = "precio";
  else if (intent === "descartado") intent = "explorando";
  patch.intent = intent;

  return {
    patch,
    isGreeting,
    wantsPrice,
    wantsSchedule,
    hesitates,
    sentImage,
    asksRecommendation,
    asksFlash,
    asksProcess,
  };
}

export function mergeQualification(
  current: LeadQualification,
  patch: Partial<LeadQualification>,
): LeadQualification {
  return {
    ...current,
    ...patch,
    hasReference: patch.hasReference ?? current.hasReference,
    intent: patch.intent ?? current.intent,
  };
}

export function scoreLead(
  qualification: LeadQualification,
  messages: ChatMessage[],
): { score: number; temperature: LeadTemperature } {
  let score = 0;
  if (qualification.style) score += 18;
  if (qualification.zone) score += 15;
  if (qualification.size) score += 15;
  if (qualification.hasReference) score += 12;
  if (qualification.budget) score += 20;
  if (qualification.preferredDate) score += 10;

  if (qualification.intent === "agendar") score += 20;
  else if (qualification.intent === "precio") score += 8;
  else if (qualification.intent === "indeciso") score -= 15;
  else if (qualification.intent === "descartado") score -= 40;

  const clientMessages = messages.filter((m) => m.author === "cliente").length;
  if (clientMessages >= 3) score += 6;
  if (clientMessages >= 6) score += 6;

  score = Math.max(0, Math.min(100, score));

  let temperature: LeadTemperature;
  if (qualification.intent === "descartado") temperature = "frio";
  else if (score >= 75) temperature = "listo";
  else if (score >= 50) temperature = "caliente";
  else if (score >= 28) temperature = "tibio";
  else if (clientMessages <= 1) temperature = "nuevo";
  else temperature = "frio";

  return { score, temperature };
}

function pick<T>(options: T[], seed: number): T {
  return options[seed % options.length];
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function zoneLabel(zone: BodyZone): string {
  const map: Record<BodyZone, string> = {
    brazo: "brazo",
    antebrazo: "antebrazo",
    mano: "mano",
    hombro: "hombro",
    pecho: "pecho",
    espalda: "espalda",
    costillas: "costillas",
    pierna: "pierna",
    pantorrilla: "pantorrilla",
    pie: "pie",
    cuello: "cuello",
    muñeca: "muñeca",
    otro: "esa zona",
  };
  return map[zone];
}

function sizeLabel(size: TattooSize): string {
  const map: Record<TattooSize, string> = {
    pequeño: "pequeño",
    mediano: "mediano",
    grande: "grande",
    manga: "manga",
    espalda_completa: "espalda completa",
  };
  return map[size];
}

function clientMessageCount(messages: ChatMessage[]) {
  return messages.filter((m) => m.author === "cliente").length;
}

function lastQuoteFromThread(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (
      (msg.author === "bot" || msg.author === "artista") &&
      msg.quotePrice
    ) {
      return msg.quotePrice;
    }
  }
  return undefined;
}

export function alreadyQuoted(messages: ChatMessage[]) {
  return lastQuoteFromThread(messages) !== undefined;
}

function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1).replace(".", ",");
}

export function reserveDepositPhrase(
  depositPercent: number,
  depositAmount: number,
): string {
  return `para apartar cupo abonas el ${depositPercent}% del valor (${formatMoney(depositAmount)}). El resto lo ves el día de la sesión`;
}

export function referenceStatusLabel(status: ReferenceReviewStatus): string {
  switch (status) {
    case "pendiente":
      return "Pendiente de revisión";
    case "aprobada":
      return "Aprobada";
    case "rechazada":
      return "Rechazada";
    default:
      return "Sin enviar";
  }
}

export interface BotReply {
  text: string;
  quotePrice?: number;
  tags: string[];
}

interface BotReplyContext {
  conversation: WhatsAppConversation;
  qualification: LeadQualification;
  studio: Studio;
  hourlyRate: number;
  artistName: string;
  analysis: ClientMessageAnalysis;
}

export function generateBotReply(context: BotReplyContext): BotReply {
  const { qualification, studio, hourlyRate, artistName, analysis, conversation } =
    context;
  const seed = conversation.messages.length;
  const name = firstName(conversation.contactName);
  const tags: string[] = [];
  const clientMsgs = clientMessageCount(conversation.messages);
  const isPureGreeting =
    analysis.isGreeting && !qualification.style && clientMsgs <= 1;
  const lastClient = conversation.messages.filter((m) => m.author === "cliente").at(-1);
  const receivedImage = Boolean(lastClient?.hasImage) || analysis.sentImage;

  if (receivedImage && lastClient?.hasImage) {
    tags.push("referencia pendiente");
    return {
      text: pick(
        [
          `Perfecto ${name}, recibí tu foto. La reviso y en un rato te confirmo el diseño y el valor cerrado.`,
          `Gracias por la imagen. Déjame revisarla con calma y te escribo con los detalles y cómo apartar cupo.`,
        ],
        seed,
      ),
      tags,
    };
  }

  if (analysis.hesitates) {
    tags.push("objeción precio");
    return {
      text: pick(
        [
          `Te entiendo, ${name}. Es una decisión que conviene pensar con calma. Si quieres, ajustamos el diseño a tu presupuesto o lo vemos en dos sesiones. ¿Cuánto tenías pensado invertir aproximadamente?`,
          `Sin problema, ${name}. Un tatuaje bien hecho lleva tiempo y cuidado. Para apartar cupo abonas el ${studio.depositPercent}% del valor y el resto lo ves el día de la sesión. Si te sirve, te propongo fechas sin compromiso.`,
        ],
        seed,
      ),
      tags,
    };
  }

  if (isPureGreeting) {
    return {
      text: pick(
        [
          `Hola ${name}, gracias por escribir. Soy ${artistName}. Cuéntame qué idea tienes en mente y en qué parte del cuerpo la piensas hacer.`,
          `Hola ${name}, ¿cómo estás? Aquí ${artistName}. Dime qué tatuaje te gustaría y en qué zona, y te oriento con gusto.`,
        ],
        seed,
      ),
      tags: ["nuevo contacto"],
    };
  }

  if (!qualification.style) {
    return {
      text: pick(
        [
          `Perfecto. ¿Qué estilo te imaginas? Puede ser fine line, blackwork, realismo, lettering... Si tienes una referencia, la puedes enviar por aquí.`,
          `Bien. Para orientarte mejor, ¿ya tienes claro el estilo o prefieres que lo veamos según la imagen que tengas?`,
        ],
        seed,
      ),
      tags,
    };
  }

  if (!qualification.zone) {
    return {
      text: pick(
        [
          `Me gusta la idea de ${styleLabel(qualification.style)}. ¿En qué parte del cuerpo lo quieres hacer?`,
          `Buen estilo. ¿Ya sabes en qué zona lo harías? Brazo, antebrazo, pierna, espalda...`,
        ],
        seed,
      ),
      tags,
    };
  }

  if (!qualification.size) {
    return {
      text: pick(
        [
          `En ${zoneLabel(qualification.zone)} queda muy bien. ¿Qué tamaño tienes en mente: pequeño, mediano, grande o algo más amplio como manga?`,
          `Bien, ${zoneLabel(qualification.zone)} es una buena zona para eso. ¿Es algo chico, mediano o buscas una pieza más grande?`,
        ],
        seed,
      ),
      tags,
    };
  }

  const quote = estimateQuote({
    style: qualification.style,
    zone: qualification.zone,
    size: qualification.size,
    hourlyRate,
    depositPercent: studio.depositPercent,
  });

  const estilo = styleLabel(qualification.style);
  const zona = zoneLabel(qualification.zone);
  const tamano = sizeLabel(qualification.size);
  const precioRef = formatMoney(quote.suggestedPrice);
  const apartadoMonto = formatMoney(quote.depositAmount);
  const horas = formatHours(quote.estimatedHours);
  const quoted = alreadyQuoted(conversation.messages);
  const wantsToBook =
    analysis.wantsSchedule || qualification.intent === "agendar";

  if (analysis.asksRecommendation || analysis.asksFlash) {
    tags.push("asesoría");
    const available = FLASH_DESIGNS.filter((f) => f.available).slice(0, 2);
    const flashA = available[0];
    const flashB = available[1];
    const zonaTxt = qualification.zone ? zoneLabel(qualification.zone) : "esa zona";
    return {
      text: pick(
        [
          `Para ${zonaTxt} en ${estilo} algo chico queda muy bien. Tengo disponibles ${flashA?.name ?? "mini fine line"} y ${flashB?.name ?? "símbolo minimalista"}, desde ${formatMoney(flashA?.fromPrice ?? 60_000)}. ¿Te gusta alguno o traes una idea?`,
          `Te recomiendo empezar con algo compacto: ${flashA?.name ?? "flor fine line"} o un lettering corto. Ambos desde ${formatMoney(flashA?.fromPrice ?? 60_000)}. ¿Cuál te llama más la atención?`,
        ],
        seed,
      ),
      quotePrice: quoted ? undefined : quote.suggestedPrice,
      tags,
    };
  }

  if (analysis.asksProcess) {
    tags.push("asesoría");
    return {
      text: pick(
        [
          `El proceso es así: me cuentas la idea o mandas referencia, te confirmo diseño y valor, apartas cupo con el ${studio.depositPercent}% (${apartadoMonto}) y agendamos fecha. El resto lo pagas el día de la sesión. ¿Te gustaría ver disponibilidad?`,
          `Primero definimos el diseño (puedes mandar foto si tienes), te paso el estimado, haces el apartado del ${studio.depositPercent}% (${apartadoMonto}) para reservar y coordinamos el día. ¿Quieres que veamos fechas?`,
        ],
        seed,
      ),
      tags,
    };
  }

  if (wantsToBook) {
    tags.push("listo para reservar");
    if (quoted) {
      return {
        text: pick(
          [
            `Perfecto ${name}. Tengo cupo entre semana por la tarde o el sábado en la mañana. ¿Qué día te queda mejor? Para confirmar, abonas el ${studio.depositPercent}% (${apartadoMonto}) por transferencia y queda agendado.`,
            `Genial. Dime si prefieres martes, jueves o sábado y te paso horario. Con el apartado del ${studio.depositPercent}% (${apartadoMonto}) bloqueamos la fecha y el resto lo ves el día de la sesión.`,
          ],
          seed,
        ),
        tags,
      };
    }
    return {
      text: pick(
        [
          `Para tu ${estilo} en ${zona} (${tamano}) el valor estimado es ${precioRef}, unas ${horas} h. Para apartar cupo abonas el ${studio.depositPercent}% (${apartadoMonto}). ¿Qué día de esta semana te vendría mejor?`,
          `Listo. Serían alrededor de ${precioRef} y ${horas} h de trabajo. El apartado es ${apartadoMonto} (${studio.depositPercent}%). ¿Prefieres entre semana o fin de semana?`,
        ],
        seed,
      ),
      quotePrice: quote.suggestedPrice,
      tags,
    };
  }

  if (analysis.wantsPrice && quoted) {
    tags.push("cotización enviada");
    return {
      text: pick(
        [
          `Como te comenté, el estimado queda en ${precioRef} y el apartado sería ${apartadoMonto} (${studio.depositPercent}%). Si te cierra, dime qué día te acomoda y lo agendamos.`,
          `El rango que te pasé ronda ${precioRef}. Si quieres seguir, dime si prefieres entre semana o sábado y coordinamos el apartado.`,
        ],
        seed,
      ),
      tags,
    };
  }

  if (
    !qualification.hasReference &&
    !quoted &&
    !analysis.wantsPrice
  ) {
    tags.push("cotización enviada");
    return {
      text: pick(
        [
          `Un ${estilo} ${tamano} en ${zona} suele estar alrededor de ${precioRef}, unas ${horas} h. Si tienes referencia, envíamela para afinar el diseño. ¿Te gustaría ver fechas?`,
          `Por lo que me cuentas, estimaría unos ${precioRef}. Puedes mandarme una foto del diseño si la tienes. ¿Quieres que veamos cómo agendar?`,
        ],
        seed,
      ),
      quotePrice: quote.suggestedPrice,
      tags,
    };
  }

  if (!quoted) {
    tags.push("cotización enviada");
    return {
      text: pick(
        [
          `Un ${estilo} en ${zona} (${tamano}) suele estar alrededor de ${precioRef}, unas ${horas} h de trabajo. El valor final lo cerramos al ver el diseño. ¿Te gustaría agendar?`,
          `Por lo que describes, estimaría ${precioRef} y unas ${horas} h. Para apartar cupo abonas el ${studio.depositPercent}% (${apartadoMonto}). ¿Quieres que veamos fecha?`,
        ],
        seed,
      ),
      quotePrice: quote.suggestedPrice,
      tags,
    };
  }

  tags.push("cotización enviada");
  return {
    text: pick(
      [
        `Si quieres avanzar, dime qué día te acomoda y te indico cómo hacer el apartado del ${studio.depositPercent}%.`,
        `Cuando quieras seguir, dime si prefieres entre semana o sábado y coordinamos el apartado de ${apartadoMonto}.`,
      ],
      seed,
    ),
    tags,
  };
}

export function temperatureMeta(temperature: LeadTemperature): {
  label: string;
  badgeClass: string;
  dot: string;
} {
  switch (temperature) {
    case "listo":
      return { label: "Listo para reservar", badgeClass: "badge-green", dot: "#34d399" };
    case "caliente":
      return { label: "Caliente", badgeClass: "badge-rose", dot: "#f97316" };
    case "tibio":
      return { label: "Tibio", badgeClass: "badge-amber", dot: "#fbbf24" };
    case "frio":
      return { label: "Frío", badgeClass: "badge-blue", dot: "#60a5fa" };
    default:
      return { label: "Nuevo", badgeClass: "badge-gray", dot: "#c4bfb6" };
  }
}

export function qualificationReady(qualification: LeadQualification): boolean {
  return Boolean(
    qualification.style && qualification.zone && qualification.size,
  );
}
