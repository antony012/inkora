"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import {
  Suspense,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DoubleSide, type Group } from "three";
import { BRAND } from "@/lib/brand";

export type CoinControl = {
  hover: boolean;
  x: number;
  y: number;
};

export function DoubleSidedLogoCoin({
  control,
  size = 1,
}: {
  control: MutableRefObject<CoinControl>;
  size?: number;
}) {
  const coin = useRef<Group>(null);
  const front = useTexture(BRAND.logo);
  const back = useTexture(BRAND.logoLight);
  const rotation = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!coin.current) return;

    if (control.current.hover) {
      const targetY = control.current.x * Math.PI;
      const targetX = control.current.y * 0.5;
      rotation.current.y += (targetY - rotation.current.y) * 0.14;
      rotation.current.x += (targetX - rotation.current.x) * 0.14;
    }

    coin.current.rotation.y = rotation.current.y;
    coin.current.rotation.x = rotation.current.x;
  });

  return (
    <group ref={coin} scale={size}>
      <mesh position={[0, 0, 0.021]}>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial
          map={front}
          roughness={0.45}
          metalness={0.06}
          transparent
        />
      </mesh>

      <mesh position={[0, 0, -0.021]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial
          map={back}
          roughness={0.45}
          metalness={0.06}
          transparent
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.042, 64, 1, true]} />
        <meshStandardMaterial
          color="#111116"
          metalness={0.5}
          roughness={0.4}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

type Logo3DSceneProps = {
  large?: boolean;
  className?: string;
  label?: string;
  sublabel?: string;
  showFooter?: boolean;
};

export default function Logo3DScene({
  large = false,
  className = "",
  label = "Enderxon Carrizo",
  sublabel = "Tatuajes artísticos · Santiago, Chile",
  showFooter = true,
}: Logo3DSceneProps) {
  const control = useRef<CoinControl>({ hover: false, x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    control.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    control.current.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[#070708] shadow-[0_24px_80px_#00000088] ${hovering ? "cursor-grab" : "cursor-default"} ${large ? "min-h-[280px]" : "min-h-[340px] h-full"} ${className}`}
      onPointerEnter={() => {
        control.current.hover = true;
        setHovering(true);
      }}
      onPointerLeave={() => {
        control.current.hover = false;
        setHovering(false);
      }}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        camera={{ position: [0, 0, large ? 4.1 : 4.8], fov: large ? 40 : 42 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#070708"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 3, 5]} intensity={1.5} color="#eceef2" />
        <pointLight position={[-2, 0, 3]} intensity={1.6} color="#fca78a" />
        <pointLight position={[2, -1, 2]} intensity={0.8} color="#ffffff" />
        <Suspense fallback={null}>
          <DoubleSidedLogoCoin
            control={control}
            size={large ? 1.12 : 0.95}
          />
        </Suspense>
        <Sparkles
          count={large ? 14 : 10}
          scale={large ? [3.1, 2.5, 1.3] : [2.8, 2.2, 1.2]}
          size={0.8}
          speed={0.1}
          opacity={0.25}
          color="#a1a1aa"
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,#070708cc_88%)]" />
      {showFooter ? (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4">
          <div className="glass-panel rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-white/55">{sublabel}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
