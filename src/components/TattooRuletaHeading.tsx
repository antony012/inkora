import { Pirata_One } from "next/font/google";
import { cn } from "@/lib/utils";

const pirata = Pirata_One({
  weight: "400",
  subsets: ["latin"],
});

type TattooRuletaHeadingProps = {
  className?: string;
  size?: "md" | "lg";
};

export function TattooRuletaHeading({
  className,
  size = "lg",
}: TattooRuletaHeadingProps) {
  return (
    <div
      className={cn(
        "tattoo-ruleta-heading",
        size === "lg" ? "tattoo-ruleta-heading--lg" : "tattoo-ruleta-heading--md",
        className,
      )}
      aria-label="Ruleta"
    >
      <span className="tattoo-ruleta-heading-flourish" aria-hidden>
        ✦
      </span>
      <span className="tattoo-ruleta-heading-line tattoo-ruleta-heading-line--left" />
      <h2 className={cn(pirata.className, "tattoo-ruleta-heading-text")}>
        Ruleta
      </h2>
      <span className="tattoo-ruleta-heading-line tattoo-ruleta-heading-line--right" />
      <span className="tattoo-ruleta-heading-flourish" aria-hidden>
        ✦
      </span>
    </div>
  );
}
