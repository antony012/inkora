"use client";

import { useInkora } from "./store";
import type { MarketingEventName, MarketingEvent } from "./types";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      track?: (eventName: string, payload?: Record<string, unknown>) => void;
      page?: () => void;
      grantConsent?: () => void;
      revokeConsent?: () => void;
      holdConsent?: () => void;
    };
  }
}

type TrackPayload = {
  source: MarketingEvent["source"];
  value?: number;
  metadata?: MarketingEvent["metadata"];
  user?: {
    email?: string;
    phone?: string;
    name?: string;
  };
};

const channelEventNames: Record<MarketingEventName, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Lead: "Lead",
  Schedule: "Schedule",
  Contact: "Contact",
  CompleteRegistration: "CompleteRegistration",
  CTAClick: "Contact",
};

export function createEventId(eventName: MarketingEventName) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${eventName}-${random}`;
}

export function trackMarketingEvent(
  eventName: MarketingEventName,
  payload: TrackPayload,
) {
  if (typeof window === "undefined") return;

  const state = useInkora.getState();
  const eventId = createEventId(eventName);
  const path = window.location.pathname;
  const eventPayload = {
    event_id: eventId,
    value: payload.value,
    currency: "CLP",
    ...payload.metadata,
  };

  state.registerMarketingEvent({
    eventId,
    eventName,
    source: payload.source,
    path,
    channel: "internal",
    value: payload.value,
    metadata: payload.metadata,
  });

  if (state.consentPreferences.marketing) {
    window.fbq?.("track", channelEventNames[eventName], eventPayload, {
      eventID: eventId,
    });
    window.ttq?.track?.(channelEventNames[eventName], eventPayload);
    state.registerMarketingEvent({
      eventId,
      eventName,
      source: payload.source,
      path,
      channel: "meta",
      value: payload.value,
      metadata: payload.metadata,
    });
    state.registerMarketingEvent({
      eventId,
      eventName,
      source: payload.source,
      path,
      channel: "tiktok",
      value: payload.value,
      metadata: payload.metadata,
    });
  }

  if (state.consentPreferences.analytics) {
    window.gtag?.("event", eventName, {
      event_id: eventId,
      value: payload.value,
      currency: "CLP",
      event_category: payload.source,
      ...payload.metadata,
    });
    state.registerMarketingEvent({
      eventId,
      eventName,
      source: payload.source,
      path,
      channel: "ga4",
      value: payload.value,
      metadata: payload.metadata,
    });
  }

  if (state.consentPreferences.marketing || state.consentPreferences.analytics) {
    void fetch("/api/marketing/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        eventName,
        path,
        source: payload.source,
        value: payload.value,
        metadata: payload.metadata,
        user: payload.user,
        consent: state.consentPreferences,
      }),
      keepalive: true,
    }).catch(() => {
      // Marketing delivery must never block booking UX.
    });
  }
}

export function trackPageView(source: TrackPayload["source"]) {
  trackMarketingEvent("PageView", { source });
}