import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeEmail, sanitizeNumber, sanitizePhone, sanitizeText } from "@/lib/validation";

const META_GRAPH_VERSION = "v23.0";

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    ok: response.ok,
    status: response.status,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const consent = payload.consent as
    | { analytics?: boolean; marketing?: boolean }
    | undefined;

  if (!consent?.analytics && !consent?.marketing) {
    return NextResponse.json({ ok: true, skipped: "no-consent" });
  }

  const eventName = sanitizeText(payload.eventName, 48);
  const eventId = sanitizeText(payload.eventId, 96);
  const path = sanitizeText(payload.path, 180) || "/";
  const source = sanitizeText(payload.source, 48);
  const value = sanitizeNumber(payload.value);
  const user = (payload.user ?? {}) as Record<string, unknown>;
  const email = sanitizeEmail(user.email);
  const phone = sanitizePhone(user.phone);
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const userAgent = request.headers.get("user-agent") ?? "";

  if (!eventName || !eventId) {
    return NextResponse.json({ ok: false, error: "Missing event fields" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  if (
    consent.marketing &&
    process.env.META_CAPI_TOKEN &&
    process.env.NEXT_PUBLIC_META_PIXEL_ID
  ) {
    const userData: Record<string, string> = {};
    if (email) userData.em = sha256(email);
    if (phone) userData.ph = sha256(phone);
    if (forwardedFor) userData.client_ip_address = forwardedFor;
    if (userAgent) userData.client_user_agent = userAgent;

    results.meta = await postJson(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${process.env.NEXT_PUBLIC_META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
      {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: "website",
            event_source_url: `${request.nextUrl.origin}${path}`,
            user_data: userData,
            custom_data: {
              currency: "CLP",
              value,
              source,
            },
          },
        ],
      },
    );
  }

  if (
    consent.marketing &&
    process.env.TIKTOK_EVENTS_API_TOKEN &&
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
  ) {
    results.tiktok = await postJson("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      pixel_code: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
      event: eventName,
      event_id: eventId,
      timestamp: new Date().toISOString(),
      context: {
        ip: forwardedFor,
        user_agent: userAgent,
        page: { url: `${request.nextUrl.origin}${path}` },
        user: {
          email: email ? sha256(email) : undefined,
          phone_number: phone ? sha256(phone) : undefined,
        },
      },
      properties: {
        currency: "CLP",
        value,
        source,
      },
    });
  }

  if (consent.analytics && process.env.NEXT_PUBLIC_GA4_ID && process.env.GA4_API_SECRET) {
    results.ga4 = await postJson(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.NEXT_PUBLIC_GA4_ID}&api_secret=${process.env.GA4_API_SECRET}`,
      {
        client_id: eventId,
        events: [
          {
            name: eventName,
            params: {
              event_id: eventId,
              currency: "CLP",
              value,
              source,
              page_location: `${request.nextUrl.origin}${path}`,
            },
          },
        ],
      },
    );
  }

  return NextResponse.json({
    ok: true,
    eventId,
    delivered: results,
  });
}