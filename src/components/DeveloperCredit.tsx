import { cn } from "@/lib/utils";

export function DeveloperCredit({
  className,
  inline = false,
}: {
  className?: string;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <p className={cn("text-[var(--text-dim)]", className)}>
        Desarrollado por{" "}
        <span className="font-medium text-[var(--text-muted)]">
          Antony Solorzano
        </span>
      </p>
    );
  }

  return (
    <footer
      className={cn(
        "mt-auto border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-dim)]",
        className,
      )}
    >
      Desarrollado por{" "}
      <span className="font-medium text-[var(--text-muted)]">
        Antony Solorzano
      </span>
    </footer>
  );
}
