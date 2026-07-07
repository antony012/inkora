# Evolution API en Railway (sin Docker en tu PC)

Guía para tener QR de WhatsApp en Carrizo usando Evolution en la nube.

## Requisitos

- Cuenta en [railway.app](https://railway.app) (plan gratuito con créditos)
- Cuenta en [ngrok](https://ngrok.com) o similar (para que Evolution llame a tu Carrizo local)
- Carrizo corriendo: `npm run dev`

---

## Paso 1 — Proyecto en Railway

1. Entra a Railway → **New Project**
2. **Deploy from Docker Image**
3. Imagen: `evoapicloud/evolution-api:latest`
4. Nombre del servicio: `evolution-api`

---

## Paso 2 — PostgreSQL y Redis

En el mismo proyecto:

1. **+ New** → **Database** → **PostgreSQL**
2. **+ New** → **Database** → **Redis**

---

## Paso 3 — Variables de entorno (servicio evolution-api)

En **evolution-api** → **Variables**, agrega:

```env
PORT=8080

SERVER_URL=evolution-api-production-cb90a.up.railway.app
AUTHENTICATION_API_KEY=carrizo-evolution-dev
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=${{Postgres.DATABASE_URL}}

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=${{Redis.REDIS_URL}}

DEL_INSTANCE=false
```

> **Importante:** `DATABASE_PROVIDER` debe ser exactamente `postgresql` (minúsculas, sin comillas ni espacios).  
> En Railway usa el selector **Add reference** para `DATABASE_CONNECTION_URI` y `CACHE_REDIS_URI` (no pegues la URL a mano si el nombre del servicio no es `Postgres` / `Redis`).  
> Después de cambiar variables, pulsa **Desplegar** — si ves “X cambios” pendientes, el servicio sigue con la config vieja.

> Reemplaza `SERVER_URL` después de generar el dominio (paso 4).  
> `AUTHENTICATION_API_KEY` debe coincidir con `EVOLUTION_API_KEY` en tu `.env.local`.

---

## Paso 4 — Dominio público

1. Servicio **evolution-api** → **Settings** → **Networking**
2. **Generate Domain** → copia la URL, ej. `https://evolution-api-production-xxxx.up.railway.app`
3. Actualiza `SERVER_URL` con esa URL exacta (con `https://`)
4. **Redeploy** el servicio

Prueba en el navegador: `https://TU-DOMINIO.up.railway.app` (debe responder algo de Evolution, no error 502).

---

## Paso 5 — ngrok para Carrizo (tu PC)

Evolution en Railway debe llamar al webhook de Carrizo en tu máquina:

```bash
ngrok http 3000
```

Copia la URL HTTPS, ej. `https://abc123.ngrok-free.app`

---

## Paso 6 — `.env.local` en Carrizo

```env
WHATSAPP_PROVIDER=evolution

EVOLUTION_API_URL=https://TU-DOMINIO.up.railway.app
EVOLUTION_API_KEY=carrizo-evolution-dev
EVOLUTION_INSTANCE=enderxon

NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app

GEMINI_API_KEY=tu_key_gemini
GEMINI_MODEL=gemini-2.5-flash
```

Reinicia: `Ctrl+C` → `npm run dev`

---

## Paso 7 — Vincular WhatsApp en el CRM

1. Abre `http://localhost:3000/dashboard/crm`
2. Pulsa **Vincular con QR**
3. Escanea con WhatsApp → Dispositivos vinculados
4. Estado debe pasar a **open**
5. Escribe desde otro celular a tu número

---

## Checklist

- [ ] Evolution responde en Railway (sin 502)
- [ ] `EVOLUTION_API_URL` apunta a Railway
- [ ] `EVOLUTION_API_KEY` igual en Railway y `.env.local`
- [ ] ngrok activo y `NEXT_PUBLIC_APP_URL` actualizado
- [ ] `npm run dev` reiniciado
- [ ] QR visible en CRM
- [ ] Mensaje de prueba → chat **WA** en CRM

---

## Problemas frecuentes

| Error | Solución |
|-------|----------|
| `Proveedor de base de datos no válido` | Falta `DATABASE_PROVIDER=postgresql` o no desplegaste los cambios. Añade también `DATABASE_ENABLED=true` y `DATABASE_CONNECTION_URI=${{Postgres.DATABASE_URL}}` → **Desplegar** |
| QR no aparece | Revisa logs en Railway; Postgres y Redis deben estar vinculados |
| 401 al vincular | `EVOLUTION_API_KEY` distinto entre Railway y `.env.local` |
| Mensajes no llegan al CRM | ngrok caído o `NEXT_PUBLIC_APP_URL` incorrecta |
| 502 en Railway | Falta `DATABASE_CONNECTION_URI` o Redis; revisa `PORT=8080` y dominio en puerto 8080 |

---

## Costos

Railway da créditos mensuales gratis. Evolution + Postgres + Redis pueden consumirlos; vigila el uso en el dashboard.
