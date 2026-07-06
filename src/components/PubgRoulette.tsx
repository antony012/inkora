"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  pickRoulettePrize,
  rarityClass,
  rarityLabel,
  ROULETTE_PRIZES,
  type RoulettePrize,
} from "@/lib/roulette-prizes";
import { TattooRuletaHeading } from "@/components/TattooRuletaHeading";
import { X, Zap } from "lucide-react";

const SEGMENT_COUNT = ROULETTE_PRIZES.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

function buildInkWheelGradient(): string {
  const stops = ROULETTE_PRIZES.flatMap((prize, index) => {
    const start = index * SEGMENT_ANGLE;
    const mid = start + SEGMENT_ANGLE * 0.5;
    const end = (index + 1) * SEGMENT_ANGLE;
    return [
      `${prize.colorDark} ${start}deg`,
      `${prize.color} ${mid}deg`,
      `#0a0a0c ${end}deg`,
    ];
  });
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

const INK_WHEEL_GRADIENT = buildInkWheelGradient();

type CarrizoArtRouletteProps = {
  reservarHref?: string;
};

function TattooMachineUnit({ spinning }: { spinning: boolean }) {
  return (
    <div className="tattoo-machine-unit relative mx-auto w-full max-w-[280px]">
      <div className="tattoo-power-supply absolute -left-2 top-16 z-0 hidden sm:block">
        <div className="h-20 w-24 rounded-lg border border-[#3f3f46] bg-gradient-to-br from-[#27272a] to-[#18181b] p-2 shadow-[0_8px_20px_#00000066]">
          <div className="h-2 w-full rounded bg-[#09090b]" />
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`tattoo-power-led h-2 w-2 rounded-full ${spinning ? "is-on" : ""}`}
            />
            <span className="text-[8px] font-bold uppercase tracking-wider text-[#71717a]">
              PWR
            </span>
          </div>
          <div className="mt-2 h-6 rounded border border-[#3f3f46] bg-[#0a0a0c]" />
        </div>
        <div className="tattoo-power-cord ml-10 mt-1 h-px w-12 bg-[#27272a]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex w-full items-end justify-center gap-6">
          <div className={`tattoo-spring-arm -rotate-[28deg] ${spinning ? "is-buzzing" : ""}`} />
          <div className="flex flex-col items-center">
            <div className="tattoo-frame-plate h-2.5 w-24 rounded-sm bg-gradient-to-b from-[#a1a1aa] via-[#71717a] to-[#52525b] shadow-[inset_0_1px_0_#d4d4d8]" />
            <div className="h-1 w-16 bg-[#3f3f46]" />
          </div>
          <div className={`tattoo-spring-arm rotate-[28deg] ${spinning ? "is-buzzing" : ""}`} />
        </div>

        <div className="relative -mt-1 flex items-start justify-center gap-2">
          <div className={`tattoo-coil tattoo-coil-lg ${spinning ? "is-buzzing" : ""}`}>
            <div className="tattoo-coil-wrap" />
            <div className="tattoo-coil-core" />
            <div className="tattoo-coil-band" />
          </div>

          <div className="relative flex flex-col items-center pt-3">
            <div className="tattoo-contact-screw h-2 w-2 rounded-full bg-[#71717a]" />
            <div className={`tattoo-armature-bar mt-1 ${spinning ? "is-buzzing" : ""}`}>
              <div className="tattoo-needle-tube" />
              <div className="tattoo-needle-tip" />
            </div>
            <div className="mt-1 h-6 w-1.5 rounded-full bg-gradient-to-b from-[#a1a1aa] to-[#52525b]" />
          </div>

          <div className={`tattoo-coil tattoo-coil-lg ${spinning ? "is-buzzing" : ""}`}>
            <div className="tattoo-coil-wrap" />
            <div className="tattoo-coil-core" />
            <div className="tattoo-coil-band" />
          </div>
        </div>

        <div className="tattoo-grip-neck -mt-1 h-5 w-5 rounded-b-full bg-gradient-to-b from-[#52525b] to-[#3f3f46]" />

        <div className="tattoo-grip-body relative mt-0 h-[7.5rem] w-[3.75rem] rounded-b-[1.25rem] rounded-t-xl bg-gradient-to-r from-[#141418] via-[#27272a] to-[#141418] shadow-[0_10px_28px_#00000099,inset_3px_0_6px_#ffffff06,inset_-3px_0_6px_#00000055]">
          <div className="absolute inset-x-3 top-3 space-y-2">
            <div className="h-1 rounded-full bg-[#3f3f46]" />
            <div className="mx-auto h-1 w-4/5 rounded-full bg-[#3f3f46]" />
            <div className="h-1 rounded-full bg-[#3f3f46]" />
          </div>
          <div className="absolute bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border border-[#3f3f46] bg-[#18181b] opacity-60" />
        </div>

        <div className="tattoo-grip-cap -mt-1 h-3 w-14 rounded-t-lg bg-gradient-to-b from-[#71717a] to-[#52525b]" />
        <div className="tattoo-rca-cord absolute -right-6 bottom-16 hidden h-20 w-10 border-b-2 border-r-2 border-[#27272a] sm:block" />
      </div>
    </div>
  );
}

export function PubgRoulette({ reservarHref }: CarrizoArtRouletteProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RoulettePrize | null>(null);
  const [freeSpins, setFreeSpins] = useState(1);
  const [history, setHistory] = useState<RoulettePrize[]>([]);
  const [phase, setPhase] = useState<"idle" | "buzz" | "reveal">("idle");
  const wheelRef = useRef<HTMLDivElement>(null);

  const inkDrops = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  useEffect(() => {
    if (!spinning) return;
    setPhase("buzz");
    const timer = window.setTimeout(() => setPhase("reveal"), 4800);
    return () => window.clearTimeout(timer);
  }, [spinning]);

  useEffect(() => {
    if (!spinning && !winner) setPhase("idle");
  }, [spinning, winner]);

  const spin = useCallback(() => {
    if (spinning || freeSpins <= 0) return;

    const prize = pickRoulettePrize();
    const prizeIndex = ROULETTE_PRIZES.findIndex((p) => p.id === prize.id);
    const extraRotations = 6 + Math.floor(Math.random() * 4);
    const segmentCenter = prizeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const target =
      rotation +
      extraRotations * 360 +
      (360 - segmentCenter) +
      (Math.random() * 6 - 3);

    setSpinning(true);
    setWinner(null);
    setFreeSpins((n) => n - 1);
    setRotation(target);

    const onEnd = () => {
      setSpinning(false);
      setWinner(prize);
      setHistory((prev) => [prize, ...prev].slice(0, 5));
      if (prize.id === "giro-extra") {
        setFreeSpins((n) => n + 1);
      }
      wheelRef.current?.removeEventListener("transitionend", onEnd);
    };

    wheelRef.current?.addEventListener("transitionend", onEnd);
  }, [freeSpins, rotation, spinning]);

  return (
    <div
      className={`tattoo-machine-experience mx-auto w-full max-w-xl ${spinning ? "is-running" : ""} ${phase}`}
    >
      <div className="tattoo-studio-ambient pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" />
      <div className="tattoo-ink-splatter pointer-events-none absolute -left-6 top-20 h-24 w-24 opacity-40" />
      <div className="tattoo-ink-splatter pointer-events-none absolute -right-4 bottom-32 h-16 w-16 rotate-45 opacity-30" />

      <div className="relative z-10">
        <div className="relative mx-auto w-full max-w-[min(100%,380px)]">
          <div className="tattoo-drum-stand mx-auto mb-1 h-3 w-32 rounded-t-lg bg-gradient-to-b from-[#3f3f46] to-[#27272a]" />

          <div className="tattoo-needle-pointer absolute left-1/2 top-2 z-30 -translate-x-1/2">
            <div className="tattoo-needle-bar mx-auto h-14 w-[4px] rounded-full bg-gradient-to-b from-[#e4e4e7] via-[#a1a1aa] to-[#52525b]" />
            <div className="mx-auto -mt-px h-2.5 w-2.5 rotate-45 border border-[#d4d4d8] bg-[#fafafa] shadow-[0_0_10px_#ffffff44]" />
          </div>

          <div className="tattoo-ink-drum relative mx-auto aspect-square w-[90%] rounded-full p-2.5">
            <div className="absolute inset-0 rounded-full border-[3px] border-[#52525b] bg-gradient-to-br from-[#3f3f46] to-[#18181b]" />
            <div className="absolute inset-1.5 rounded-full border border-[#71717a] shadow-[inset_0_2px_6px_#00000088]" />

            <div className="absolute inset-4 overflow-hidden rounded-full shadow-[inset_0_0_50px_#000,inset_0_0_16px_#fb718522]">
              <div
                ref={wheelRef}
                className="tattoo-ink-wheel relative h-full w-full rounded-full"
                style={{
                  background: INK_WHEEL_GRADIENT,
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? "transform 4.8s cubic-bezier(0.1, 0.92, 0.15, 1)"
                    : "none",
                }}
              >
                {ROULETTE_PRIZES.map((_, index) => (
                  <div
                    key={index}
                    className="absolute left-1/2 top-1/2 h-1/2 w-px origin-bottom bg-[#ffffff18]"
                    style={{
                      transform: `translate(-50%, -100%) rotate(${index * SEGMENT_ANGLE}deg)`,
                    }}
                  />
                ))}

                {ROULETTE_PRIZES.map((prize, index) => (
                  <div
                    key={prize.id}
                    className="pointer-events-none absolute left-1/2 top-1/2 w-[34%] origin-bottom"
                    style={{
                      transform: `translate(-50%, -100%) rotate(${
                        index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
                      }deg)`,
                    }}
                  >
                    <div className="mx-auto flex w-fit flex-col items-center rounded-md bg-[#00000066] px-1 py-0.5">
                      <span className="text-lg leading-none">{prize.emoji}</span>
                      <span className="mt-0.5 max-w-[50px] truncate text-[7px] font-bold uppercase text-white/95">
                        {prize.label}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="absolute inset-[20%] rounded-full border-2 border-[#52525b] bg-[radial-gradient(circle,#1c1c22,#08080a)] shadow-[inset_0_0_20px_#000]" />
              </div>
            </div>

            {spinning
              ? inkDrops.map((drop) => (
                  <span
                    key={drop}
                    className="tattoo-ink-drop absolute top-1/2 h-2.5 w-2 rounded-full"
                    style={{
                      animationDelay: `${drop * 0.28}s`,
                      left: `${22 + drop * 7}%`,
                      background:
                        drop % 2 === 0
                          ? "#fb7185"
                          : ROULETTE_PRIZES[drop % 8].color,
                    }}
                  />
                ))
              : null}
          </div>

          <div className="tattoo-drive-shaft mx-auto -mt-1 h-8 w-1.5 bg-gradient-to-b from-[#71717a] to-[#3f3f46]" />

          <div className="relative -mt-1">
            <button
              type="button"
              onClick={spin}
              disabled={spinning || freeSpins <= 0}
              className="tattoo-grip-trigger group mx-auto block disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Activar máquina con el grip"
            >
              <TattooMachineUnit spinning={spinning} />
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] transition group-hover:text-[#fb7185]">
                {spinning ? "Tatuando premio…" : "Pulsar grip"}
              </p>
            </button>

            <p className="mt-2 text-center text-xs text-[var(--text-dim)]">
              {freeSpins > 0
                ? `${freeSpins} activación${freeSpins === 1 ? "" : "es"}`
                : "Sin activaciones"}
            </p>
          </div>

          <div className="relative mt-8 flex flex-col items-center">
            <div className="tattoo-pedal-cable mb-2 h-8 w-px bg-gradient-to-b from-[#3f3f46] to-[#27272a]" />
            <button
              type="button"
              onClick={spin}
              disabled={spinning || freeSpins <= 0}
              className="tattoo-pedal group flex flex-col items-center disabled:opacity-45"
            >
              <div className="tattoo-pedal-housing relative">
                <div className="tattoo-pedal-plate h-6 w-20 rounded-lg bg-gradient-to-b from-[#52525b] via-[#3f3f46] to-[#27272a] shadow-[0_5px_0_#09090b,0_10px_20px_#00000077,inset_0_1px_0_#71717a]" />
                <div className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-t bg-[#3f3f46]" />
              </div>
              <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] group-hover:text-[#fb7185]">
                Pedal
              </span>
            </button>
          </div>
        </div>

        {/* Catálogo tintas / premios */}
        <div className="mt-10">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--text-dim)]">
            Cartucho de premios
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {ROULETTE_PRIZES.map((prize) => (
              <div
                key={prize.id}
                className="tattoo-ink-cap shrink-0 rounded-lg px-3 py-2 text-center"
                style={{ borderColor: `${prize.color}66` }}
              >
                <div
                  className="mx-auto mb-1 h-3 w-3 rounded-full ring-2 ring-[#ffffff12]"
                  style={{ background: prize.color }}
                />
                <span className="text-sm">{prize.emoji}</span>
                <p className="mt-0.5 text-[10px] font-medium whitespace-nowrap">
                  {prize.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {history.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {history.map((prize, i) => (
              <span
                key={`${prize.id}-${i}`}
                className={`badge text-[10px] ${rarityClass(prize.rarity)}`}
              >
                {prize.emoji} {prize.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Modal premio */}
      {winner ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="tattoo-prize-stamp relative w-full max-w-sm overflow-hidden rounded-2xl p-6 text-center">
            <button
              type="button"
              onClick={() => {
                setWinner(null);
                setPhase("idle");
              }}
              className="absolute right-3 top-3 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[#ffffff10] hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="tattoo-stamp-ring mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#fb7185]">
              <Zap size={24} className="text-[#fb7185]" />
            </div>

            <p className="carrizo-art-logo-glow-contrast text-lg font-black">
              <span className="text-[#faf8f5]">Carrizo</span>
              <span className="text-[#fb7185]">Art</span>
            </p>
            <span className="badge badge-rose mt-2 mb-4">¡Tatuado en premio!</span>

            <div
              className="tattoo-prize-reveal mx-auto flex h-24 w-24 items-center justify-center rounded-2xl text-5xl"
              style={{
                background: `radial-gradient(circle, ${winner.color}33, transparent 70%)`,
                border: `2px solid ${winner.color}`,
                boxShadow: `0 0 40px ${winner.color}44`,
              }}
            >
              {winner.emoji}
            </div>

            <h3 className="mt-4 text-2xl font-bold text-white">{winner.label}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{winner.subtitle}</p>
            <span className={`badge mt-3 ${rarityClass(winner.rarity)}`}>
              {rarityLabel(winner.rarity)}
            </span>

            <div className="mt-5 flex flex-col gap-2">
              {reservarHref ? (
                <Link href={reservarHref} className="btn-primary py-2.5 text-sm">
                  Reservar sesión
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setWinner(null);
                  setPhase("idle");
                }}
                className="btn-secondary py-2.5 text-sm"
              >
                {freeSpins > 0 ? "Otra pasada" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PubgRouletteTeaser({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="tattoo-machine-teaser group relative block overflow-hidden rounded-2xl p-6"
    >
      <div className="pointer-events-none absolute -right-2 bottom-2 opacity-25">
        <div className="tattoo-coil tattoo-coil-lg scale-[0.65]">
          <div className="tattoo-coil-wrap" />
          <div className="tattoo-coil-core" />
        </div>
      </div>
      <div className="relative flex flex-col gap-4">
        <TattooRuletaHeading size="lg" className="w-full justify-center" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="carrizo-art-logo-glow-contrast text-2xl font-black sm:text-3xl">
              <span className="text-[#faf8f5]">Carrizo</span>
              <span className="text-[#fb7185]">Art</span>
            </p>
            <p className="mt-2 text-sm font-medium text-[#faf8f5]">
              ¿Te animás a probar suerte?
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
              Girá y ganá kits de cuidado, descuentos o un mini tatuaje flash.{" "}
              <span className="text-[#fb7185]">Primer giro gratis.</span>
            </p>
          </div>
          <span className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 self-start px-5 py-3 text-sm sm:self-center">
            <Zap size={16} />
            Jugar ahora
          </span>
        </div>
      </div>
    </Link>
  );
}
