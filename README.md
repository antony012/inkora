# Inkora

Software all-in-one para estudios de tatuaje. Diseñado para superar a Porter, TATTOOX y SesionInk en el flujo real del artista latinoamericano.

## Qué incluye

- Landing del producto
- Página pública del estudio + portafolio
- Solicitud de turno con **cotización inteligente** (estilo, zona, tamaño)
- Panel del estudio:
  - Resumen y pipeline
  - Solicitudes (cotizar → seña → confirmar)
  - Agenda multi-artista
  - CRM de clientes
  - Caja y comisiones
  - Consentimientos digitales
  - Portafolio
  - Reportes
  - Configuración

Los datos viven en `localStorage` (demo persistente). Podés resetear desde el panel.

## Arrancar

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Flujo demo recomendado

1. `/` — propuesta de producto
2. `/estudio/nueva-temporada` — página pública
3. `/estudio/nueva-temporada/reservar` — crear solicitud
4. `/dashboard/solicitudes` — aprobar cotización y registrar seña
5. `/dashboard/consentimientos` — firmar consentimiento
6. `/dashboard/agenda` — completar sesión y cobrar saldo
7. `/dashboard/caja` y `/dashboard/reportes` — ver impacto

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Zustand (estado + persistencia)
- date-fns

## Próximos pasos de producto

- Auth real (artistas / dueños / clientes)
- Pagos Mercado Pago / Stripe
- SMS / WhatsApp reminders
- Subida de referencias e ID
- Multi-estudio y roles
- API + webhooks
