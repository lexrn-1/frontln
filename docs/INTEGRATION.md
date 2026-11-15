# Integración con la API pública

Base REST: `https://api.5-253-232-179.sslip.io/api/v1`. Readiness separado: `https://api.5-253-232-179.sslip.io/q/health/ready`. Origen realtime: `https://api.5-253-232-179.sslip.io`, path `/socket.io/`.

El build local preparado usa estos destinos con Firebase Auth real y `useMocks: false`. No se ha redeployado Vercel desde esta entrega; la publicación existente no se modifica al editar estos archivos.

## Contratos

| Método | Ruta relativa a API | Respuesta directa |
|---|---|---|
| GET | /session | uid, email, displayName, photoUrl, provider, status, profileComplete, nextAction |
| GET | /me | uid, email, firstName, lastName, username, avatar, status, createdAt, updatedAt |
| POST | /me/complete | Perfil completo; body firstName, lastName, username, avatar |
| POST | /session/logout | 204; el cliente ejecuta también Firebase signOut |
| GET | /demo | message; público, puede responder 404 si no hay documento |

La API no usa envoltura `{data}`. El adaptador transforma firstName/lastName a nombres/apellidos y viceversa. peach/mint/sky/rose/lavender se envían como avatar-1..avatar-5. Otras referencias de avatar se conservan al leerlas; el componente mantiene su fallback visual.

El cliente envía Bearer únicamente al origen y prefijo REST configurados, con límite de ruta `/api/v1/`. Readiness, demo, otros orígenes y prefijos parecidos no reciben el token. Un 401 se reintenta una vez tras renovar; un nuevo 401 limpia la sesión sin ejecutar logout remoto recursivo. Logout envía su token, pero no usa recuperación automática de autenticación.

PENDING o COMPLETE_PROFILE lleva a completar perfil; COMPLETE/ENTER permite recuperar /me y abrir la ruta solicitada. No se usa el antiguo 404 de /me para detectar perfil pendiente. Un fallo de red/503 retiene la identidad para reintentar y desbloquea los guards. Las solicitudes HTTP tienen un límite de 15 segundos para que un servidor sin respuesta no deje la inicialización pendiente indefinidamente.

Username: NFKC + trim, 3–20 caracteres ASCII alfanuméricos o guion bajo. No hay `/usernames/.../availability`; la transacción servidor determina unicidad al guardar. Nombres/apellidos hasta 80 caracteres. Correo institucional: sin lista no se restringe dominio; con lista, coincidencia exacta.

Errores uppercase se normalizan a kebab-case y `fields` se adapta a los nombres del formulario. USERNAME_TAKEN y PROFILE_ALREADY_COMPLETE son conflictos distintos. Una respuesta tardía de perfil después de logout no restaura una sesión cerrada.

## Gateway y publicación

En Dokploy retirar el destino duplicado Path `/` hacia realtime. Reglas esperadas: Host público + PathPrefix `/socket.io/` → realtime:9092, prioridad 200; Host público restante → API:8080, prioridad 100. Preservar prefijo y query string; no StripPrefix. El repositorio backend entrega el override opcional `compose.gateway.yaml` y su guía de aplicación.

El /q público corresponde a la API; realtime mantiene health HTTP interno. Socket.IO usa el protocolo Engine.IO/Socket.IO, no WebSocket nativo. Su enrutamiento público respondió 404 durante la revisión; este pendiente no impide consumir REST.

Después del redeploy en Vercel y de aplicar las rutas: revisar Network, login/correo, Google inicial/recurrente, perfil pendiente, conflicto/reintento, recarga, logout y retorno a ruta solicitada con una cuenta autorizada. Estos flujos reales no se probaron creando usuarios en producción.

## Verificación local

- `pnpm run build`: compila el bundle de producción.
- `pnpm test`: casos Angular con contratos HTTP controlados; no necesitan Firebase real.
- Comprobación de navegador: archivos compilados servidos localmente bajo el origen Vercel interceptado y peticiones HTTPS de solo lectura contra la API pública. No equivale a publicar en Vercel.

Los resultados se registran en `EVIDENCE-public-api.md`.

## Pantallas pendientes de backend

Dashboard, explorar salas, sala de estudio, perfil y configuración están construidos contra servicios
abstractos con mocks. El contrato que falta publicar para conectarlos está en [BACKEND-PENDING.md](BACKEND-PENDING.md).
