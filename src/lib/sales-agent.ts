import {
  analyzeClientMessage,
  generateBotReply,
  mergeQualification,
  alreadyQuoted,
  type BotReply,
} from "./chat-bot";
import {
  buildEnderxonSystemPrompt,
  type CrmBotConfig,
  DEFAULT_CRM_BOT_CONFIG,
} from "./bot-knowledge";
import { loadGeminiEducation } from "./gemini-education.server";
import { estimateQuote } from "./quote-engine";
import type {
  Artist,
  LeadQualification,
  Studio,
  WhatsAppConversation,
} from "./types";

export type SalesAgentInput = {
  conversation: WhatsAppConversation;
  studio: Studio;
  artist: Artist;
  botConfig?: Partial<CrmBotConfig>;
};

export type ReplyEngine = "gemini" | "rules" | "gemini-fallback";

export type SalesAgentResult = BotReply & {
  qualification: LeadQualification;
  engine: ReplyEngine;
  geminiModel?: string;
  geminiError?: string;
};

function resolveBotConfig(partial?: Partial<CrmBotConfig>): CrmBotConfig {
  return { ...DEFAULT_CRM_BOT_CONFIG, ...partial };
}

function resolveApiKey(config: CrmBotConfig): string | undefined {
  const fromUi = config.geminiApiKey.trim();
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  return fromUi || fromEnv || undefined;
}

function recentMessages(conversation: WhatsAppConversation, limit = 12) {
  return conversation.messages.slice(-limit).map((m) => {
    const role = m.author === "cliente" ? "Cliente" : "Artista";
    const image = m.hasImage ? " [envió foto]" : "";
    return `${role}: ${m.text}${image}`;
  });
}

function geminiModelCandidates(config: CrmBotConfig): string[] {
  const configured = config.geminiModel.trim() || process.env.GEMINI_MODEL?.trim();
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];
  return Array.from(new Set([configured, ...defaults].filter(Boolean))) as string[];
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: string[],
  clientName: string,
): Promise<{ text: string | null; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Conversación con ${clientName}:\n\n${history.join("\n")}\n\nResponde solo el siguiente mensaje de WhatsApp como el artista, sin comillas ni prefijos.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 320,
        ...(model.includes("2.5")
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Gemini API error (${model})`, errorBody);
    return { text: null, error: errorBody };
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return { text: text || null };
}

async function callGeminiWithFallback(
  apiKey: string,
  config: CrmBotConfig,
  systemPrompt: string,
  history: string[],
  clientName: string,
): Promise<{ text: string; model: string } | { error: string }> {
  let lastError = "Sin respuesta de Gemini.";

  for (const model of geminiModelCandidates(config)) {
    const result = await callGemini(apiKey, model, systemPrompt, history, clientName);
    if (result.text) {
      return { text: result.text, model };
    }
    if (result.error) lastError = result.error;
  }

  return { error: lastError };
}

function inferTags(
  analysis: ReturnType<typeof analyzeClientMessage>,
  reply: BotReply,
): string[] {
  const tags = [...reply.tags];
  if (analysis.wantsSchedule) tags.push("listo para reservar");
  if (analysis.wantsPrice) tags.push("cotización enviada");
  if (analysis.asksRecommendation || analysis.asksFlash) tags.push("asesoría");
  if (analysis.asksProcess) tags.push("asesoría");
  return Array.from(new Set(tags));
}

function attachQuotePrice(
  input: SalesAgentInput,
  qualification: LeadQualification,
  analysis: ReturnType<typeof analyzeClientMessage>,
  fallbackQuote?: number,
): number | undefined {
  const quoted = alreadyQuoted(input.conversation.messages);
  const shouldAttach =
    !quoted &&
    qualification.style &&
    qualification.zone &&
    qualification.size &&
    (analysis.wantsPrice || analysis.wantsSchedule);

  if (
    shouldAttach &&
    qualification.style &&
    qualification.zone &&
    qualification.size
  ) {
    return estimateQuote({
      style: qualification.style,
      zone: qualification.zone,
      size: qualification.size,
      hourlyRate: input.artist.hourlyRate,
      depositPercent: input.studio.depositPercent,
    }).suggestedPrice;
  }

  if (quoted) return undefined;
  return fallbackQuote;
}

async function tryGeminiReply(
  input: SalesAgentInput,
  config: CrmBotConfig,
  qualification: LeadQualification,
  analysis: ReturnType<typeof analyzeClientMessage>,
  fallback: BotReply,
): Promise<SalesAgentResult> {
  const apiKey = resolveApiKey(config);

  if (!apiKey) {
    return {
      ...fallback,
      qualification,
      engine: "rules",
      geminiError: "Sin API key de Gemini. Agrégala abajo o en .env.local.",
    };
  }

  const systemPrompt = buildEnderxonSystemPrompt({
    studio: input.studio,
    artist: input.artist,
    qualification,
    conversation: input.conversation,
    educationAppend: loadGeminiEducation(),
  });

  const history = recentMessages(input.conversation);
  const gemini = await callGeminiWithFallback(
    apiKey,
    config,
    systemPrompt,
    history,
    input.conversation.contactName,
  );

  if ("error" in gemini) {
    return {
      ...fallback,
      qualification,
      engine: "gemini-fallback",
      geminiError: gemini.error,
    };
  }

  return {
    text: gemini.text,
    quotePrice: attachQuotePrice(input, qualification, analysis, fallback.quotePrice),
    tags: inferTags(analysis, fallback),
    qualification,
    engine: "gemini",
    geminiModel: gemini.model,
  };
}

export async function generateSalesAgentReply(
  input: SalesAgentInput,
): Promise<SalesAgentResult> {
  const config = resolveBotConfig(input.botConfig);
  const lastClient = input.conversation.messages
    .filter((m) => m.author === "cliente")
    .at(-1);

  const analysis = analyzeClientMessage(
    lastClient?.text ?? "",
    input.conversation.qualification,
    { hasImage: lastClient?.hasImage },
  );

  const qualification = mergeQualification(
    input.conversation.qualification,
    analysis.patch,
  );

  const fallback = generateBotReply({
    conversation: { ...input.conversation, qualification },
    qualification,
    studio: input.studio,
    hourlyRate: input.artist.hourlyRate,
    artistName: input.artist.name,
    analysis,
  });

  if (config.replyMode === "rules") {
    return { ...fallback, qualification, engine: "rules" };
  }

  try {
    const geminiResult = await tryGeminiReply(
      input,
      config,
      qualification,
      analysis,
      fallback,
    );

    if (config.replyMode === "gemini") {
      if (geminiResult.engine === "gemini") {
        return geminiResult;
      }
      return {
        text: "No pude conectar con Gemini en este momento. Revisa la API key del bot o prueba el modo híbrido.",
        tags: fallback.tags,
        qualification,
        engine: "gemini-fallback",
        geminiError: geminiResult.geminiError,
      };
    }

    if (geminiResult.engine === "gemini") {
      return geminiResult;
    }

    return { ...fallback, qualification, engine: "gemini-fallback", geminiError: geminiResult.geminiError };
  } catch (error) {
    console.error("Sales agent error", error);
    const message = error instanceof Error ? error.message : "Error desconocido";

    if (config.replyMode === "gemini") {
      return {
        text: "Hubo un error al usar Gemini. Revisa la configuración del bot.",
        tags: fallback.tags,
        qualification,
        engine: "gemini-fallback",
        geminiError: message,
      };
    }

    return {
      ...fallback,
      qualification,
      engine: "gemini-fallback",
      geminiError: message,
    };
  }
}

export type { CrmBotConfig, CrmReplyMode } from "./bot-knowledge";
export {
  DEFAULT_CRM_BOT_CONFIG,
  CRM_REPLY_MODES,
  botKnowledgeSummary,
} from "./bot-knowledge";
