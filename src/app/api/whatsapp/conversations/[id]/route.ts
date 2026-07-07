import { NextResponse } from "next/server";
import { reviewWhatsAppReference } from "@/lib/whatsapp/service";
import { updateWhatsAppConversation } from "@/lib/whatsapp/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    botEnabled?: boolean;
    markRead?: boolean;
    referenceStatus?: "aprobada" | "rechazada";
  };

  if (body.referenceStatus === "aprobada" || body.referenceStatus === "rechazada") {
    const result = await reviewWhatsAppReference(id, body.referenceStatus);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ conversation: result.conversation });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.botEnabled === "boolean") patch.botEnabled = body.botEnabled;
  if (body.markRead) patch.unread = 0;

  const conversation = await updateWhatsAppConversation(id, patch);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversación no encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ conversation });
}
