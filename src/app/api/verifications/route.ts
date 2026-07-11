import { NextResponse } from "next/server";
import {
  listVerificationUsers,
  upsertVerificationUser,
} from "@/lib/verifications/server-store";
import type { VerifiedUser } from "@/lib/types";

export async function GET() {
  try {
    const users = await listVerificationUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Verification list failed", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las verificaciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { user?: VerifiedUser };
    if (!body.user?.id || !body.user.email) {
      return NextResponse.json(
        { error: "Usuario inválido." },
        { status: 400 },
      );
    }

    const user = await upsertVerificationUser(body.user);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Verification upsert failed", error);
    return NextResponse.json(
      { error: "No se pudo guardar la verificación." },
      { status: 500 },
    );
  }
}
