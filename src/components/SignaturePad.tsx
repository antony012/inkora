"use client";

import { Eraser } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { isDrawnSignature } from "@/lib/signature";
import { cn } from "@/lib/utils";

type SignaturePadProps = {
  onChange: (dataUrl: string) => void;
  initialValue?: string;
  className?: string;
};

export function SignaturePad({
  onChange,
  initialValue = "",
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(!isDrawnSignature(initialValue));

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const paintStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = getContext();
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [getContext],
  );

  const restoreImage = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      hasStrokes.current = true;
      setEmpty(false);
    };
    img.src = dataUrl;
  }, [getContext]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const snapshot =
      hasStrokes.current && !empty ? canvas.toDataURL("image/png") : "";

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (snapshot) {
      restoreImage(snapshot);
      return;
    }
  }, [empty, restoreImage]);

  useEffect(() => {
    setupCanvas();
    if (initialValue && isDrawnSignature(initialValue)) {
      restoreImage(initialValue);
    }
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [initialValue, restoreImage, setupCanvas]);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const emitChange = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes.current) {
      onChange("");
      setEmpty(true);
      return;
    }
    onChange(canvas.toDataURL("image/png"));
    setEmpty(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    hasStrokes.current = true;
    setEmpty(false);
    lastPoint.current = getPoint(event);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPoint.current) return;
    event.preventDefault();

    const point = getPoint(event);
    paintStroke(lastPoint.current, point);
    lastPoint.current = point;
  };

  const endStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;

    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // El puntero ya fue liberado.
    }

    emitChange();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasStrokes.current = false;
    lastPoint.current = null;
    drawing.current = false;
    onChange("");
    setEmpty(true);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative overflow-hidden rounded-xl border border-dashed border-[var(--border-strong)] bg-white">
        <canvas
          ref={canvasRef}
          className="block h-44 w-full touch-none cursor-crosshair sm:h-52"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
        {empty ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-[#71717a]">
            Firmá aquí con el dedo o el stylus
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={clear}
        className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
      >
        <Eraser size={14} />
        Limpiar firma
      </button>
    </div>
  );
}

type ConsentSignaturePreviewProps = {
  signatureData: string;
  className?: string;
};

export function ConsentSignaturePreview({
  signatureData,
  className,
}: ConsentSignaturePreviewProps) {
  if (isDrawnSignature(signatureData)) {
    return (
      <div
        className={cn(
          "mx-auto max-w-md rounded-xl border border-[var(--border)] bg-white p-3",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureData}
          alt="Firma del cliente"
          className="mx-auto h-28 w-full object-contain"
        />
      </div>
    );
  }

  return (
    <p
      className={cn(
        "font-serif text-2xl italic text-black",
        className,
      )}
    >
      {signatureData}
    </p>
  );
}
