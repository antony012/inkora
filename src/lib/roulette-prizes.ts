export type RouletteRarity = "comun" | "raro" | "epico" | "legendario";

export interface RoulettePrize {
  id: string;
  label: string;
  subtitle: string;
  rarity: RouletteRarity;
  color: string;
  colorDark: string;
  weight: number;
  emoji: string;
}

export const ROULETTE_PRIZES: RoulettePrize[] = [
  {
    id: "kit-basico",
    label: "Kit básico",
    subtitle: "Jabón + crema hidratante",
    rarity: "comun",
    color: "#16a34a",
    colorDark: "#14532d",
    weight: 22,
    emoji: "🧴",
  },
  {
    id: "kit-premium",
    label: "Kit premium",
    subtitle: "Cuidado completo 7 días",
    rarity: "epico",
    color: "#7c3aed",
    colorDark: "#4c1d95",
    weight: 8,
    emoji: "✨",
  },
  {
    id: "balm",
    label: "Bálsamo",
    subtitle: "Reparador post-tatuaje",
    rarity: "comun",
    color: "#0891b2",
    colorDark: "#164e63",
    weight: 18,
    emoji: "💧",
  },
  {
    id: "descuento-10",
    label: "10% OFF",
    subtitle: "Próxima sesión",
    rarity: "raro",
    color: "#c9a227",
    colorDark: "#78350f",
    weight: 12,
    emoji: "🏷️",
  },
  {
    id: "mini-flash",
    label: "Mini flash",
    subtitle: "Tatuaje pequeño gratis",
    rarity: "legendario",
    color: "#dc2626",
    colorDark: "#7f1d1d",
    weight: 3,
    emoji: "⚡",
  },
  {
    id: "spf-film",
    label: "SPF + film",
    subtitle: "Protección solar tatuaje",
    rarity: "comun",
    color: "#ea580c",
    colorDark: "#7c2d12",
    weight: 16,
    emoji: "☀️",
  },
  {
    id: "merch",
    label: "Merch Carrizo",
    subtitle: "Gorra o sticker pack",
    rarity: "raro",
    color: "#4f46e5",
    colorDark: "#312e81",
    weight: 10,
    emoji: "🧢",
  },
  {
    id: "giro-extra",
    label: "Giro extra",
    subtitle: "¡Vuelve a girar!",
    rarity: "comun",
    color: "#db2777",
    colorDark: "#831843",
    weight: 11,
    emoji: "🔄",
  },
];

export function pickRoulettePrize(): RoulettePrize {
  const total = ROULETTE_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = Math.random() * total;
  for (const prize of ROULETTE_PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return ROULETTE_PRIZES[0];
}

export function rarityLabel(rarity: RouletteRarity): string {
  const map: Record<RouletteRarity, string> = {
    comun: "Común",
    raro: "Raro",
    epico: "Épico",
    legendario: "Legendario",
  };
  return map[rarity];
}

export function rarityClass(rarity: RouletteRarity): string {
  const map: Record<RouletteRarity, string> = {
    comun: "badge-green",
    raro: "badge-blue",
    epico: "badge-rose",
    legendario: "badge-gold",
  };
  return map[rarity];
}
