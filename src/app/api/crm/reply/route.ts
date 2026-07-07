import { NextResponse } from "next/server";
import { generateSalesAgentReply } from "@/lib/sales-agent";
import type { SalesAgentInput } from "@/lib/sales-agent";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SalesAgentInput;

    if (!body.conversation?.id || !body.studio || !body.artist?.name) {
      return NextResponse.json(
        { error: "Datos de conversación incompletos." },
        { status: 400 },
      );
    }

    const result = await generateSalesAgentReply(body);

    return NextResponse.json({
      text: result.text,
      quotePrice: result.quotePrice,
      tags: result.tags,
      qualification: result.qualification,
      engine: result.engine,
      geminiModel: result.geminiModel,
      geminiError: result.geminiError,
    });
  } catch (error) {
    console.error("CRM reply error", error);
    return NextResponse.json(
      { error: "No se pudo generar la respuesta." },
      { status: 500 },
    );
  }
}
