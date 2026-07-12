"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Trophy } from "lucide-react";
import { formatMoney } from "@/lib/quote-engine";

export type WinnerCelebrationPayload = {
  auctionId: string;
  name: string;
  amount: number;
};

export function useWinnerCelebration(input: {
  auctionId: string | undefined;
  status: string;
  winnerUserId?: string;
  winnerName?: string;
  amount: number;
  sessionUserId?: string | null;
  sessionUserName?: string;
}) {
  const [celebration, setCelebration] =
    useState<WinnerCelebrationPayload | null>(null);
  const shownRef = useRef<string | null>(null);

  const {
    auctionId,
    status,
    winnerUserId,
    winnerName,
    amount,
    sessionUserId,
    sessionUserName,
  } = input;

  useEffect(() => {
    if (!auctionId || status !== "finalizada") return;
    if (!sessionUserId) return;

    const isWinnerById = Boolean(
      winnerUserId && winnerUserId === sessionUserId,
    );
    const isWinnerByName = Boolean(
      !winnerUserId &&
        winnerName &&
        sessionUserName &&
        winnerName.trim().toLowerCase() === sessionUserName.trim().toLowerCase(),
    );
    if (!isWinnerById && !isWinnerByName) return;

    const key = `${auctionId}:${sessionUserId}`;
    if (shownRef.current === key) return;

    try {
      const storageKey = `carrizo-winner-seen:${key}`;
      if (sessionStorage.getItem(storageKey)) {
        shownRef.current = key;
        return;
      }
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage bloqueado.
    }

    shownRef.current = key;
    setCelebration({
      auctionId,
      name: winnerName || sessionUserName || "Ganador",
      amount,
    });
  }, [
    auctionId,
    status,
    winnerUserId,
    winnerName,
    amount,
    sessionUserId,
    sessionUserName,
  ]);

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 5200);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  const dismiss = () => setCelebration(null);

  return { celebration, dismiss };
}

export function WinnerCelebrationOverlay({
  celebration,
  onDismiss,
}: {
  celebration: WinnerCelebrationPayload | null;
  onDismiss?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!celebration || !mounted) return null;

  return createPortal(
    <div
      key={celebration.auctionId}
      className="winner-overlay"
      role="dialog"
      aria-label="Ganaste la subasta"
      onClick={onDismiss}
    >
      <div className="winner-burst" aria-hidden>
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="winner-spark"
            style={{ "--i": index } as CSSProperties}
          />
        ))}
      </div>
      <div
        className="winner-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="winner-trophy">
          <Trophy size={36} />
        </div>
        <p className="winner-label">¡Ganaste la subasta!</p>
        <p className="winner-name">{celebration.name}</p>
        <p className="winner-amount">{formatMoney(celebration.amount)}</p>
        <p className="winner-note">
          Enderxon te contactará para agendar tu sesión.
        </p>
        <button type="button" className="btn-primary mt-5 px-5 py-2.5 text-sm" onClick={onDismiss}>
          Continuar
        </button>
      </div>
    </div>,
    document.body,
  );
}
