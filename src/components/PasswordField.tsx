"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { passwordStrengthHints } from "@/lib/password";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  showHints?: boolean;
};

export function PasswordField({
  label,
  value,
  onChange,
  required = true,
  autoComplete,
  showHints = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hints = showHints && value ? passwordStrengthHints(value) : [];

  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          className="input pr-11"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete={autoComplete}
          minLength={8}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] transition hover:text-[var(--text-muted)]"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showHints && value ? (
        <p className="mt-1.5 text-xs text-[var(--text-dim)]">
          {hints.length === 0
            ? "Contraseña segura."
            : `Falta: ${hints.join(", ")}.`}
        </p>
      ) : null}
    </div>
  );
}
