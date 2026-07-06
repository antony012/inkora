"use client";

import dynamic from "next/dynamic";
import { SceneFallback } from "./SceneFallback";

export const DynamicHeroScene = dynamic(() => import("./CarrizoHeroScene"), {
  ssr: false,
  loading: () => <SceneFallback label="Cargando experiencia 3D" />,
});

export const DynamicStudioScene = dynamic(() => import("./InteractiveStudioScene"), {
  ssr: false,
  loading: () => <SceneFallback label="Estudio 3D" compact />,
});

export const DynamicLogoScene = dynamic(() => import("./Logo3DScene"), {
  ssr: false,
  loading: () => <SceneFallback label="Logo 3D Enderson" compact />,
});