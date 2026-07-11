import { NextResponse } from "next/server";
import { updateVerificationUser } from "@/lib/verifications/server-store";
import type { VerificationStatus } from "@/lib/types";

type ReviewBody = {
  status?: VerificationStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as ReviewBody;

    if (!body.status) {
      return NextResponse.json(
        { error: "Estado de verificación requerido." },
        { status: 400 },
      );
    }

    const user = await updateVerificationUser(id, {
      verificationStatus: body.status,
      reviewNote: body.reviewNote,
      reviewedAt: body.reviewedAt ?? new Date().toISOString(),
      reviewedBy: body.reviewedBy ?? "Equipo Carrizo",
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Verification review failed", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la verificación." },
      { status: 500 },
    );
  }
}
