import { NextResponse } from "next/server";
import {
  getLiveRoomState,
  mergeLiveRoomPatch,
} from "@/lib/live-room/server-store";
import type { PresenceEntry } from "@/lib/presence";
import type { AuctionRoomKick, TattooAuction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getLiveRoomState();
    return NextResponse.json(
      {
        updatedAt: state.updatedAt,
        auctions: state.auctions,
        auctionRoomKicks: state.auctionRoomKicks,
        presence: state.presence,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Live room GET failed", error);
    return NextResponse.json(
      { error: "No se pudo cargar la sala en vivo." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      auctions?: TattooAuction[];
      auctionRoomKicks?: AuctionRoomKick[];
      kickUser?: AuctionRoomKick;
      unkickUserId?: string;
      presenceEntry?: PresenceEntry;
      presence?: Record<string, PresenceEntry>;
    };

    const state = await mergeLiveRoomPatch(body);
    return NextResponse.json({
      ok: true,
      state: {
        updatedAt: state.updatedAt,
        auctions: state.auctions,
        auctionRoomKicks: state.auctionRoomKicks,
        presence: state.presence,
      },
    });
  } catch (error) {
    console.error("Live room POST failed", error);
    return NextResponse.json(
      { error: "No se pudo sincronizar la sala en vivo." },
      { status: 500 },
    );
  }
}
