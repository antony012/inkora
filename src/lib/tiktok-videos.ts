export type TikTokVideoItem = {
  id: string;
  url: string;
  thumbnail: string;
  title?: string;
};

export const TIKTOK_HANDLE = "carrizoartist";

/** Respaldo si TikTok bloquea la lectura del perfil en servidor. */
export const TIKTOK_FALLBACK_VIDEOS: Omit<TikTokVideoItem, "thumbnail" | "title">[] = [
  { id: "7520000000000000000", url: `https://www.tiktok.com/@${TIKTOK_HANDLE}` },
];

export function buildVideoUrl(handle: string, id: string) {
  return `https://www.tiktok.com/@${handle}/video/${id}`;
}

export function extractVideoIdsFromHtml(html: string, limit = 16) {
  const ids = new Set<string>();

  for (const match of html.matchAll(/\/video\/(\d{15,22})/g)) {
    ids.add(match[1]);
  }

  for (const match of html.matchAll(/"id"\s*:\s*"(\d{15,22})"/g)) {
    ids.add(match[1]);
  }

  return Array.from(ids).slice(0, limit);
}

export async function fetchOEmbedMeta(videoUrl: string) {
  const response = await fetch(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    thumbnail_url?: string;
    title?: string;
  };

  if (!data.thumbnail_url) return null;

  return {
    thumbnail: data.thumbnail_url,
    title: data.title,
  };
}

export async function loadTikTokVideos(handle: string): Promise<TikTokVideoItem[]> {
  const profileUrl = `https://www.tiktok.com/@${handle}`;

  let ids: string[] = [];

  try {
    const profileResponse = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
      },
      next: { revalidate: 1800 },
    });

    if (profileResponse.ok) {
      const html = await profileResponse.text();
      ids = extractVideoIdsFromHtml(html);
    }
  } catch {
    // Perfil no disponible, seguimos con respaldo.
  }

  if (!ids.length) {
    ids = TIKTOK_FALLBACK_VIDEOS.map((item) => item.id).filter(
      (id) => id.length > 10,
    );
  }

  const videos: TikTokVideoItem[] = [];

  for (const id of ids) {
    const url = buildVideoUrl(handle, id);
    const meta = await fetchOEmbedMeta(url);
    if (!meta) continue;
    videos.push({
      id,
      url,
      thumbnail: meta.thumbnail,
      title: meta.title,
    });
  }

  return videos;
}
