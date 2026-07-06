"use client";

import { CONSENT_CLOSING, CONSENT_SECTIONS } from "@/lib/consent-terms";

type ConsentTermsBodyProps = {
  aftercareText: string;
};

export function ConsentTermsBody({ aftercareText }: ConsentTermsBodyProps) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
      {CONSENT_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="font-medium text-[var(--text)]">{section.title}</p>
          <p className="mt-1">{section.body}</p>
        </div>
      ))}

      <div>
        <p className="font-medium text-[var(--text)]">9. Cuidados posteriores</p>
        <p className="mt-1">{aftercareText}</p>
      </div>

      <p className="border-t border-[var(--border)] pt-3 text-[var(--text)]">
        {CONSENT_CLOSING}
      </p>
    </div>
  );
}
