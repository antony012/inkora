import { NextRequest, NextResponse } from "next/server";

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
  "https://www.tiktok.com",
];

const connectSources = [
  "'self'",
  "https://www.google-analytics.com",
  "https://region1.google-analytics.com",
  "https://graph.facebook.com",
  "https://www.facebook.com",
  "https://analytics.tiktok.com",
  "https://business-api.tiktok.com",
  "https://www.tiktok.com",
  "https://*.tiktokcdn.com",
];

export function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.facebook.com https://analytics.tiktok.com https://*.tiktokcdn.com https://www.tiktok.com",
    "frame-src 'self' https://www.tiktok.com https://*.tiktok.com",
    "font-src 'self' data:",
    `connect-src ${[...connectSources, ...(isDev ? ["ws:", "http://localhost:*"] : [])].join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Request-Id", crypto.randomUUID());

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};