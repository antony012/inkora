export const CONSENT_SECTIONS = [
  {
    title: "1. Voluntariedad y mayoría de edad",
    body: "Declaro que solicito el procedimiento de forma libre y voluntaria, sin coacción alguna, y que soy mayor de 18 años o cuento con autorización legal vigente si corresponde.",
  },
  {
    title: "2. Información recibida",
    body: "Fui informado/a por el artista o el estudio sobre la naturaleza del tatuaje, su proceso, duración estimada, cuidados posteriores y resultados esperables. Tuve la oportunidad de realizar preguntas y estas fueron respondidas de manera satisfactoria.",
  },
  {
    title: "3. Riesgos y complicaciones",
    body: "Comprendo que todo procedimiento de tatuaje implica riesgos, entre ellos: dolor, inflamación, sangrado, infección, reacción alérgica a pigmentos o productos, formación de queloides o cicatrices anormales, decoloración, migración del pigmento y, en casos excepcionales, transmisión de enfermedades si no se siguen los protocolos de higiene y cuidado.",
  },
  {
    title: "4. Declaración de salud",
    body: "La información de salud, alergias, medicamentos, embarazo, enfermedades de la piel o condiciones médicas que entrego es verídica y completa. Asumo plena responsabilidad por cualquier omisión o dato falso que pueda afectar el resultado o mi seguridad durante la intervención.",
  },
  {
    title: "5. Responsabilidad del cliente",
    body: "Me hago responsable del cuidado de la zona tatuada después del procedimiento, siguiendo estrictamente las indicaciones del estudio. Reconozco que el incumplimiento de los cuidados posteriores, la exposición solar prematura, el rascado, el consumo de alcohol o sustancias, o la falta de higiene pueden causar infecciones y dañar el resultado.",
  },
  {
    title: "6. Exención de responsabilidad",
    body: "Eximo al estudio, su personal y el artista de responsabilidad por complicaciones derivadas de información médica omitida o inexacta, incumplimiento de cuidados posteriores, reacciones imprevisibles propias de mi organismo o modificaciones del diseño solicitadas por mí durante la sesión.",
  },
  {
    title: "7. Autorización del procedimiento",
    body: "Autorizo expresamente la realización del tatuaje acordado y consiento que se utilicen instrumentos, pigmentos y materiales descartables o esterilizados conforme a las prácticas del estudio.",
  },
  {
    title: "8. Política de seña y asistencia",
    body: "Acepto que la seña abonada para reservar la sesión no es reembolsable ante inasistencias sin aviso con al menos 48 horas de anticipación, reprogramaciones reiteradas o cancelación injustificada.",
  },
] as const;

export const CONSENT_CLOSING =
  "Al firmar este documento, confirmo que leí, comprendí y acepto íntegramente los términos anteriores, asumiendo la responsabilidad personal sobre mi decisión de someterme al procedimiento.";

export function consentTermsPlainText() {
  return CONSENT_SECTIONS.map((s) => `${s.title}. ${s.body}`).join("\n\n");
}
