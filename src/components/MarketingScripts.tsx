"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useCarrizo } from "@/lib/store";

const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export function MarketingScripts() {
  const consent = useCarrizo((s) => s.consentPreferences);

  useEffect(() => {
    if (!consent.marketing) {
      window.ttq?.revokeConsent?.();
      return;
    }
    window.ttq?.grantConsent?.();
  }, [consent.marketing]);

  return (
    <>
      {consent.analytics && ga4Id ? (
        <>
          <Script
            id="ga4-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent', 'update', {
                analytics_storage: 'granted',
                ad_storage: ${consent.marketing ? "'granted'" : "'denied'"},
                ad_user_data: ${consent.marketing ? "'granted'" : "'denied'"},
                ad_personalization: ${consent.marketing ? "'granted'" : "'denied'"}
              });
              gtag('config', '${ga4Id}', { send_page_view: false });
            `}
          </Script>
        </>
      ) : null}

      {consent.marketing && metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
          `}
        </Script>
      ) : null}

      {consent.marketing && tiktokPixelId ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
              ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
              n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;
              e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('${tiktokPixelId}');
              ttq.grantConsent();
            }(window, document, 'ttq');
          `}
        </Script>
      ) : null}
    </>
  );
}