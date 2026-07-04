import { NextRequest, NextResponse } from "next/server";
import { loadTikTokVideos, TIKTOK_HANDLE } from "@/lib/tiktok-videos";

export async function GET(request: NextRequest) {
  const handle =
    request.nextUrl.searchParams.get("handle")?.replace("@", "") ??
    TIKTOK_HANDLE;

  if (!/^[\w.]+$/.test(handle)) {
    return NextResponse.json({ error: "Handle inválido." }, { status: 400 });
  }

  try {
    const videos = await loadTikTokVideos(handle);

    if (!videos.length) {
      return NextResponse.json(
        {
          error: "No se encontraron videos.",
          profileUrl: `https://www.tiktok.com/@${handle}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ videos, profileUrl: `https://www.tiktok.com/@${handle}` });
  } catch {
    return NextResponse.json(
      { error: "Error al cargar videos de TikTok." },
      { status: 502 },
    );
  }
}
