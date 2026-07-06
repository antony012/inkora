import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { BRAND } from "@/lib/brand";
import { isDrawnSignature } from "@/lib/signature";
import { consentSessionLabel } from "@/lib/consent-display";
import type { Appointment, ConsentForm, Studio } from "@/lib/types";

import {
  CONSENT_CLOSING,
  CONSENT_SECTIONS,
} from "@/lib/consent-terms";

export type ConsentPdfInput = {
  studio: Studio;
  consent: ConsentForm;
  appointment?: Appointment | null;
};

async function prepareSignatureForPdf(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (alpha > 20 && brightness < 245) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function loadLogoDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("No se pudo leer el logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fileSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildConsentPdfFileName(consent: ConsentForm) {
  const datePart = consent.signedAt
    ? format(parseISO(consent.signedAt), "yyyy-MM-dd")
    : "pendiente";
  return `consentimiento-${fileSlug(consent.clientName)}-${datePart}.pdf`;
}

export async function downloadConsentPdf({
  studio,
  consent,
  appointment,
}: ConsentPdfInput) {
  if (!consent.signedAt || !consent.signatureData) {
    throw new Error("El consentimiento debe estar firmado para generar el PDF.");
  }

  const logoDataUrl = await loadLogoDataUrl(BRAND.logo);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addLines = (
    text: string,
    fontSize = 10,
    style: "normal" | "bold" = "normal",
    gap = 5,
    x = margin,
    maxWidth = contentWidth,
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const blockHeight = lines.length * (fontSize * 0.42) + gap;
    ensureSpace(blockHeight);
    doc.text(lines, x, y);
    y += blockHeight;
  };

  const logoSize = 22;
  if (logoDataUrl) {
    ensureSpace(logoSize + 6);
    const format = logoDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(logoDataUrl, format, margin, y, logoSize, logoSize);
  }

  const textX = logoDataUrl ? margin + logoSize + 6 : margin;
  const headerStartY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(230, 93, 4);
  doc.text("Carrizo", textX, headerStartY + 8);
  const carrizoWidth = doc.getTextWidth("Carrizo");
  doc.setTextColor(249, 115, 22);
  doc.text("Art", textX + carrizoWidth, headerStartY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(studio.name, textX, headerStartY + 14);

  doc.setTextColor(0, 0, 0);
  y = headerStartY + logoSize + 8;

  addLines("Consentimiento informado", 14, "bold", 6);
  addLines(`Cliente: ${consent.clientName}`, 11, "bold", 4);

  if (appointment) {
    addLines(
      `Sesión: ${consentSessionLabel(consent, appointment) ?? appointment.title}`,
      10,
    );
  } else if (consent.sessionTitle) {
    addLines(
      `Sesión: ${consentSessionLabel(consent) ?? consent.sessionTitle}`,
      10,
    );
  }

  if (consent.signedAt) {
    addLines(
      `Firmado el ${format(parseISO(consent.signedAt), "d MMMM yyyy 'a las' HH:mm", { locale: es })}`,
      10,
    );
  }

  addLines(`Estudio: ${studio.name} · ${studio.city}`, 10);
  addLines(`Teléfono: ${studio.phone}`, 10, "normal", 8);

  addLines("Términos del consentimiento", 11, "bold", 4);

  for (const section of CONSENT_SECTIONS) {
    addLines(section.title, 10, "bold", 3);
    addLines(section.body, 9, "normal", 5);
  }

  addLines("9. Cuidados posteriores", 10, "bold", 3);
  addLines(studio.aftercareText, 9, "normal", 5);
  addLines(CONSENT_CLOSING, 9, "normal", 8);

  addLines("Declaración de salud / alergias", 11, "bold", 4);
  addLines(
    consent.healthDeclaration?.trim() || "Sin condiciones relevantes",
    10,
    "normal",
    8,
  );

  addLines("Firma del cliente", 11, "bold", 4);

  if (isDrawnSignature(consent.signatureData)) {
    const signatureForPdf = await prepareSignatureForPdf(consent.signatureData);
    ensureSpace(40);
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, 90, 34, 2, 2, "FD");
    doc.addImage(signatureForPdf, "PNG", margin + 2, y + 2, 86, 30);
    y += 40;
  } else {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "italic");
    addLines(consent.signatureData, 14, "normal", 8);
  }

  addLines(
    "Documento generado por Carrizo. La firma digital fue registrada con fecha y hora indicadas arriba.",
    8,
    "normal",
    0,
  );

  doc.save(buildConsentPdfFileName(consent));
}
