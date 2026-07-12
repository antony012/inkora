"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gavel } from "lucide-react";
import { formatMoney } from "@/lib/quote-engine";
import type { AuctionBid } from "@/lib/types";

export type BidFlashPayload = {
  id: string;
  name: string;
  amount: number;
};

export function useBidFlash(leadingBid: AuctionBid | undefined) {
  const [flash, setFlash] = useState<BidFlashPayload | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const bidId = leadingBid?.id;
  const bidAmount = leadingBid?.amount;
  const bidName = leadingBid?.bidderName;

  useEffect(() => {
    if (!bidId || bidAmount == null || !bidName) return;

    // Ignora la puja ya cargada al montar; solo anuncia pujas nuevas.
    if (!readyRef.current) {
      lastIdRef.current = bidId;
      readyRef.current = true;
      return;
    }

    if (bidId === lastIdRef.current) return;
    if (bidAmount <= 0) return;

    lastIdRef.current = bidId;
    setFlash({
      id: bidId,
      name: bidName,
      amount: bidAmount,
    });
  }, [bidId, bidAmount, bidName]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(timer);
  }, [flash]);

  return flash;
}

export function BidFlashOverlay({ flash }: { flash: BidFlashPayload | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!flash || !mounted) return null;

  return createPortal(
    <div
      key={flash.id}
      className="bid-flash-overlay"
      role="status"
      aria-live="assertive"
    >
      <div className="bid-flash-card">
        <p className="bid-flash-label">
          <Gavel size={22} />
          Nueva oferta
        </p>
        <p className="bid-flash-name">{flash.name}</p>
        <p className="bid-flash-amount">{formatMoney(flash.amount)}</p>
      </div>
    </div>,
    document.body,
  );
}
