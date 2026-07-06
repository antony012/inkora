import { NextRequest, NextResponse } from "next/server";

const ALLOWED = /^https:\/\/www\.tiktok\.com\/(@[\w.]+|@[\w.]+\/video\/\d+)/;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !ALLOWED.test(url)) {
    return NextResponse.json({ error: "URL de TikTok inválida." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      {
        headers: { "User-Agent": "Carrizo/1.0" },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener el embed de TikTok." },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con TikTok." },
      { status: 502 },
    );
  }
}
